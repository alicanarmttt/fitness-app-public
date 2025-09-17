require("dotenv").config();
const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
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
