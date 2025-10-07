// knexfile.js

// .env dosyasındaki ortam değişkenlerini yüklemek için bu satırı ekliyoruz.
require("dotenv").config();
console.log(">>> Knex bağlanmaya çalışıyor:", process.env.DB_DATABASE);
module.exports = {
  development: {
    client: "mssql",
    connection: {
      host: process.env.DB_SERVER || "localhost",
      port: parseInt(process.env.DB_PORT) || 1433,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      options: {
        // Local SQL Express sunucuları genellikle SSL sertifikası olmadan çalışır.
        // Azure SQL için bu değer 'true' olmalıdır.
        encrypt: process.env.DB_ENCRYPT === "true",
      },
    },
    migrations: {
      directory: "./db/migrations",
      tableName: "knex_migrations",
    },
  },

  // Canlı (production) ortamı için ayarları daha sonra buraya ekleyebiliriz.
  production: {
    client: "mssql",
    connection: {
      host: process.env.DB_SERVER,
      port: parseInt(process.env.DB_PORT) || 1433,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      options: {
        // Azure SQL her zaman şifreli bağlantı gerektirir.
        encrypt: true,
      },
    },
    migrations: {
      directory: "./db/migrations",
      tableName: "knex_migrations",
    },
  },
};
