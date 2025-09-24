// backend/knexfile.js

require("dotenv").config();

module.exports = {
  // --- DEVELOPMENT ORTAMI ---
  development: {
    client: process.env.DB_CLIENT || "mssql",
    connection: {
      server: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      options: {
        port: parseInt(process.env.DB_PORT || "1433"),
        trustServerCertificate: true,
      },
    },
    migrations: {
      directory: "./db/migrations",
    },
  },

  // --- STAGING (TEST) ORTAMI ---
  staging: {
    client: process.env.STAGING_DB_CLIENT || "mssql",
    connection: {
      server: process.env.STAGING_DB_HOST,
      user: process.env.STAGING_DB_USER,
      password: process.env.STAGING_DB_PASSWORD,
      database: process.env.STAGING_DB_DATABASE,
      options: {
        port: parseInt(process.env.STAGING_DB_PORT || "1433"),
        trustServerCertificate: true,
      },
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: "./db/migrations",
      tableName: "knex_migrations",
    },
  },

  // --- PRODUCTION (CANLI) ORTAMI ---
  production: {
    client: process.env.PROD_DB_CLIENT || "mssql",
    connection: {
      server: process.env.PROD_DB_HOST,
      user: process.env.PROD_DB_USER,
      password: process.env.PROD_DB_PASSWORD,
      database: process.env.PROD_DB_DATABASE,
      options: {
        port: parseInt(process.env.PROD_DB_PORT || "1433"),
        // Canlı ortamda genellikle `trustServerCertificate: false` kullanılır
        // ve sunucunun SSL sertifikası düzgün yapılandırılır.
        trustServerCertificate: false,
      },
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: "./db/migrations",
      tableName: "knex_migrations",
    },
  },
};
