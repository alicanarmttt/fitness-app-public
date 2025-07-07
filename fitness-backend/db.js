const sql = require("mssql");

const config = {
  user: "sa",
  password: "071999",
  server: "localhost", // veya "localhost\\SQLEXPRESS"
  database: "deneme",
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function testConnection() {
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT GETDATE() AS currentTime`;
    console.log(
      "✅ Bağlantı başarılı! Sunucu zamanı:",
      result.recordset[0].currentTime
    );
    await sql.close();
  } catch (err) {
    console.error("❌ Bağlantı hatası:", err.message);
  }
}

testConnection();
module.exports = { sql, config };
