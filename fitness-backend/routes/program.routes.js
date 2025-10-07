const express = require("express");
const router = express.Router();
const passport = require("passport");
const {
  listPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
} = require("../queries/program.queries");
const {
  validateProgramId,
  validateProgramBody,
} = require("../validators/program.validators");
// Bu router'daki tüm rotaları JWT ile koru
router.use(passport.authenticate("jwt", { session: false }));

//PROGRAMLARI SQLDEN ÇEKİP LİSTELEME
// Rota: GET /programs
router.get("/", async (req, res) => {
  try {
    const data = await listPrograms(req.user.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//PROGRAM EKLE
// Rota: POST /programs
router.post("/", validateProgramBody, async (req, res) => {
  try {
    const { day, isLocked, exercises } = req.body;
    // (opsiyonel) minik doğrulama: eksik alan varsa 400
    if (typeof day !== "string") {
      return res
        .status(400)
        .json({ error: "Field 'day' is required (string)." });
    }
    const created = await createProgram(
      { day, isLocked, exercises },
      req.user.id
    );
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /programs ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

//PROGRAMI GÜNCELLEME
// Rota: PUT /programs/:id
router.put(
  "/:id",
  [validateProgramId, validateProgramBody],
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { day, isLocked, exercises } = req.body;
      const updated = await updateProgram(
        { id, day, isLocked, exercises },
        req.user.id
      );
      res.json(updated);
    } catch (error) {
      console.error("PUT /programs/:id ERROR:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

//PROGRAMI SİLME
// Rota: DELETE /programs/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const out = await deleteProgram(id, req.user.id);
    res.json(out);
  } catch (error) {
    console.log("DELETE /programs/:id HATASI", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
