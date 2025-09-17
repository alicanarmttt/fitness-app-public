// queries/workoutlog.js
const { sql, config } = require("../db");
const poolPromise = new sql.ConnectionPool(config).connect();

// EGZERSİZ TAMAMLANDI (WorkoutLogExercise üzerinde!)

async function toggleWorkoutLogExerciseCompleted(id) {
  const pool = await poolPromise;

  const req = new sql.Request(pool);
  req.input("id", sql.Int, id);

  const result = await req.query(`
    UPDATE WorkoutLogExercise
    SET isCompleted = CASE WHEN ISNULL(isCompleted, 0) = 1 THEN 0 ELSE 1 END
    OUTPUT INSERTED.isCompleted
    WHERE id = @id;
  `);

  // Kayıt yoksa rowsAffected 0 olur → 404 verelim
  const affected = Array.isArray(result.rowsAffected)
    ? result.rowsAffected[0]
    : result.rowsAffected;
  if (!affected) {
    const err = new Error("WorkoutLogExercise not found");
    err.status = 404;
    throw err;
  }

  const newVal = result.recordset[0].isCompleted; // bit: 0/1
  return { id, isCompleted: !!newVal };
}

//WORKOUT LOG 30 GUNLUK OLUSTURMA
async function generateWorkoutLogs({ program_id, start_date, days }) {
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin(); // FARK: tek transaction

  try {
    // 1) program day
    let req = new sql.Request(tx);
    const dpRes = await req
      .input("id", sql.Int, program_id)
      .query(`SELECT day FROM DayPrograms WHERE id=@id`);

    if (!dpRes.recordset[0]) {
      throw Object.assign(new Error("Program günü bulunamadı!"), {
        status: 400,
      });
    }
    const programDay = String(dpRes.recordset[0].day || "").toLowerCase();

    // 2) exercises
    req = new sql.Request(tx);
    const exRes = await req
      .input("program_id", sql.Int, program_id)
      .query(
        `SELECT id, name, sets, reps, muscle FROM Exercise WHERE program_id=@program_id`
      );
    const exercises = exRes.recordset;

    const createdLogs = [];

    // 3) tarih döngüsü
    const base = new Date(start_date);
    for (let i = 0; i < days; i++) {
      const date = new Date(base);
      date.setDate(base.getDate() + i);

      // YYYY-MM-DD (lokal ofseti dikkate almadan basit format)
      const dateStr = date.toISOString().slice(0, 10);

      // sadece şablon gününde oluştur
      const dayName = date
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      if (dayName !== programDay) continue;

      // 3.1 aynı gün+program log var mı?
      let reqFind = new sql.Request(tx);
      const existing = await reqFind
        .input("date", sql.Date, dateStr)
        .input("program_id", sql.Int, program_id).query(`
          SELECT id FROM WorkoutLog
          WHERE [date]=@date AND program_id=@program_id
        `);

      let logId;
      if (existing.recordset.length > 0) {
        // VARSA: logId kullan + WLE'leri temizle
        logId = existing.recordset[0].id;

        let reqDel = new sql.Request(tx);
        await reqDel
          .input("log_id", sql.Int, logId)
          .query(`DELETE FROM WorkoutLogExercise WHERE workout_log_id=@log_id`);
      } else {
        // YOKSA: WorkoutLog oluştur
        let reqIns = new sql.Request(tx);
        const insRes = await reqIns
          .input("date", sql.Date, dateStr)
          .input("program_id", sql.Int, program_id).query(`
            INSERT INTO WorkoutLog ([date], program_id)
            OUTPUT INSERTED.id
            VALUES (@date, @program_id)
          `);
        logId = insRes.recordset[0].id;
      }

      // 3.2 WLE ekle (her iki durumda da)
      for (const ex of exercises) {
        const reqWle = new sql.Request(tx);
        await reqWle
          .input("workout_log_id", sql.Int, logId)
          .input("exercise_id", sql.Int, ex.id)
          .input("exercise_name", sql.VarChar(50), ex.name)
          .input("sets", sql.Int, ex.sets)
          .input("reps", sql.Int, ex.reps)
          .input("muscle", sql.VarChar(30), ex.muscle)
          .input("isCompleted", sql.Bit, 0).query(`
            INSERT INTO WorkoutLogExercise
              (workout_log_id, exercise_id, exercise_name, sets, reps, muscle, isCompleted)
            VALUES
              (@workout_log_id, @exercise_id, @exercise_name, @sets, @reps, @muscle, @isCompleted)
          `);
      }

      createdLogs.push({ logId, date: dateStr });
    }

    await tx.commit();
    return { success: true, createdLogs };
  } catch (err) {
    try {
      if (tx._aborted !== true) await tx.rollback();
    } catch {}
    throw err;
  }
}
//Tüm logları listele
async function listWorkoutLogs() {
  const pool = await poolPromise;
  const res = await pool.request().query(`
    SELECT id, [date], program_id
    FROM WorkoutLog
    ORDER BY [date] DESC, id DESC
  `);
  return res.recordset;
}

//Belirli bir günün egzersizlerini listele
async function listWorkoutLogExercises(logId) {
  const pool = await poolPromise;
  const req = new sql.Request(pool);
  req.input("workout_log_id", sql.Int, logId);

  const res = await req.query(`
    SELECT id, workout_log_id, exercise_id, exercise_name, sets, reps, muscle, isCompleted
    FROM WorkoutLogExercise
    WHERE workout_log_id = @workout_log_id
    ORDER BY id
  `);
  return res.recordset;
}

//Programdaki değişiklikte logları sil
async function deleteWorkoutLogsByProgram(programId) {
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    // 1) WLE sil
    let req = new sql.Request(tx);
    await req.input("program_id", sql.Int, programId).query(`
        DELETE FROM WorkoutLogExercise
        WHERE workout_log_id IN (
          SELECT id FROM WorkoutLog WHERE program_id = @program_id
        )
      `);

    // 2) WL sil
    req = new sql.Request(tx);
    const delWL = await req
      .input("program_id", sql.Int, programId)
      .query(`DELETE FROM WorkoutLog WHERE program_id = @program_id`);

    await tx.commit();

    // rowsAffected kontrolü (isteğe bağlı bilgilendirme)
    const affectedWL = Array.isArray(delWL.rowsAffected)
      ? delWL.rowsAffected[0]
      : delWL.rowsAffected;
    return { programId, deletedWorkoutLogs: affectedWL, success: true };
  } catch (err) {
    try {
      if (tx._aborted !== true) await tx.rollback();
    } catch {}
    throw err;
  }
}

module.exports = {
  toggleWorkoutLogExerciseCompleted,
  generateWorkoutLogs,
  listWorkoutLogs,
  listWorkoutLogExercises,
  deleteWorkoutLogsByProgram,
};
