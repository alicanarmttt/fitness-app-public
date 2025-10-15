console.log("Booting server...");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const passport = require("passport");

// --- Ortam Değişkenleri ve Güvenlik ---

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

// --- Express Uygulamasını Oluşturma ---

const app = express();
const PORT = process.env.PORT || 5000;
const { poolPromise } = require("./db");

// --- Rota Dosyalarını İçeri Aktarma ---

const authRoutes = require("./routes/auth.routes");
const programRoutes = require("./routes/program.routes");
const workoutlogRoutes = require("./routes/workoutlog.routes");
const analysisRoutes = require("./routes/analysis.routes");
const movementRoutes = require("./routes/movement.routes");

// --- Middleware (Ara Katman) Yapılandırması ---

app.set("trust proxy", 1);
app.get("/healthz", (req, res) => res.status(200).send("ok"));
app.use(helmet());

// CORS Yapılandırması
const allowed = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, cb) {
      // --- HATA AYIKLAMA İÇİN EKLENEN LOGLAR ---
      console.log(
        `[DEBUG] Allowed CORS Origin from env: "${process.env.CORS_ORIGIN}"`
      );
      console.log(`[DEBUG] Received Origin from browser: "${origin}"`);
      // -----------------------------------------

      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error("Cors Blocked"), false);
    },
    credentials: false,
  })
);

// JSON İLE ÇALIŞMAK İÇİN ORTAK AYAR
app.use(express.json());

//Passport.js'i başlatıyoruz
app.use(passport.initialize());

//Ana Endpoint - Trigger deploy azure
app.get("/", (req, res) => {
  res.send("Fitness API çalışıyor!");
});

// --- Yönlendiricileri (Routers) Uygulamaya Bağlama ---

app.use("/auth", authRoutes);
app.use("/programs", programRoutes);
app.use("/workoutlog", workoutlogRoutes);
app.use("/analysis", analysisRoutes);
app.use("/movements", movementRoutes);

// --- Genel Hata Yakalayıcı ---

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ ok: false, message: "Server error" });
});

// --- Veritabanı Bağlantısı ve Sunucuyu Başlatma ---

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
    process.exit(1);
  });
