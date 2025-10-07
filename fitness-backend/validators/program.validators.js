const { body, param, validationResult } = require("express-validator");

//Ortak hata işleyici fonksiyon
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// URL'deki ID'yi doğrulayan kural zinciri
const validateProgramId = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Program IDsi geçerli bir sayı olmalıdır."),
  handleValidationErrors,
];

//İsteğin bodysini doğrulayan kural zinciri
const validateProgramBody = [
  body("day").trim().notEmpty().withMessage("Gün alanı boş bırakılamaz."),
  body("isLocked")
    .isBoolean()
    .withMessage("Kilit durumu true ya da false olmalıdır"),
  body("exercises").isArray().withMessage("Egzersizler bir dizi olmalıdır."),
  body("exercises.*.name")
    .trim()
    .notEmpty()
    .withMessage("Egzersiz adı boş bırakılamaz."),
  body("exercises.*.sets")
    .isInt({ min: 1 })
    .withMessage("Set sayısı geçerli bir sayı olmalıdır."),
  body("exercises.*.reps")
    .isInt({ min: 1 })
    .withMessage("Tekrar sayısı geçerli bir sayı olmalıdır."),
  handleValidationErrors,
];
module.exports = {
  validateProgramId,
  validateProgramBody,
};
