const { sql, config, poolPromise } = require("../db");

async function listPrograms(userId) {
  const pool = await poolPromise;
  // Günleri ve egzersizleri birlikte çeken bir sorgu
  const result = await pool.request().input("userId", sql.Int, userId)
    .query(`SELECT d.id AS program_id, d.day, d.isLocked,
              e.id AS exercise_id, e.name, e.sets, e.reps,e.muscle, e.isCompleted 
              FROM dbo.SamplePrograms d 
              LEFT JOIN SampleExercises e ON d.id = e.program_id WHERE d.user_id=@userId
              ORDER BY d.id, e.id`);
  console.log("PUBLIC DEMO TEST");
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
/**
 * Belirli bir kullanıcı için yeni bir program ve egzersizleri oluşturur.
 * @param {object} programData - { day, isLocked, exercises } bilgilerini içeren nesne.
 * @param {number} userId - Programın sahibi olacak kullanıcının ID'si.
 */
async function createProgram({ day, isLocked, exercises = [] }, userId) {
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);

  await tx.begin();
  try {
    // 1) SamplePrograms'a ekle
    const req1 = new sql.Request(tx);

    req1.input("day", sql.VarChar(20), day);
    req1.input("isLocked", sql.Bit, isLocked ? 1 : 0);
    req1.input("userId", sql.Int, userId);

    const programResult = await req1.query(`
      INSERT INTO dbo.SamplePrograms (day, isLocked, user_id)
      OUTPUT INSERTED.id
      VALUES (@day, @isLocked, @userId)
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
        INSERT INTO dbo.SampleExercises (program_id, name, sets, reps, muscle)
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
/**
 * Bir programı, sadece o programın sahibi olan kullanıcı güncelleyebilecek şekilde değiştirir.
 * @param {object} programData - { id, day, isLocked, exercises } bilgilerini içeren nesne.
 * @param {number} userId - İşlemi yapmaya çalışan kullanıcının ID'si.
 */
async function updateProgram({ id, day, isLocked, exercises = [] }, userId) {
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);

  await tx.begin();
  try {
    // 1) SamplePrograms güncelle
    const reqUpd = new sql.Request(tx);
    reqUpd
      .input("id", sql.Int, id)
      .input("day", sql.VarChar(20), day)
      .input("userId", sql.Int, userId)
      .input("isLocked", sql.Bit, isLocked ? 1 : 0);
    const updateResult = await reqUpd.query(
      ` UPDATE dbo.SamplePrograms SET day=@day, isLocked=@isLocked WHERE id=@id AND user_id = @userId`
    );
    // Eğer hiçbir satır güncellenmediyse (program bulunamadı veya kullanıcıya ait değilse), hata ver.
    if (updateResult.rowsAffected[0] === 0) {
      throw new Error(
        "Program not found or you do not have permission to update it."
      );
    }

    // 2) Eski egzersizleri sil (tamamı parametreli)
    const reqDel = new sql.Request(tx);
    reqDel.input("program_id", sql.Int, id);
    await reqDel.query(
      `DELETE FROM dbo.SampleExercises WHERE program_id=@program_id`
    );

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
      INSERT INTO dbo.SampleExercises (program_id, name, sets, reps, muscle)
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

/**
 * Bir programı, sadece o programın sahibi olan kullanıcı silebilecek şekilde kaldırır.
 * @param {number} programId - Silinecek programın ID'si.
 * @param {number} userId - İşlemi yapmaya çalışan kullanıcının ID'si.
 */
async function deleteProgram(programId, userId) {
  // <-- Gelen parametre: programId
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    // ÖNCE GÜVENLİK KONTROLÜ: Program bu kullanıcıya mı ait?
    const checkReq = new sql.Request(tx);
    checkReq.input("id", sql.Int, programId);
    checkReq.input("userId", sql.Int, userId);
    const checkResult = await checkReq.query(
      `SELECT id FROM dbo.SamplePrograms WHERE id = @id AND user_id = @userId`
    );
    if (checkResult.recordset.length === 0) {
      throw new Error(
        "Program not found or you do not have permission to delete it."
      );
    }

    // GÜVENLİK KONTROLÜ GEÇİLDİ. ŞİMDİ SİLME İŞLEMLERİ:
    // Önce en uçtaki çocuklardan başlıyoruz (WorkoutLogExercise)

    // 1) WorkoutLogExercise (ilgili programın log'larına bağlı olanlar)
    let req = new sql.Request(tx);
    await req
      .input("program_id", sql.Int, programId)
      .query(
        `DELETE FROM dbo.SampleLogExercises WHERE workout_log_id IN (SELECT id FROM dbo.SampleLogs WHERE program_id = @program_id)`
      );

    // 2) WorkoutLog
    req = new sql.Request(tx);
    await req
      .input("program_id", sql.Int, programId) // <-- DÜZELTİLDİ
      .query(`DELETE FROM dbo.SampleLogs WHERE program_id = @program_id`);

    // 3) Exercise
    req = new sql.Request(tx);
    await req
      .input("program_id", sql.Int, programId) // <-- DÜZELTİLDİ
      .query(`DELETE FROM dbo.SampleExercises WHERE program_id = @program_id`);

    // 4) DayPrograms (En son ana kaydı siliyoruz)
    req = new sql.Request(tx);
    await req
      .input("id", sql.Int, programId) // <-- DÜZELTİLDİ
      .query(`DELETE FROM dbo.SamplePrograms WHERE id = @id`);

    await tx.commit();
    return { id: programId, success: true }; // <-- DÜZELTİLDİ
  } catch (err) {
    // Bir hata olursa, tüm işlemleri geri al
    await tx.rollback();
    throw err; // Hatayı yukarıya (index.js'e) fırlat
  }
}

module.exports = {
  listPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
};
