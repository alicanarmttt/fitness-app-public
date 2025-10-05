const express = require("express");
const router = express.Router();
const passport = require("passport");
const {
  toggleWorkoutLogExerciseCompleted,
  generateWorkoutLogs,
  listWorkoutLogs,
  listWorkoutLogExercises,
  deleteWorkoutLogsByProgram,
} = require("../queries/workoutlog.queries");

router.use(passport.authenticate("jwt", { session: false }));

// EGZERSİZ TAMAMLANDI (WorkoutLogExercise üzerinde!)
// Rota: PATCH /workoutlog/exercise/:id/completed
router.patch("/exercise/:id/completed", async (req, res) => {
  try {
    const exerciseLogId = parseInt(req.params.id);
    const out = await toggleWorkoutLogExerciseCompleted(
      exerciseLogId,
      req.user.id
    );
    res.json(out);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

//WORKOUT LOG 30 GUNLUK OLUSTURMA
// Rota: POST /workoutlog/generate
router.post("/generate", async (req, res) => {
  try {
    const { program_id, start_date, days } = req.body;
    const out = await generateWorkoutLogs(
      { program_id, start_date, days },
      req.user.id
    );
    res.json(out);
  } catch (err) {
    console.error("POST /workoutlog/generate ERROR:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

//tüm logları getir
// Rota: GET /workoutlog

router.get("/", async (req, res) => {
  try {
    const rows = await listWorkoutLogs(req.user.id);
    res.json(rows);
  } catch (err) {
    console.error("GET /workoutlog ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

//bir günün egzersiz logları
// Rota: GET /workoutlog/:logId/exercises
router.get("/:logId/exercises", async (req, res) => {
  try {
    const logId = parseInt(req.params.logId);
    const rows = await listWorkoutLogExercises(logId, req.user.id);
    res.json(rows);
  } catch (err) {
    console.error("GET /workoutlog/:logId/exercises ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

//Programdaki değişiklikte logları sil
// Rota: DELETE /workoutlog/by-program/:programId
router.delete("/by-program/:programId", async (req, res) => {
  try {
    const programId = parseInt(req.params.programId);
    const out = await deleteWorkoutLogsByProgram(programId, req.user.id);
    res.json(out);
  } catch (err) {
    console.error("DELETE /workoutlog/by-program/:programId ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
