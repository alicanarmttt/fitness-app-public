const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const { poolPromise } = require("../db");

// Fonksiyonu dışa aktarıyoruz ve JWT Secret'ı parametre olarak alıyoruz.
module.exports = (secret) => {
  // Gelen Secret değeri kontrol edilir. Eğer boşsa, bir hata fırlatılır.
  if (!secret) {
    throw new Error(
      "Passport JWT Strategy requires a secret key. Check your environment variables."
    );
  }

  // JWT Stratejisi için ayarlar. Secret artık parametreden geliyor.
  const options = {
    // Gelen isteğin 'Authorization' başlığındaki 'Bearer TOKEN' formatından
    // token'ı otomatik olarak çıkarmasını sağlıyoruz.
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

    // Token'ı doğrulamak için dışarıdan alınan gizli anahtarı kullanıyoruz.
    secretOrKey: secret,
  };

  // Passport.js'e yeni JWT stratejimizi öğretiyoruz.
  passport.use(
    new JwtStrategy(options, async (jwt_payload, done) => {
      try {
        // Not: Token Payload'undan gelen kullanıcı ID'si ('sub' claim'i)
        const userId = jwt_payload.sub;

        if (!userId) {
          // Payload'da 'sub' (subject/userId) yoksa yetkilendirmeyi reddet.
          return done(null, false, {
            message: "JWT payload is missing user ID.",
          });
        }

        const pool = await poolPromise;
        const result = await pool
          .request()
          .input("id", userId)
          .query(`SELECT id, email FROM dbo.Users WHERE id = @id`);

        const user = result.recordset[0];

        if (user) {
          // Kullanıcı bulundu: İsteğin devam etmesine izin ver ve user nesnesini req.user'a ata.
          return done(null, user);
        } else {
          // Kullanıcı bulunamadı (geçersiz veya silinmiş ID)
          return done(null, false, { message: "User not found in database." });
        }
      } catch (error) {
        // Veritabanı bağlantı hatası veya beklenmedik hatalar
        return done(error, false);
      }
    })
  );
};
