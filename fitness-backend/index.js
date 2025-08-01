const express = require("express");
const app = express();
const PORT = 5000;
const cors = require("cors");
const { sql, config } = require("./db"); // ← db.js dosyandan import
const { pool } = require("mssql");
app.use(cors());

// JSON İLE ÇALIŞMAK İÇİN ORTAK AYAR
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Fitness API çalışıyor!");
});

//PROGRAMLARI SQLDEN ÇEKİP LİSTELEME

app.get("/programs", async (req, res) => {
  try {
    let pool = await sql.connect(config);
    // Günleri ve egzersizleri birlikte çeken bir sorgu
    let result = await pool.request().query(`
      SELECT d.id AS program_id, d.day, d.isLocked,
              e.id AS exercise_id, e.name, e.sets, e.reps,e.muscle, e.isCompleted 
              FROM DayPrograms d 
              LEFT JOIN Exercise e ON d.id = e.program_id 
              ORDER BY d.id, e.id`);

    // SQL'den gelen veriyi frontend'in beklediği şekilde grupla.
    const programsMap = new Map();
    result.recordset.forEach((row) => {
      if (!programsMap.has(row.program_id)) {
        programsMap.set(row.program_id, {
          id: row.program_id,
          day: row.day,
          isLocked: row.isLocked,
          exercises: [],
        });
      }
      if (row.exercise_id) {
        programsMap.get(row.program_id).exercises.push({
          id: row.exercise_id,
          name: row.name,
          sets: row.sets,
          reps: row.reps,
          muscle: row.muscle,
          isCompleted: row.isCompleted, // <-- ekle!
        });
      }
    });
    res.json(Array.from(programsMap.values()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//PROGRAM EKLE

app.post("/programs", async (req, res) => {
  const { day, isLocked, exercises } = req.body;
  try {
    let pool = await sql.connect(config);
    // 1. DayPrograms tablosuna yeni günü ekle

    const programResult = await pool
      .request()
      .input("day", sql.VarChar(20), day)
      .input("islocked", sql.Bit, isLocked ? 1 : 0)
      .query(
        "INSERT INTO DayPrograms (day, isLocked) OUTPUT INSERTED.id VALUES (@day, @isLocked)"
      );

    const newProgramId = programResult.recordset[0].id;

    // 2. egzersizleri ekle
    let newExercises = [];
    if (exercises && exercises.length > 0) {
      for (const ex of exercises) {
        const exerciseResult = await pool
          .request()
          .input("program_id", sql.Int, newProgramId)
          .input("name", sql.VarChar(50), ex.name)
          .input("sets", sql.Int, ex.sets)
          .input("reps", sql.Int, ex.reps)
          .input("muscle", sql.VarChar(30), ex.muscle)
          .query(
            "INSERT INTO Exercise (program_id, name, sets, reps, muscle) OUTPUT INSERTED.id, INSERTED.name, INSERTED.sets, INSERTED.reps, INSERTED.muscle VALUES (@program_id, @name, @sets,@reps, @muscle)"
          );
        newExercises.push(exerciseResult.recordset[0]);
      }
    }
    res.status(201).json({
      id: newProgramId,
      day,
      isLocked,
      exercises: newExercises,
    });
  } catch (err) {
    console.error("POST /programs ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

//PROGRAMI GÜNCELLEME

app.put("/programs/:id", async (req, res) => {
  const programId = parseInt(req.params.id);
  const { day, isLocked, exercises } = req.body;
  try {
    let pool = await sql.connect(config);
    // 1. DayPrograms tablosunda günü ve  kilit durumunu güncelle.
    await pool
      .request()
      .input("id", sql.Int, programId)
      .input("day", sql.VarChar(20), day)
      .input("isLocked", sql.Bit, isLocked ? 1 : 0)
      .query(
        "UPDATE DayPrograms SET day= @day, isLocked=@isLocked WHERE id=@id"
      );
    //o güne ait exercise listesini sil.
    await pool
      .request()
      .input("program_id", sql.Int, programId)
      .query("DELETE FROM Exercise WHERE program_id= @program_id");

    // 3. Gelen yeni egzersiz listesini tekrar ekle
    let newExercises = [];
    if (exercises && exercises.length > 0) {
      for (const ex of exercises) {
        const exerciseResult = await pool
          .request()
          .input("program_id", sql.Int, programId)
          .input("name", sql.VarChar(50), ex.name)
          .input("sets", sql.Int, ex.sets)
          .input("reps", sql.Int, ex.reps)
          .input("muscle", sql.VarChar(30), ex.muscle)
          .query(
            "INSERT INTO exercise (program_id, name, sets, reps, muscle) OUTPUT INSERTED.id, INSERTED.name, INSERTED.sets, INSERTED.reps, INSERTED.muscle VALUES (@program_id, @name, @sets, @reps, @muscle)"
          );
        newExercises.push(exerciseResult.recordset[0]);
      }
    }
    // 4. Güncellenmiş objeyi frontend'e gönder
    res.json({
      id: programId,
      day,
      isLocked,
      exercises: newExercises,
    });
  } catch (err) {
    console.error("PUT /programs/:id HATASI:", err); // <-- hata buraya basılır!
    res.status(500).json({ error: err.message });
  }
});

//PROGRAMI SİLME
app.delete("/programs/:id", async (req, res) => {
  const programId = parseInt(req.params.id);
  try {
    let pool = await sql.connect(config);

    // 1. Önce WorkoutLogExercise'ları sil
    await pool
      .request()
      .query(
        `DELETE FROM WorkoutLogExercise WHERE workout_log_id IN (SELECT id FROM WorkoutLog WHERE program_id=${programId})`
      );

    // 2. Sonra WorkoutLog'ları sil
    await pool
      .request()
      .query(`DELETE FROM WorkoutLog WHERE program_id=${programId}`);

    // 3. Sonra Exercise'ları sil
    await pool
      .request()
      .input("program_id", sql.Int, programId)
      .query("DELETE FROM Exercise WHERE program_id= @program_id");

    // 4. Son olarak DayProgram'ı sil
    await pool
      .request()
      .input("id", sql.Int, programId)
      .query("DELETE FROM DayPrograms WHERE id=@id");

    res.json({ id: programId, success: true });
  } catch (error) {
    console.log("DELETE /programs/:id HATASI", error);
    res.status(500).json({ error: error.message });
  }
});

//EGZERSİZ TAMAMLANDI

app.patch(
  "/programs/:programId/exercises/:exerciseId/completed",
  async (req, res) => {
    const programId = parseInt(req.params.programId);
    const exerciseId = parseInt(req.params.exerciseId);

    try {
      let pool = await sql.connect(config);

      //önce mevcut değerleri çek
      const currentResult = await pool
        .request()
        .input("id", sql.Int, exerciseId)
        .query("SELECT isCompleted FROM Exercise WHERE id=@id");

      if (currentResult.recordset.length === 0) {
        return res.status(404).json({ error: "Exercise not found." });
      }

      const current = currentResult.recordset[0].isCompleted;
      const newValue = current ? 0 : 1;
      //Güncelle
      await pool
        .request()
        .input("id", sql.Int, exerciseId)
        .input("isCompleted", sql.Bit, newValue)
        .query("UPDATE Exercise SET isCompleted=@isCompleted WHERE id=@id");

      res.json({ id: exerciseId, isCompleted: newValue });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
//WORKOUT LOG 30 GUNLUK OLUSTURMA
app.post("/workoutlog/generate", async (req, res) => {
  const { program_id, start_date, days } = req.body;

  try {
    let pool = await sql.connect(config);

    // 1. Bu program_id'nin günü ne?
    const programDayResult = await pool
      .request()
      .input("id", sql.Int, program_id)
      .query("SELECT day FROM DayPrograms WHERE id=@id");
    if (!programDayResult.recordset[0]) {
      return res.status(400).json({ error: "Program günü bulunamadı!" });
    }
    const programDay = programDayResult.recordset[0].day; // "monday", ...

    // 2. Egzersizleri çek
    const exerciseResult = await pool
      .request()
      .input("program_id", sql.Int, program_id)
      .query("SELECT * FROM Exercise WHERE program_id= @program_id");
    const exercises = exerciseResult.recordset;

    const createdLogs = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(start_date);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = date
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

      // Sadece o şablonun gününde log oluştur
      if (dayName === programDay) {
        const logResult = await pool
          .request()
          .input("date", sql.Date, dateStr)
          .input("program_id", sql.Int, program_id)
          .query(
            "INSERT INTO WorkoutLog (date, program_id) OUTPUT INSERTED.id VALUES (@date, @program_id)"
          );
        const logId = logResult.recordset[0].id;

        for (const ex of exercises) {
          await pool
            .request()
            .input("workout_log_id", sql.Int, logId)
            .input("exercise_id", sql.Int, ex.id)
            .input("exercise_name", sql.VarChar(50), ex.name)
            .input("sets", sql.Int, ex.sets)
            .input("reps", sql.Int, ex.reps)
            .input("muscle", sql.VarChar(30), ex.muscle)
            .input("isCompleted", sql.Bit, 0)
            .query(
              `INSERT INTO WorkoutLogExercise (workout_log_id, exercise_id, exercise_name, sets, reps, muscle, isCompleted) VALUES (@workout_log_id, @exercise_id, @exercise_name, @sets, @reps, @muscle, @isCompleted)`
            );
        }
        createdLogs.push({ logId, date: dateStr });
      }
    }
    res.json({ success: true, createdLogs });
  } catch (err) {
    console.error("POST /workoutlog/generate ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

//SQL’den Logları Çekip CalendarPage’de Göster
app.get("/workoutlog", async (req, res) => {
  try {
    let pool = await sql.connect(config);
    const result = await pool.request().query("SELECT * FROM WorkoutLog");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//SQL'den belirli bir workoutLog'un egzersizlerini getir
app.get("/workoutlog/:logId/exercises", async (req, res) => {
  const logId = parseInt(req.params.logId);
  try {
    let pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("workout_log_id", sql.Int, logId)
      .query(
        "SELECT * FROM WorkoutLogExercise WHERE workout_log_id=@workout_log_id"
      );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Programdaki değişiklikte logları sil
app.delete("/workoutlog/by-program/:programId", async (req, res) => {
  const programId = parseInt(req.params.programId);
  try {
    let pool = await sql.connect(config);
    await pool
      .request()
      .query(
        `DELETE FROM WorkoutLogExercise WHERE workout_log_id IN (SELECT id FROM WorkoutLog WHERE program_id=${programId})`
      );
    //sonra logları sil
    await pool
      .request()
      .query(`DELETE FROM WorkoutLog WHERE program_id= ${programId}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.listen(PORT, () => {
  console.log(`sunucu çalışıyor: http://localhost:${PORT}`);
});
