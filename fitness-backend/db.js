// Prod'da .env dosyası yok; sadece local'de yükle
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const sql = require("mssql");

// Azure SQL için encrypt=true; local'de false.
// Bunu env ile kontrol ediyoruz.
const encrypt =
  String(process.env.SQL_ENCRYPT || "false").toLowerCase() === "true";

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt, // prod (Azure): true, local: false
    trustServerCertificate: !encrypt, // prod: false, local: true
    enableArithAbort: true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((p) => {
    console.log("✅ SQL pool connected");
    return p;
  })
  .catch((err) => {
    console.error("❌ SQL pool connect error:", err);
    throw err;
  });

module.exports = { sql, config, poolPromise };
