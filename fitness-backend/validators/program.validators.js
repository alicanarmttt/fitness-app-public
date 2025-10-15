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
// YENİ: Sadece yeni program OLUŞTURMA ('POST') için kural zinciri
// Bu kural 'day' alanını kontrol etmez, çünkü başlangıçta boştur.
const validateProgramCreate = [
  body("isLocked")
    .isBoolean()
    .withMessage("Kilit durumu true ya da false olmalıdır."),
  body("exercises").isArray().withMessage("Egzersizler bir dizi olmalıdır."),
  handleValidationErrors,
];

// GÜNCELLENDİ: Program GÜNCELLEME/KAYDETME ('PUT') için kural zinciri
// Bu kural, 'day' alanının dolu olmasını zorunlu kılar.
const validateProgramUpdate = [
  body("day").trim().notEmpty().withMessage("Gün alanı boş bırakılamaz."),
  body("isLocked")
    .isBoolean()
    .withMessage("Kilit durumu true ya da false olmalıdır."),
  body("exercises").isArray().withMessage("Egzersizler bir dizi olmalıdır."),
  // Dizinin içindeki her bir objenin alanlarını kontrol etme
  body("exercises.*.movement_id")
    .optional({ checkFalsy: true }) // null, 0, false, "" gibi değerleri de geçerli sayar, ama sadece varsa kontrol eder
    .isInt({ min: 1 })
    .withMessage("Geçerli bir hareket seçilmelidir."),
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
  validateProgramCreate,
  validateProgramUpdate,
};
