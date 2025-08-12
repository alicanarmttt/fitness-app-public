const express = require("express");
const app = express();
const PORT = 5000;
const cors = require("cors");
const { sql, config } = require("./db"); // ← db.js dosyandan import

app.use(cors());

const globalPoolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((p) => {
    console.log("✅ SQL pool connected");
    return p;
  })
  .catch((err) => {
    console.error("❌ SQL pool connect error:", err);
    throw err;
  });

// JSON İLE ÇALIŞMAK İÇİN ORTAK AYAR
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Fitness API çalışıyor!");
});

//PROGRAMLARI SQLDEN ÇEKİP LİSTELEME

app.get("/programs", async (req, res) => {
  try {
    const pool = await globalPoolPromise; // <— hep bunu kullan
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
    const pool = await globalPoolPromise;

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
    const pool = await globalPoolPromise;

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
    const pool = await globalPoolPromise;

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

// EGZERSİZ TAMAMLANDI (WorkoutLogExercise üzerinde!)
app.patch("/workoutlog-exercise/:id/completed", async (req, res) => {
  const exerciseLogId = parseInt(req.params.id); // WorkoutLogExercise tablosu ID’si!
  console.log("PATCH geldi! id:", exerciseLogId);
  try {
    const pool = await globalPoolPromise;

    // önce mevcut değerini çek
    const currentResult = await pool
      .request()
      .input("id", sql.Int, exerciseLogId)
      .query("SELECT isCompleted FROM WorkoutLogExercise WHERE id=@id");

    if (currentResult.recordset.length === 0) {
      return res.status(404).json({ error: "WorkoutLogExercise not found." });
    }

    const current = currentResult.recordset[0].isCompleted;
    const newValue = current ? 0 : 1;

    // Güncelle
    await pool
      .request()
      .input("id", sql.Int, exerciseLogId)
      .input("isCompleted", sql.Bit, newValue)
      .query(
        "UPDATE WorkoutLogExercise SET isCompleted=@isCompleted WHERE id=@id"
      );

    res.json({ id: exerciseLogId, isCompleted: newValue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//WORKOUT LOG 30 GUNLUK OLUSTURMA
app.post("/workoutlog/generate", async (req, res) => {
  const { program_id, start_date, days } = req.body;

  try {
    const pool = await globalPoolPromise;

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
    const pool = await globalPoolPromise;

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
    const pool = await globalPoolPromise;

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
    const pool = await globalPoolPromise;

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

//----------------------------ANALYSIS PART---------------------------------------------

const LEVEL_RANGES = {
  beginner: {
    chest: [10, 12],
    back: [10, 12],
    quads: [12, 14],
    hamstring: [10, 12],
    shoulder: [8, 10],
    biceps: [8, 10],
    triceps: [8, 10],
  },
  intermediate: {
    chest: [12, 16],
    back: [12, 16],
    quads: [14, 18],
    hamstring: [12, 16],
    shoulder: [10, 12],
    biceps: [10, 12],
    triceps: [10, 12],
  },
  advanced: {
    chest: [16, 20],
    back: [16, 20],
    quads: [16, 20],
    hamstring: [14, 18],
    shoulder: [12, 14],
    biceps: [12, 15],
    triceps: [12, 14],
  },
};
const MUSCLES = [
  "chest",
  "back",
  "quads",
  "hamstring",
  "shoulder",
  "biceps",
  "triceps",
];

function toLocalISO(dateLike) {
  const d = new Date(dateLike);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // UTC→yerel kaydırma
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function todayLocalISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
function addDaysLocal(baseISO, diff) {
  const [y, m, d] = baseISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + diff);
  return toLocalISO(dt);
}
app.get("/analysis", async (req, res) => {
  const level = (req.query.level || "intermediate").toLowerCase();
  const ranges = LEVEL_RANGES[level] || LEVEL_RANGES.intermediate;

  const today = todayLocalISO();
  const from7 = addDaysLocal(today, -7);
  const from30 = addDaysLocal(today, -30);

  try {
    const pool = await globalPoolPromise; // <— hep bunu kullan
    // 1) PLANLANAN SETLER (ŞABLON) — kas bazında (Programın Kalitesi / 7 gün için)
    // Not: Şablon tüm haftayı temsil ettiğinden burada tarih filtresi yok; Exercise tablosu toplam setleri alıyoruz.

    const plannedByMuscle = await pool.request().query(`
      SELECT e.muscle, COALESCE(SUM(e.sets),0) AS plannedSets FROM Exercise e GROUP BY e.muscle`);
    const plannedMap = {};
    plannedByMuscle.recordset.forEach(
      (r) => (plannedMap[r.muscle] = Number(r.plannedSets || 0))
    );

    // 2) 7 GÜN DONE SETS (top/bottom ve "en az/çok çalışan" için)
    const done7 = await pool
      .request()
      .input("from", sql.Date, from7)
      .input("to", sql.Date, today).query(`SELECT
      wle.muscle,
      COALESCE(SUM(CASE WHEN wle.isCompleted = 1 THEN wle.sets ELSE 0 END), 0) AS doneSets
      FROM WorkoutLogExercise AS wle
      JOIN WorkoutLog AS wl ON wle.workout_log_id = wl.id
      WHERE wl.date BETWEEN @from AND @to
      GROUP BY wle.muscle;`);
    const done7Map = {};
    done7.recordset.forEach(
      (r) => (done7Map[r.muscle] = Number(r.doneSets || 0))
    );

    // 3) 30 GÜN GÜNLÜK PLANLANAN & YAPILAN SETLER (completion, trend, calendar rates için)
    const planned30 = await pool
      .request()
      .input("from", sql.Date, from30)
      .input("to", sql.Date, today).query(`
        SELECT wl.date, COALESCE(SUM(wle.sets),0) AS plannedSetsDay
        FROM WorkoutLog wl
        JOIN WorkoutLogExercise wle ON wle.workout_log_id = wl.id
        WHERE wl.date BETWEEN @from AND @to
        GROUP BY wl.date
      `);
    const done30 = await pool
      .request()
      .input("from", sql.Date, from30)
      .input("to", sql.Date, today).query(`
        SELECT wl.date, COALESCE(SUM(CASE WHEN wle.isCompleted=1 THEN wle.sets ELSE 0 END),0) AS doneSetsDay
        FROM WorkoutLog wl
        JOIN WorkoutLogExercise wle ON wle.workout_log_id = wl.id
        WHERE wl.date BETWEEN @from AND @to
        GROUP BY wl.date
      `);

    // ---------- PROGRAM7: SADECE "KALİTE" (Yeterlilik) ----------
    // Planlanan setler seviye aralığına göre 0–1 skor (kas bazında) → ortalama
    let suffSum = 0,
      suffCount = 0;
    const byMuscle = [];

    MUSCLES.forEach((m) => {
      const planned = Number(plannedMap[m] || 0);
      const [L, U] = ranges[m] || [0, 0];
      let suff = 0,
        status = "under";
      if (planned === 0 || (L === 0 && U === 0)) {
        suff = 0;
        status = "under";
      } else if (planned < L) {
        suff = planned / L;
        status = "under";
      } else if (planned <= U) {
        suff = 1;
        status = "within";
      } else {
        suff = U / planned;
        status = "over";
      }
      byMuscle.push({
        muscle: m,
        plannedSets: planned,
        range: [L, U],
        sufficiency: +suff.toFixed(2),
        status,
      });
      if (planned > 0) {
        suffSum += suff;
        suffCount++;
      }
    });

    const program7 = {
      sufficiency: suffCount ? +(suffSum / suffCount).toFixed(2) : 0,
      byMuscle,
    };

    // ---------- PROGRAM30: COMPLETION + WEEKLY TREND (4x7 gün) ----------
    // Günlük map'ler
    const pMap = new Map(
      planned30.recordset.map((r) => [
        toLocalISO(r.date),
        Number(r.plannedSetsDay || 0),
      ])
    );
    const dMap = new Map(
      done30.recordset.map((r) => [
        toLocalISO(r.date),
        Number(r.doneSetsDay || 0),
      ])
    );

    let totalP = 0,
      totalD = 0;
    for (let i = 0; i < 30; i++) {
      const day = addDaysLocal(today, -i);
      totalP += pMap.get(day) || 0;
      totalD += dMap.get(day) || 0;
    }
    const program30 = {
      completion: totalP ? +(totalD / totalP).toFixed(2) : 0,
      weeklyTrend: [],
    };
    // 4 hafta (sondan başa)
    for (let w = 3; w >= 0; w--) {
      let p = 0,
        d = 0;
      for (let i = 0; i < 7; i++) {
        const day = addDaysLocal(today, -(w * 7 + i));
        p += pMap.get(day) || 0;
        d += dMap.get(day) || 0;
      }
      program30.weeklyTrend.push(p ? +(d / p).toFixed(2) : 0);
    }

    // ---------- EN ÇOK / EN AZ ÇALIŞAN KAS (7g, doneSets) ----------
    const present7 = MUSCLES.map((m) => ({
      muscle: m,
      doneSets: Number(done7Map[m] || 0),
    })).sort((a, b) => b.doneSets - a.doneSets);
    const topMuscle7 = present7[0] || { muscle: null, doneSets: 0 };
    const bottomMuscle7 = present7[present7.length - 1] || {
      muscle: null,
      doneSets: 0,
    };

    // ---------- EKSİK KALAN (7g) — planlanan alt sınırın altında olan (en düşük sufficiency) ----------
    const undertrained =
      byMuscle
        .filter((x) => x.status === "under")
        .map((x) => ({
          muscle: x.muscle,
          sufficiency: x.sufficiency,
          gapSets: Math.max(0, x.range[0] - x.plannedSets),
        }))
        .sort((a, b) => a.sufficiency - b.sufficiency)[0] || null;

    // ---------- STREAK (30g) — art arda gün (≥1 tamamlanan egzersiz olan gün) ----------
    const days30 = [];
    for (let i = 30; i >= 0; i--) {
      days30.push(addDaysLocal(today, -i));
    }
    const completedDays = new Set(
      done30.recordset
        .filter((r) => Number(r.doneSetsDay || 0) > 0)
        .map((r) => toLocalISO(r.date))
    );
    let best = 0,
      cur = 0;
    days30.forEach((d) => {
      if (completedDays.has(d)) {
        cur++;
        best = Math.max(best, cur);
      } else cur = 0;
    });
    const streak = { days: best };

    // ---------- Takvim 30g: full ve any completion gün oranları ----------
    const plannedDays = new Map(
      planned30.recordset.map((r) => [
        toLocalISO(r.date),
        Number(r.plannedSetsDay || 0),
      ])
    );
    let totalLogDays = 0,
      full = 0,
      any = 0;
    plannedDays.forEach((p, dayISO) => {
      if (p > 0) {
        totalLogDays++;
        const d = dMap.get(dayISO) || 0;
        if (d >= p && p > 0) full++;
        if (d > 0) any++;
      }
    });
    const calendar30 = {
      fullCompletionDayRate: totalLogDays
        ? +(full / totalLogDays).toFixed(2)
        : 0,
      anyCompletionDayRate: totalLogDays ? +(any / totalLogDays).toFixed(2) : 0,
    };

    // ---------- RESPONSE ----------
    res.json({
      periods: { p7: "last_7_days", p30: "last_30_days" },
      level,
      program7, // sadece "sufficiency" + kas bazında detay
      program30, // completion (30g) + weeklyTrend (4 hafta)
      topMuscle7, // {muscle, doneSets}
      bottomMuscle7, // {muscle, doneSets}
      undertrained7: undertrained, // {muscle, sufficiency, gapSets} | null
      streak, // {days}
      calendar30, // {fullCompletionDayRate, anyCompletionDayRate}
    });
  } catch (err) {
    console.error("GET /analysis ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
