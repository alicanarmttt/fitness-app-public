const { body, validationResult } = require("express-validator");

//Ortak hata işleyici fonksiyon
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Kullanıcı kayıt için kurallar
const validateRegister = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Lütfen geçerli bir e-posta adresi girin."),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Parola en az 6 karakter olmalıdır."),
  handleValidationErrors,
];

//Kullanıcı girişi içi kurallar
const validateLogin = [
  body(
    "email"
      .trim()
      .isEmail()
      .withMessage("Lütfen geçerli bir e posta adresi girin"),
    body("password").notEmpty().withMessage("Parola alanı boş bıraklamaz."),
    handleValidationErrors
  ),
];

module.exports = {
  validateRegister,
  validateLogin,
};
