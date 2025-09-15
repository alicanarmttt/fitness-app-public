const { pool } = require("mssql");
const { sql, config } = require("../db");
const poolPromise = new (require("mssql").ConnectionPool)(config).connect();

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
  const tx = new mssql.Transaction(pool);

  await tx.begin();
  try {
    // 1) DayPrograms'a ekle
    const req1 = new mssql.Request(tx);

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
      const reqEx = new mssql.Request(tx);
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
    throw err;
  }
}

module.exports = { listPrograms, createProgram };
