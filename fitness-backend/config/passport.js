const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const { poolPromise } = require("../db");

// Bu, JWT (JSON Web Token) stratejisini yapılandırmak için kullanacağımız ayarlar.
const options = {
  // Gelen isteğin 'Authorization' başlığındaki 'Bearer TOKEN' formatından
  // token'ı otomatik olarak çıkarmasını sağlıyoruz.
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  // Token'ı doğrulamak için kullanacağımız gizli anahtar.
  // Bu anahtarın .env dosyasında saklanması çok önemlidir!
  secretOrKey: process.env.JWT_SECRET,
};

// Passport.js'e yeni JWT stratejimizi öğretiyoruz.
// Bu strateji, korumalı endpoint'lere gelen her istekte çalışacak.
passport.use(
  new JwtStrategy(options, async (jwt_payload, done) => {
    try {
      // Token'ın içindeki payload'dan kullanıcının id'sini alıyoruz.
      const userId = jwt_payload.sub;
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input("id", userId)
        .query(`SELECT id, email FROM dbo.Users WHERE id = @id`);
      const user = result.recordset[0];

      if (user) {
        // Eğer kullanıcı veritabanında bulunursa, 'done' fonksiyonunu  kullanıcı nesnesiyle çağırarak isteğin devam etmesine izin veriyoruz.
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(error, false);
    }
  })
);
