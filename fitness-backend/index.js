const express = require("express");
const app = express();
const PORT = 5000;
const cors = require("cors");
const mssql = require("mssql");
const {
  toggleWorkoutLogExerciseCompleted,
  generateWorkoutLogs,
  listWorkoutLogs,
  listWorkoutLogExercises,
  deleteWorkoutLogsByProgram,
} = require("./queries/workoutlog");

const { sql, config } = require("./db"); // ← db.js dosyandan import
const {
  listPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
} = require("./queries/program");

app.use(cors());
// --- DEV TEST: GET ile generate (sadece geliştirme/test için)

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
    const data = await listPrograms();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//PROGRAM EKLE

app.post("/programs", async (req, res) => {
  const { day, isLocked, exercises } = req.body;
  try {
    const { day, isLocked, exercises } = req.body;

    // (opsiyonel) minik doğrulama: eksik alan varsa 400
    if (typeof day !== "string") {
      return res
        .status(400)
        .json({ error: "Field 'day' is required (string)." });
    }

    const created = await createProgram({ day, isLocked, exercises });
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /programs ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

//PROGRAMI GÜNCELLEME

app.put("/programs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { day, isLocked, exercises } = req.body;
  try {
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Param `id` must be integer." });
    }
    if (typeof day !== "string") {
      return res
        .status(400)
        .json({ error: "Field 'day' is required (string)." });
    }
    const updated = await updateProgram({ id, day, isLocked, exercises });
    res.json(updated);
  } catch (error) {
    console.error("PUT /programs/:id ERROR:", error); // <-- hata buraya basılır!
    res.status(500).json({ error: error.message });
  }
});

//PROGRAMI SİLME
app.delete("/programs/:id", async (req, res) => {
  const programId = parseInt(req.params.id);
  try {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Param 'id' must be integer." });
    }
    const out = await deleteProgram(id);
    res.json(out);
  } catch (error) {
    console.log("DELETE /programs/:id HATASI", error);
    res.status(500).json({ error: error.message });
  }
});

// EGZERSİZ TAMAMLANDI (WorkoutLogExercise üzerinde!)
app.patch("/workoutlog-exercise/:id/completed", async (req, res) => {
  try {
    const exerciseLogId = parseInt(req.params.id);
    if (!Number.isInteger(exerciseLogId)) {
      return res.status(400).json({ error: "Param 'id' must be integer." });
    }

    const out = await toggleWorkoutLogExerciseCompleted(exerciseLogId);
    res.json(out); // { id, isCompleted: true/false }
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

//WORKOUT LOG 30 GUNLUK OLUSTURMA
app.post("/workoutlog/generate", async (req, res) => {
  try {
    const { program_id, start_date, days } = req.body;

    // basit doğrulama
    if (!Number.isInteger(program_id)) {
      return res
        .status(400)
        .json({ error: "Field 'program_id' must be integer." });
    }
    if (!start_date || typeof start_date !== "string") {
      return res
        .status(400)
        .json({ error: "Field 'start_date' (YYYY-MM-DD) is required." });
    }
    if (!Number.isInteger(days) || days <= 0) {
      return res
        .status(400)
        .json({ error: "Field 'days' must be positive integer." });
    }

    const out = await generateWorkoutLogs({ program_id, start_date, days });
    res.json(out);
  } catch (err) {
    const status = err.status || 500;
    console.error("POST /workoutlog/generate ERROR:", err);
    res.status(status).json({ error: err.message });
  }
});

//tüm loglar
app.get("/workoutlog", async (req, res) => {
  try {
    const rows = await listWorkoutLogs();
    res.json(rows);
  } catch (err) {
    console.error("GET /workoutlog ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

//bir günün egzersiz logları

app.get("/workoutlog/:logId/exercises", async (req, res) => {
  try {
    const logId = parseInt(req.params.logId);
    if (!Number.isInteger(logId)) {
      return res.status(400).json({ error: "Param 'logId' must be integer." });
    }
    const rows = await listWorkoutLogExercises(logId);
    res.json(rows);
  } catch (err) {
    console.error("GET /workoutlog/:logId/exercises ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

//Programdaki değişiklikte logları sil
app.delete("/workoutlog/by-program/:programId", async (req, res) => {
  const programId = parseInt(req.params.programId);
  try {
    const programId = parseInt(req.params.programId);
    if (!Number.isInteger(programId)) {
      return res
        .status(400)
        .json({ error: "Param 'programId' must be integer." });
    }

    const out = await deleteWorkoutLogsByProgram(programId);
    res.json(out);
  } catch (err) {
    console.error("DELETE /workoutlog/by-program/:programId ERROR:", err);
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

// ---- helpers ----
function toLocalISO(dateLike) {
  const d = new Date(dateLike);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
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
    const pool = await globalPoolPromise;

    // 1) Haftalık plan (şablon) — kas bazında toplam set
    const plannedByMuscle = await pool.request().query(`
      SELECT e.muscle, COALESCE(SUM(e.sets),0) AS plannedSets
      FROM Exercise e
      GROUP BY e.muscle
    `);
    const plannedMap = {};
    plannedByMuscle.recordset.forEach((r) => {
      plannedMap[r.muscle] = Number(r.plannedSets || 0);
    });

    // 2) Son 7 günde tamamlanan setler (kas bazında)
    const done7 = await pool
      .request()
      .input("from", sql.Date, from7)
      .input("to", sql.Date, today).query(`
        SELECT wle.muscle,
               COALESCE(SUM(CASE WHEN wle.isCompleted = 1 THEN wle.sets ELSE 0 END), 0) AS doneSets
        FROM WorkoutLogExercise AS wle
        JOIN WorkoutLog AS wl ON wle.workout_log_id = wl.id
        WHERE wl.[date] BETWEEN @from AND @to
        GROUP BY wle.muscle
      `);
    const done7Map = {};
    done7.recordset.forEach((r) => {
      done7Map[r.muscle] = Number(r.doneSets || 0);
    });

    // 3) Son 30 gün: günlük planlanan ve tamamlanan setler
    const planned30 = await pool
      .request()
      .input("from", sql.Date, from30)
      .input("to", sql.Date, today).query(`
        SELECT wl.[date], COALESCE(SUM(wle.sets),0) AS plannedSetsDay
        FROM WorkoutLog wl
        JOIN WorkoutLogExercise wle ON wle.workout_log_id = wl.id
        WHERE wl.[date] BETWEEN @from AND @to
        GROUP BY wl.[date]
      `);

    const done30 = await pool
      .request()
      .input("from", sql.Date, from30)
      .input("to", sql.Date, today).query(`
        SELECT wl.[date], COALESCE(SUM(CASE WHEN wle.isCompleted=1 THEN wle.sets ELSE 0 END),0) AS doneSetsDay
        FROM WorkoutLog wl
        JOIN WorkoutLogExercise wle ON wle.workout_log_id = wl.id
        WHERE wl.[date] BETWEEN @from AND @to
        GROUP BY wl.[date]
      `);

    // ---------- Program7: Yeterlilik (planlanan sete göre; tamamlanmadan bağımsız) ----------
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

    // ---------- 30g plan/done map'leri ----------
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

    // ---------- Program30: completion + weeklyTrend ----------
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
    // 4 hafta (eski→yeni)
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
    //-TREND DEBUGGG
    let debugTrend;
    if (req.query.debug === "trend") {
      debugTrend = [];
      for (let w = 3; w >= 0; w--) {
        const days = [];
        let p = 0,
          d = 0;
        for (let i = 0; i < 7; i++) {
          const day = addDaysLocal(today, -(w * 7 + i));
          const pd = pMap.get(day) || 0;
          const dd = dMap.get(day) || 0;
          p += pd;
          d += dd;
          days.push({ day, planned: pd, done: dd });
        }
        debugTrend.push({
          weekIndexFromOld: w,
          planned: p,
          done: d,
          ratio: p ? +(d / p).toFixed(2) : 0,
          days,
        });
      }
    }

    // ---------- STREAK (30g) — planlı seans bazlı ----------
    // pMap: { dayISO -> plannedSetsDay }, dMap: { dayISO -> doneSetsDay } (yukarıda hazır)

    // 1) Son 30 günde planlı seans olan günleri sırala (en eski → en yeni)
    const scheduledDays = [];
    for (let i = 29; i >= 0; i--) {
      const day = addDaysLocal(today, -i);
      if ((pMap.get(day) || 0) > 0) {
        scheduledDays.push(day);
      }
    }

    // 2) Her planlı gün için "tamamlandı mı?" (o günde en az 1 set tamamlandıysa true)
    const wasDone = (dayISO) => (dMap.get(dayISO) || 0) > 0;

    // 3) bestStreak: planlı seanslar dizisinde en uzun ardışık "done" serisi
    let bestStreak = 0;
    let run = 0;
    for (const day of scheduledDays) {
      if (wasDone(day)) {
        run++;
        if (run > bestStreak) bestStreak = run;
      } else {
        run = 0;
      }
    }

    // 4) currentStreak: son planlı günden geriye doğru, ilk kaçırmaya kadar "done" say
    let currentStreak = 0;
    for (let i = scheduledDays.length - 1; i >= 0; i--) {
      const day = scheduledDays[i];
      if (wasDone(day)) currentStreak++;
      else break; // en sondaki planlı gün kaçırıldıysa currentStreak 0 olur
    }

    // 5) İstatistik amaçlı toplam planlı/tamamlanan seans sayısı (opsiyonel)
    const totalScheduledSessions = scheduledDays.length;
    const totalCompletedSessions = scheduledDays.reduce(
      (acc, d) => acc + (wasDone(d) ? 1 : 0),
      0
    );

    // response’ta:
    const streak = {
      current: currentStreak, // son planlı günden geriye ardışık tamamlanan seans sayısı
      best: bestStreak, // son 30 gündeki en uzun seri
      days: bestStreak, // geriye uyumluluk (istersen "days" i kaldırabilirsin)
      scheduledSessions: totalScheduledSessions,
      completedSessions: totalCompletedSessions,
    };

    // ---------- En çok / En az çalışan kas (7g) ----------
    const present7 = MUSCLES.map((m) => ({
      muscle: m,
      doneSets: Number(done7Map[m] || 0),
    })).sort((a, b) => b.doneSets - a.doneSets);
    const topMuscle7 = present7[0] || { muscle: null, doneSets: 0 };
    const bottomMuscle7 = present7[present7.length - 1] || {
      muscle: null,
      doneSets: 0,
    };

    // ---------- Eksik kalan kas (7g) ----------
    const undertrained =
      byMuscle
        .filter((x) => x.status === "under")
        .map((x) => ({
          muscle: x.muscle,
          sufficiency: x.sufficiency,
          gapSets: Math.max(0, x.range[0] - x.plannedSets),
        }))
        .sort((a, b) => a.sufficiency - b.sufficiency)[0] || null;

    // ---------- Takvim 30g oranları ----------
    let totalLogDays = 0,
      full = 0,
      any = 0;
    pMap.forEach((p, dayISO) => {
      if (p > 0) {
        totalLogDays++;
        const d = dMap.get(dayISO) || 0;
        if (d >= p) full++;
        if (d > 0) any++;
      }
    });
    const calendar30 = {
      fullCompletionDayRate: totalLogDays
        ? +(full / totalLogDays).toFixed(2)
        : 0,
      anyCompletionDayRate: totalLogDays ? +(any / totalLogDays).toFixed(2) : 0,
    };

    // ---------- response ----------
    res.json({
      periods: { p7: "last_7_days", p30: "last_30_days" },
      level,
      program7,
      program30,
      topMuscle7,
      bottomMuscle7,
      undertrained7: undertrained,
      streak, // { days, current, best }
      calendar30,
      ...(debugTrend ? { debugTrend } : {}),
    });
  } catch (err) {
    console.error("GET /analysis ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
