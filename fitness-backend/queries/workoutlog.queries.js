// queries/SampleLogs.js
const { poolPromise, sql, config } = require("../db");

// EGZERSİZ TAMAMLANDI (WorkoutLogExercise üzerinde!)
/**
 * Bir egzersiz günlüğünü, sadece o günlüğün sahibi olan kullanıcı tamamlandı olarak işaretleyebilir.
 * @param {number} workoutLogExerciseId - Güncellenecek egzersiz günlüğünün ID'si.
 * @param {number} userId - İşlemi yapmaya çalışan kullanıcının ID'si.
 */
async function toggleWorkoutLogExerciseCompleted(workoutLogExerciseId, userId) {
  const pool = await poolPromise;

  const req = new sql.Request(pool);
  req
    .input("id", sql.Int, workoutLogExerciseId)
    .input("userId", sql.Int, userId);

  // GÜNCELLENDİ: Sorguya, işlemi yapan kullanıcının bu verinin sahibi olup olmadığını
  // kontrol eden bir güvenlik kontrolü (JOIN ile) eklendi.
  const result = await req.query(`
    UPDATE wle
    SET wle.isCompleted = CASE WHEN ISNULL(wle.isCompleted, 0) = 1 THEN 0 ELSE 1 END
    OUTPUT INSERTED.isCompleted
    FROM dbo.SampleLogExercises AS wle
    INNER JOIN dbo.SampleLogs AS wl ON wle.workout_log_id = wl.id
    INNER JOIN dbo.SamplePrograms AS dp ON wl.program_id = dp.id
    WHERE wle.id = @id AND dp.user_id = @userId;
  `);

  // Kayıt yoksa rowsAffected 0 olur → 404 verelim
  const affected = Array.isArray(result.rowsAffected)
    ? result.rowsAffected[0]
    : result.rowsAffected;
  if (!affected) {
    const err = new Error("SampleLogExercises not found");
    err.status = 404;
    throw err;
  }

  const newVal = result.recordset[0].isCompleted; // bit: 0/1
  return { id: workoutLogExerciseId, isCompleted: !!newVal };
}

//WORKOUT LOG 30 GUNLUK OLUSTURMA

/**
 * Sadece belirli bir kullanıcıya ait bir program için antrenman günlükleri oluşturur.
 * @param {object} logData - { program_id, start_date, days } bilgilerini içerir.
 * @param {number} userId - İşlemi yapmaya çalışan kullanıcının ID'si.
 */

async function generateWorkoutLogs({ program_id, start_date, days }, userId) {
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin(); // FARK: tek transaction

  try {
    // 1) program day
    // GÜVENLİK KONTROLÜ: Günlük oluşturulacak program bu kullanıcıya mı ait?
    const checkReq = new sql.Request(tx);
    checkReq.input("programId", sql.Int, program_id);
    checkReq.input("userId", sql.Int, userId);
    const checkResult = await checkReq.query(`
        SELECT day FROM dbo.SamplePrograms WHERE id = @programId AND user_id = @userId
    `);
    if (checkResult.recordset.length === 0) {
      throw new Error(
        "Program not found or you do not have permission to generate logs for it."
      );
    }
    const programDay = String(checkResult.recordset[0].day || "").toLowerCase();

    // 2) exercises
    req = new sql.Request(tx);
    const exRes = await req.input("program_id", sql.Int, program_id).query(
      `SELECT 
          ex.id as exercise_id, 
          ex.sets, 
          ex.reps,
          ex.movement_id,
          mov.name as exercise_name,
          mov.primary_muscle_group as muscle
        FROM dbo.SampleExercises ex
        LEFT JOIN dbo.SampleMovements mov ON ex.movement_id = mov.id
        WHERE ex.program_id = @program_id`
    );
    const exercises = exRes.recordset;
    // HATA AYIKLAMA: Sorunun kaynağını bulmak için çekilen veriyi terminale yazdır.
    console.log("--- Çekilen Egzersiz Verisi ---");
    console.log(exercises);
    console.log("-----------------------------");

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
          INSERT INTO dbo.SampleLogs ([date], program_id)
            OUTPUT INSERTED.id
            VALUES (@date, @program_id)
        `);
      const logId = existing.recordset[0].id;
      // 3.2 WorkoutLogExercise kayıtlarını ekle (her iki durumda da)
      for (const ex of exercises) {
        // GÜVENLİK KONTROLÜ: exercise_name'in NULL olup olmadığını kontrol et
        if (!ex.exercise_name) {
          console.warn(
            `[UYARI] exercise_id: ${ex.exercise_id} için hareket adı bulunamadı, bu kayıt atlanıyor.`
          );
          continue;
        }
        const reqWle = new sql.Request(tx);
        await reqWle
          .input("workout_log_id", sql.Int, logId)
          .input("exercise_id", sql.Int, ex.exercise_id)
          .input("exercise_name", sql.VarChar(50), ex.exercise_name)
          .input("sets", sql.Int, ex.sets)
          .input("reps", sql.Int, ex.reps)
          .input("muscle", sql.VarChar(30), ex.muscle)
          .input("isCompleted", sql.Bit, 0).query(`
            INSERT INTO dbo.SampleLogExercises
              (workout_log_id, exercise_id, exercise_name, sets, reps, muscle, isCompleted)
            VALUES
              (@workout_log_id, @exercise_id, @exercise_name, @sets, @reps, @muscle, @isCompleted)
          `);
      }
    }

    await tx.commit();
    return { success: true };
  } catch (err) {
    try {
      if (tx._aborted !== true) await tx.rollback();
    } catch {}
    throw err;
  }
}
//Tüm logları listele
/**
 * Sadece belirli bir kullanıcıya ait antrenman günlüklerini listeler.
 * @param {number} userId - Giriş yapmış kullanıcının ID'si.
 */
async function listWorkoutLogs(userId) {
  const pool = await poolPromise;
  const res = await pool.request().input("userId", sql.Int, userId).query(`
    SELECT wl.id, wl.[date], wl.program_id
      FROM dbo.SampleLogs AS wl
      INNER JOIN dbo.SamplePrograms AS dp ON wl.program_id = dp.id -- <-- YENİ: Sahiplik zinciri için JOIN.
      WHERE dp.user_id = @userId -- <-- YENİ: Sadece bu kullanıcıya ait olanlar filtrelendi.
      ORDER BY wl.[date] DESC, wl.id DESC
  `);
  return res.recordset;
}

//Belirli bir günün egzersizlerini listele
/**
 * Bir günlüğe ait egzersizleri, sadece o günlüğün sahibi olan kullanıcıya gösterir.
 * @param {number} logId - Görüntülenecek günlüğün ID'si.
 * @param {number} userId - İşlemi yapmaya çalışan kullanıcının ID'si.
 */
async function listWorkoutLogExercises(logId, userId) {
  const pool = await poolPromise;
  const req = new sql.Request(pool);
  req.input("workout_log_id", sql.Int, logId).input("userId", sql.Int, userId);

  const res = await req.query(`
   SELECT 
        wle.*,
        ex.movement_id -- Exercise tablosundan movement_id'yi de alıyoruz
    FROM 
        dbo.SampleLogExercises AS wle
    INNER JOIN 
        dbo.SampleLogs AS wl ON wle.workout_log_id = wl.id
    INNER JOIN 
        dbo.SamplePrograms AS dp ON wl.program_id = dp.id
    -- YENİ JOIN: WorkoutLogExercise'deki exercise_id'yi kullanarak Exercise tablosuna bağlanıyoruz.
    INNER JOIN 
        dbo.SampleExercises AS ex ON wle.exercise_id = ex.id
    WHERE 
        wle.workout_log_id = @workout_log_id AND dp.user_id = @userId
    ORDER BY 
        wle.id
  `);
  console.log(res);
  return res.recordset;
}
/**
 * Bir programa ait logları, sadece o programın sahibi olan kullanıcı silebilir.
 * @param {number} programId - Logları silinecek programın ID'si.
 * @param {number} userId - İşlemi yapmaya çalışan kullanıcının ID'si.
 */
//Programdaki değişiklikte logları sil
async function deleteWorkoutLogsByProgram(programId, userId) {
  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    const checkReq = new sql.Request(tx);
    checkReq.input("programId", sql.Int, programId);
    checkReq.input("userId", sql.Int, userId);
    const checkResult = await checkReq.query(
      `SELECT id FROM dbo.SamplePrograms WHERE id = @programId AND user_id = @userId`
    );
    if (checkResult.recordset.length === 0) {
      throw new Error(
        "Program not found or you do not have permission to delete its logs."
      );
    }

    // 1) WLE sil
    let req = new sql.Request(tx);
    await req.input("program_id", sql.Int, programId).query(`
        DELETE FROM dbo.SampleLogExercises
        WHERE workout_log_id IN (
          SELECT id FROM dbo.SampleLogs WHERE program_id = @program_id
        )
      `);

    // 2) WL sil
    req = new sql.Request(tx);
    const delWL = await req
      .input("program_id", sql.Int, programId)
      .query(`DELETE FROM dbo.SampleLogs WHERE program_id = @program_id`);

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
