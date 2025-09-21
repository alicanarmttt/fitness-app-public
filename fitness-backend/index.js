const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

const { sql, config, poolPromise } = require("./db");

const {
  toggleWorkoutLogExerciseCompleted,
  generateWorkoutLogs,
  listWorkoutLogs,
  listWorkoutLogExercises,
  deleteWorkoutLogsByProgram,
} = require("./queries/workoutlog");
//
const {
  listPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
} = require("./queries/program");

const { getAnalysis } = require("./queries/analysis");
app.set("trust proxy", 1);
app.use(helmet());
const allowed = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, cb) {
      // localhost gibi origin'siz istekleri dev'de kabul edebilirsin:
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error("Cors Blocked"), false);
    },
    credentials: false,
  })
);
app.get("/healthz", (req, res) => res.status(200).send("ok"));

// JSON İLE ÇALIŞMAK İÇİN ORTAK AYAR
app.use(express.json());
//trigger deploy azure
app.get("/", (req, res) => {
  res.send("Fitness API çalışıyor!");
});

//PROGRAMLARI SQLDEN ÇEKİP LİSTELEME

app.get("/programs", async (req, res) => {
  try {
    const data = await listPrograms();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//PROGRAM EKLE

app.post("/programs", async (req, res) => {
  try {
    const { day, isLocked, exercises } = req.body;

    // (opsiyonel) minik doğrulama: eksik alan varsa 400
    if (typeof day !== "string") {
      return res
        .status(400)
        .json({ error: "Field 'day' is required (string)." });
    }

    const created = await createProgram({ day, isLocked, exercises });
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /programs ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

//PROGRAMI GÜNCELLEME

app.put("/programs/:id", async (req, res) => {
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
    const updated = await updateProgram({ id, day, isLocked, exercises });
    res.json(updated);
  } catch (error) {
    console.error("PUT /programs/:id ERROR:", error); // <-- hata buraya basılır!
    res.status(500).json({ error: error.message });
  }
});

//PROGRAMI SİLME
app.delete("/programs/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Param 'id' must be integer." });
    }
    const out = await deleteProgram(id);
    res.json(out);
  } catch (error) {
    console.log("DELETE /programs/:id HATASI", error);
    res.status(500).json({ error: error.message });
  }
});

// EGZERSİZ TAMAMLANDI (WorkoutLogExercise üzerinde!)
app.patch("/workoutlog-exercise/:id/completed", async (req, res) => {
  try {
    const exerciseLogId = parseInt(req.params.id);
    if (!Number.isInteger(exerciseLogId)) {
      return res.status(400).json({ error: "Param 'id' must be integer." });
    }

    const out = await toggleWorkoutLogExerciseCompleted(exerciseLogId);
    res.json(out); // { id, isCompleted: true/false }
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

//WORKOUT LOG 30 GUNLUK OLUSTURMA
app.post("/workoutlog/generate", async (req, res) => {
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

    const out = await generateWorkoutLogs({ program_id, start_date, days });
    res.json(out);
  } catch (err) {
    const status = err.status || 500;
    console.error("POST /workoutlog/generate ERROR:", err);
    res.status(status).json({ error: err.message });
  }
});

//tüm loglar
app.get("/workoutlog", async (req, res) => {
  try {
    const rows = await listWorkoutLogs();
    res.json(rows);
  } catch (err) {
    console.error("GET /workoutlog ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

//bir günün egzersiz logları

app.get("/workoutlog/:logId/exercises", async (req, res) => {
  try {
    const logId = parseInt(req.params.logId);
    if (!Number.isInteger(logId)) {
      return res.status(400).json({ error: "Param 'logId' must be integer." });
    }
    const rows = await listWorkoutLogExercises(logId);
    res.json(rows);
  } catch (err) {
    console.error("GET /workoutlog/:logId/exercises ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

//Programdaki değişiklikte logları sil
app.delete("/workoutlog/by-program/:programId", async (req, res) => {
  const programId = parseInt(req.params.programId);
  try {
    const programId = parseInt(req.params.programId);
    if (!Number.isInteger(programId)) {
      return res
        .status(400)
        .json({ error: "Param 'programId' must be integer." });
    }

    const out = await deleteWorkoutLogsByProgram(programId);
    res.json(out);
  } catch (err) {
    console.error("DELETE /workoutlog/by-program/:programId ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
app.listen(process.env.PORT || 8080);
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

app.get("/analysis", async (req, res) => {
  try {
    const level = (req.query.level || "intermediate").toLowerCase();
    const debug = req.query.debug === "trend";
    const out = await getAnalysis({ level, debug });
    res.json(out);
  } catch (err) {
    console.error("GET /analysis ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ ok: false, message: "Server error" });
});
