const { poolPromise, sql } = require("../db");
const bcrypt = require("bcryptjs");
const passport = require("passport");

/**
 * Verilen e-posta adresine sahip bir kullanıcıyı veritabanında bulur.
 * @param {string} email - Aranacak kullanıcının e-posta adresi
 * @returns {Promise<object|null>} - Kullanıcının nesnesini veya bulunmazsa null döner.
 */

async function findUserByEmail(email) {
  try {
    console.log("[findUserByEmail] Function started for email:", email);
    const pool = await poolPromise;
    console.log("[findUserByEmail] Database pool acquired.");
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query(`SELECT * FROM dbo.Users WHERE email =@email`);
    console.log(
      "[findUserByEmail] Query executed, user found:",
      result.recordset.length > 0
    );
    return result.recordset[0];
  } catch (error) {
    console.error("[findUserByEmail] CRITICAL ERROR:", error);
    throw error;
  }
}
/**
 * Verilen ID'ye sahip bir kullanıcıyı veritabanında bulur.
 * Bu fonksiyon, Passport'un JWT'yi doğruladıktan sonra kullanıcıyı getirmesi için kullanılır.
 * @param {number} id - Aranacak kullanıcının ID'si.
 * @returns {Promise<object|null>} - Kullanıcı nesnesini veya bulunamazsa null döner.
 */
async function findUserById(id) {
  const pool = poolPromise;
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .query(`SELECT id, email FROM dbo.Users WHERE id=@id`);
  return result.recordset[0];
}

/**
 * Veritabanına yeni bir kullanıcı kaydeder.
 * Parolayı kaydetmeden önce güvenli bir şekilde hash'ler.
 * @param {string} email - Yeni kullanıcının e-posta adresi.
 * @param {string} password - Yeni kullanıcının düz metin parolası.
 * @returns {Promise<object>} - Oluşturulan yeni kullanıcı nesnesi.
 */
async function createUser(email, password) {
  const pool = await poolPromise;

  // bcrypt.genSalt ile bir "tuz" oluşturup, bcrypt.hash ile parolayı şifreliyoruz.
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const result = await pool
    .request()
    .input("email", sql.NVarChar, email)
    .input("passwordHash", sql.NVarChar, passwordHash)
    .query(`INSERT INTO dbo.Users (email, passwordHash)
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.createdAt
        VALUES (@email, @passwordHash)`);

  return result.recordset[0];
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
};
