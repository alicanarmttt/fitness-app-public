console.log("Booting server...");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// YALNIZCA 'production' (canlı) ortamında DEĞİLSE dotenv'i yükle
// Azure'da NODE_ENV genellikle 'production' olarak ayarlanır.
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("KRİTİK HATA: JWT_SECRET ortam değişkeni bulunamıyor.");
  process.exit(1); // Uygulamayı hemen durdur
}
require("./config/passport")(JWT_SECRET);

const app = express();
const PORT = process.env.PORT || 5000;

const { sql, config, poolPromise } = require("./db");
const { getAnalysis } = require("./queries/analysis");
const { findUserByEmail, createUser } = require("./queries/user");

const {
  toggleWorkoutLogExerciseCompleted,
  generateWorkoutLogs,
  listWorkoutLogs,
  listWorkoutLogExercises,
  deleteWorkoutLogsByProgram,
} = require("./queries/workoutlog");

const {
  listPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
} = require("./queries/program");

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// --- DEV TEST: GET ile generate (sadece geliştirme/test için)

const globalPoolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((p) => {
    console.log("✅ SQL pool connected");
    return p;
  })
  .catch((err) => {
    console.error("❌ SQL pool connect error:", err);
    throw err;
  });

// JSON İLE ÇALIŞMAK İÇİN ORTAK AYAR
app.use(express.json());

//Passport.js'i başlatıyoruz
app.use(passport.initialize());

//Ana Endpoint - Trigger deploy azure
app.get("/", (req, res) => {
  res.send("Fitness API çalışıyor!");
});

//----------------------------------------------------
//KİMLİK DOĞRULAMA (AUTHENTICATION) ENDPOINT'LERİ

// 1. Kullanıcı Kayıt (Register) Endpoint'i
app.post("/auth/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "Email is already in use." });
    }
    const newUser = await createUser(email, password);
    res.status(201).json({
      message: "User created succesfully!",
      user: { id: newUser.id, email: newUser.email },
    });
  } catch (error) {
    console.log("REGISTER ERROR:", error);
    res.status(500).json({ error: "Server error during registration." });
  }
});

// 2. Kullanıcı Giriş (Login) Endpoint'i
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  // Passport.js'in 'local' stratejisini burada kullanmıyoruz, manuel kontrol yapıyoruz.
  const bcrypt = require("bcryptjs");
  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }
    // Şifre doğruysa, kullanıcıya bir JWT (giriş kartı) oluşturup veriyoruz.
    const payload = {
      sub: user.id, // 'subject' yani token'ın sahibi
      email: user.email,
      iat: Math.floor(Date.now() / 1000), // 'issued at' yani oluşturulma zamanı
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d",
    }); // Token 1 gün geçerli

    res.json({
      message: "Logged in succesfully!",
      token: token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ error: "Server error during login." });
  }
});

//----------------------------------------------------
// Sunucuyu başlatmadan önce veritabanı havuzunun hazır olmasını bekle
poolPromise
  .then((pool) => {
    if (pool.connected) {
      console.log("✅ Database connection successful. Starting server...");
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server is running on port ${PORT}`);
      });
    } else {
      console.error("❌ Database pool connected, but connection is not valid.");
    }
  })
  .catch((err) => {
    // Bu hata, veritabanına ilk bağlantı sırasında bir sorun olursa tetiklenir.
    console.error(
      "❌ Failed to connect to the database. Server will not start.",
      err
    );
    process.exit(1); // Hata durumunda uygulamayı sonlandır
  });

//PROGRAMLARI SQLDEN ÇEKİP LİSTELEME

app.get(
  "/programs",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const data = await listPrograms(userId);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

//PROGRAM EKLE

app.post(
  "/programs",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { day, isLocked, exercises } = req.body;

      // (opsiyonel) minik doğrulama: eksik alan varsa 400
      if (typeof day !== "string") {
        return res
          .status(400)
          .json({ error: "Field 'day' is required (string)." });
      }
      const userId = req.user.id;
      const created = await createProgram({ day, isLocked, exercises }, userId);
      res.status(201).json(created);
    } catch (error) {
      console.error("POST /programs ERROR:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

//PROGRAMI GÜNCELLEME

app.put(
  "/programs/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const id = parseInt(req.params.id);
    const { day, isLocked, exercises } = req.body;
    try {
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Param `id` must be integer." });
      }
      if (typeof day !== "string") {
        return res
          .status(400)
          .json({ error: "Field 'day' is required (string)." });
      }
      const userId = req.user.id;
      const updated = await updateProgram(
        { id, day, isLocked, exercises },
        userId
      );
      res.json(updated);
    } catch (error) {
      console.error("PUT /programs/:id ERROR:", error); // <-- hata buraya basılır!
      res.status(500).json({ error: error.message });
    }
  }
);

//PROGRAMI SİLME
app.delete(
  "/programs/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Param 'id' must be integer." });
      }
      const userId = req.user.id;
      const out = await deleteProgram(id, userId);
      res.json(out);
    } catch (error) {
      console.log("DELETE /programs/:id HATASI", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// EGZERSİZ TAMAMLANDI (WorkoutLogExercise üzerinde!)
app.patch(
  "/workoutlog-exercise/:id/completed",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const exerciseLogId = parseInt(req.params.id);
      if (!Number.isInteger(exerciseLogId)) {
        return res.status(400).json({ error: "Param 'id' must be integer." });
      }
      const userId = req.user.id;
      const out = await toggleWorkoutLogExerciseCompleted(
        exerciseLogId,
        userId
      );
      res.json(out); // { id, isCompleted: true/false }
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ error: err.message });
    }
  }
);

//WORKOUT LOG 30 GUNLUK OLUSTURMA
app.post(
  "/workoutlog/generate",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { program_id, start_date, days } = req.body;

      // basit doğrulama
      if (!Number.isInteger(program_id)) {
        return res
          .status(400)
          .json({ error: "Field 'program_id' must be integer." });
      }
      if (!start_date || typeof start_date !== "string") {
        return res
          .status(400)
          .json({ error: "Field 'start_date' (YYYY-MM-DD) is required." });
      }
      if (!Number.isInteger(days) || days <= 0) {
        return res
          .status(400)
          .json({ error: "Field 'days' must be positive integer." });
      }
      const userId = req.user.id;
      const out = await generateWorkoutLogs(
        { program_id, start_date, days },
        userId
      );
      res.json(out);
    } catch (err) {
      const status = err.status || 500;
      console.error("POST /workoutlog/generate ERROR:", err);
      res.status(status).json({ error: err.message });
    }
  }
);

//tüm loglar
app.get(
  "/workoutlog",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const rows = await listWorkoutLogs(userId);
      res.json(rows);
    } catch (err) {
      console.error("GET /workoutlog ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

//bir günün egzersiz logları

app.get(
  "/workoutlog/:logId/exercises",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const logId = parseInt(req.params.logId);
      if (!Number.isInteger(logId)) {
        return res
          .status(400)
          .json({ error: "Param 'logId' must be integer." });
      }
      const userId = req.user.id;
      const rows = await listWorkoutLogExercises(logId, userId);
      res.json(rows);
    } catch (err) {
      console.error("GET /workoutlog/:logId/exercises ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

//Programdaki değişiklikte logları sil
app.delete(
  "/workoutlog/by-program/:programId",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const programId = parseInt(req.params.programId);
      if (!Number.isInteger(programId)) {
        return res
          .status(400)
          .json({ error: "Param 'programId' must be integer." });
      }
      const userId = req.user.id;

      const out = await deleteWorkoutLogsByProgram(programId, userId);
      res.json(out);
    } catch (err) {
      console.error("DELETE /workoutlog/by-program/:programId ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

//----------------------------ANALYSIS PART---------------------------------------------

const LEVEL_RANGES = {
  beginner: {
    chest: [10, 12],
    back: [10, 12],
    quads: [12, 14],
    hamstring: [10, 12],
    shoulder: [8, 10],
    biceps: [8, 10],
    triceps: [8, 10],
  },
  intermediate: {
    chest: [12, 16],
    back: [12, 16],
    quads: [14, 18],
    hamstring: [12, 16],
    shoulder: [10, 12],
    biceps: [10, 12],
    triceps: [10, 12],
  },
  advanced: {
    chest: [16, 20],
    back: [16, 20],
    quads: [16, 20],
    hamstring: [14, 18],
    shoulder: [12, 14],
    biceps: [12, 15],
    triceps: [12, 14],
  },
};

const MUSCLES = [
  "chest",
  "back",
  "quads",
  "hamstring",
  "shoulder",
  "biceps",
  "triceps",
];

// ---- helpers ----
function toLocalISO(dateLike) {
  const d = new Date(dateLike);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function todayLocalISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
function addDaysLocal(baseISO, diff) {
  const [y, m, d] = baseISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + diff);
  return toLocalISO(dt);
}

app.get(
  "/analysis",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const level = (req.query.level || "intermediate").toLowerCase();
      const debug = req.query.debug === "trend";
      const userId = req.user.id;

      const out = await getAnalysis({ level, debug, userId });
      res.json(out);
    } catch (err) {
      console.error("GET /analysis ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ ok: false, message: "Server error" });
});
