const { sql, config, poolPromise } = require("../db");

async function listPrograms() {
  const pool = await poolPromise;
  // Günleri ve egzersizleri birlikte çeken bir sorgu
  const result = await pool.request()
    .query(`SELECT d.id AS program_id, d.day, d.isLocked,
              e.id AS exercise_id, e.name, e.sets, e.reps,e.muscle, e.isCompleted 
              FROM DayPrograms d 
              LEFT JOIN Exercise e ON d.id = e.program_id 
              ORDER BY d.id, e.id`);

  // SQL'den gelen veriyi frontend'in beklediği şekilde grupla.
  const map = new Map();
  result.recordset.forEach((row) => {
    if (!map.has(row.program_id)) {
      map.set(row.program_id, {
        id: row.program_id,
        day: row.day,
        isLocked: row.isLocked,
        exercises: [],
      });
    }
    if (row.exercise_id) {
      map.get(row.program_id).exercises.push({
        id: row.exercise_id,
        name: row.name,
        sets: row.sets,
        reps: row.reps,
        muscle: row.muscle,
        isCompleted: row.isCompleted, // <-- ekle!
      });
    }
  });
  return Array.from(map.values());
}

async function createProgram({ day, isLocked, exercises = [] }) {
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);

  await tx.begin();
  try {
    // 1) DayPrograms'a ekle
    const req1 = new sql.Request(tx);

    req1.input("day", sql.VarChar(20), day);
    req1.input("isLocked", sql.Bit, isLocked ? 1 : 0);
    const programResult = await req1.query(`
      INSERT INTO DayPrograms (day, isLocked)
      OUTPUT INSERTED.id
      VALUES (@day, @isLocked)
    `);
    const newProgramId = programResult.recordset[0].id;
    // 2) Egzersizleri ekle (varsa)
    const insertedExercises = [];
    for (const ex of exercises) {
      const reqEx = new sql.Request(tx);
      reqEx
        .input("program_id", sql.Int, newProgramId)
        .input("name", sql.VarChar(50), ex.name)
        .input("sets", sql.Int, ex.sets)
        .input("reps", sql.Int, ex.reps)
        .input("muscle", sql.VarChar(30), ex.muscle);

      const exResult = await reqEx.query(`
        INSERT INTO Exercise (program_id, name, sets, reps, muscle)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.sets, INSERTED.reps, INSERTED.muscle
        VALUES (@program_id, @name, @sets, @reps, @muscle)
      `);
      insertedExercises.push(exResult.recordset[0]);
    }
    await tx.commit(); // <-- FARKLI: hepsi başarılıysa commit
    return {
      id: newProgramId,
      day,
      isLocked: !!isLocked,
      exercises: insertedExercises,
    };
  } catch (error) {
    await tx.rollback(); // <-- FARKLI: hata olursa rollback
    throw error;
  }
}

async function updateProgram({ id, day, isLocked, exercises = [] }) {
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);

  await tx.begin();
  try {
    // 1) DayPrograms güncelle
    const reqUpd = new sql.Request(tx);
    reqUpd
      .input("id", sql.Int, id)
      .input("day", sql.VarChar(20), day)
      .input("isLocked", sql.Bit, isLocked ? 1 : 0);
    await reqUpd.query(
      ` UPDATE DayPrograms SET day=@day, isLocked=@isLocked WHERE id=@id`
    );

    // 2) Eski egzersizleri sil (tamamı parametreli)
    const reqDel = new sql.Request(tx);
    reqDel.input("program_id", sql.Int, id);
    await reqDel.query(`DELETE FROM Exercise WHERE program_id=@program_id`);

    // 3) Yeni egzersizleri ekle (varsa)
    const insertedExercises = [];
    for (const ex of exercises) {
      const reqEx = new sql.Request(tx);
      reqEx
        .input("program_id", sql.Int, id)
        .input("name", sql.VarChar(50), ex.name)
        .input("sets", sql.Int, ex.sets)
        .input("reps", sql.Int, ex.reps)
        .input("muscle", sql.VarChar(30), ex.muscle);

      const exRes = await reqEx.query(`
      INSERT INTO Exercise (program_id, name, sets, reps, muscle)
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.sets, INSERTED.reps, INSERTED.muscle
      VALUES (@program_id, @name, @sets, @reps, @muscle)
      `);
      insertedExercises.push(exRes.recordset[0]);
    }
    await tx.commit();
    return {
      id,
      day,
      isLocked: !!isLocked,
      exercises: insertedExercises,
    };
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

async function deleteProgram(id) {
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);

  await tx.begin();
  try {
    // 1) WorkoutLogExercise (ilgili programın log'larına bağlı olanlar)
    let req = new sql.Request(tx);
    await req
      .input("program_id", sql.Int, id)
      .query(
        `DELETE FROM WorkoutLogExercise WHERE workout_log_id IN(SELECT id FROM WorkoutLog WHERE program_id=@program_id)`
      );
    // 2) WorkoutLog
    req = new sql.Request(tx);
    await req
      .input("program_id", sql.Int, id)
      .query(`DELETE FROM WorkoutLog WHERE program_id=@program_id`);
    // 3) Exercise
    req = new sql.Request(tx);
    await req
      .input("program_id", sql.Int, id)
      .query(`DELETE FROM Exercise WHERE program_id=@program_id`);

    // 4) DayPrograms
    req = new sql.Request(tx);
    const delRes = await req
      .input("id", sql.Int, id)
      .query(`DELETE FROM DayPrograms WHERE id=@id`);

    const affected = Array.isArray(delRes.rowsAffected)
      ? delRes.rowsAffected[0]
      : delRes.rowsAffected;

    if (!affected) {
      await tx.rollback();
      const err = new Error("Program not found");
      err.status = 404;
      throw err;
    }
    await tx.commit();
    return { id, success: true };
  } catch (err) {
    try {
      if (tx._aborted !== true) await tx.rollback();
    } catch {}
    throw err;
  }
}

module.exports = {
  listPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
};
