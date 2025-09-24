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
passport.use();
