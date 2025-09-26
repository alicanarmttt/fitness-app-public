// queries/analysis.js
const { sql, config } = require("../db");

const poolPromise = require("../db").poolPromise;

// ---- sabitler ----
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

/**
 * GET /analysis
 * @param {{ level: 'beginner'|'intermediate'|'advanced', debug?: boolean }} params
 * @returns {Promise<object>}
 */
async function getAnalysis({
  level = "intermediate",
  debug = false,
  userId,
} = {}) {
  // YENİ: Eğer userId gelmemişse, hata fırlatarak güvenliği sağlıyoruz.
  if (!userId) {
    throw new Error("User ID is required for analysis.");
  }
  const ranges = LEVEL_RANGES[level] || LEVEL_RANGES.intermediate;
  const today = todayLocalISO();
  const from7 = addDaysLocal(today, -7);
  const from30 = addDaysLocal(today, -30);

  const pool = await poolPromise;

  // 1) Haftalık plan (şablon) — kas bazında toplam set
  const plannedByMuscle = await pool.request().input("userId", sql.Int, userId)
    .query(`
    SELECT e.muscle, COALESCE(SUM(e.sets), 0) AS plannedSets
      FROM dbo.Exercise AS e
      INNER JOIN dbo.DayPrograms AS dp ON e.program_id = dp.id
      WHERE dp.user_id = @userId
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
    .input("userId", sql.Int, userId)
    .input("to", sql.Date, today).query(`
       SELECT wle.muscle,
             COALESCE(SUM(CASE WHEN wle.isCompleted = 1 THEN wle.sets ELSE 0 END), 0) AS doneSets
      FROM dbo.WorkoutLogExercise AS wle
      INNER JOIN dbo.WorkoutLog AS wl ON wle.workout_log_id = wl.id
      INNER JOIN dbo.DayPrograms AS dp ON wl.program_id = dp.id -- Sahiplik zinciri
      WHERE wl.[date] BETWEEN @from AND @to AND dp.user_id = @userId
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
    .input("userId", sql.Int, userId)
    .input("to", sql.Date, today).query(`
      SELECT wl.[date], COALESCE(SUM(wle.sets), 0) AS plannedSetsDay
      FROM dbo.WorkoutLog wl
      JOIN dbo.WorkoutLogExercise wle ON wle.workout_log_id = wl.id
      JOIN dbo.DayPrograms dp ON wl.program_id = dp.id
      WHERE wl.[date] BETWEEN @from AND @to AND dp.user_id = @userId
      GROUP BY wl.[date]
    `);

  const done30 = await pool
    .request()
    .input("from", sql.Date, from30)
    .input("userId", sql.Int, userId)
    .input("to", sql.Date, today).query(`
      SELECT wl.[date], COALESCE(SUM(CASE WHEN wle.isCompleted=1 THEN wle.sets ELSE 0 END), 0) AS doneSetsDay
      FROM dbo.WorkoutLog wl
      JOIN dbo.WorkoutLogExercise wle ON wle.workout_log_id = wl.id
      JOIN dbo.DayPrograms dp ON wl.program_id = dp.id
      WHERE wl.[date] BETWEEN @from AND @to AND dp.user_id = @userId
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

  // (opsiyonel) debugTrend
  let debugTrend;
  if (debug) {
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
  const scheduledDays = [];
  for (let i = 29; i >= 0; i--) {
    const day = addDaysLocal(today, -i);
    if ((pMap.get(day) || 0) > 0) scheduledDays.push(day);
  }
  const wasDone = (dayISO) => (dMap.get(dayISO) || 0) > 0;

  let bestStreak = 0,
    run = 0;
  for (const day of scheduledDays) {
    if (wasDone(day)) {
      run++;
      if (run > bestStreak) bestStreak = run;
    } else {
      run = 0;
    }
  }
  let currentStreak = 0;
  for (let i = scheduledDays.length - 1; i >= 0; i--) {
    const day = scheduledDays[i];
    if (wasDone(day)) currentStreak++;
    else break;
  }
  const totalScheduledSessions = scheduledDays.length;
  const totalCompletedSessions = scheduledDays.reduce(
    (acc, d) => acc + (wasDone(d) ? 1 : 0),
    0
  );
  const streak = {
    current: currentStreak,
    best: bestStreak,
    days: bestStreak, // geriye uyumluluk
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
    fullCompletionDayRate: totalLogDays ? +(full / totalLogDays).toFixed(2) : 0,
    anyCompletionDayRate: totalLogDays ? +(any / totalLogDays).toFixed(2) : 0,
  };

  // ---------- response ----------
  return {
    periods: { p7: "last_7_days", p30: "last_30_days" },
    level,
    program7,
    program30,
    topMuscle7,
    bottomMuscle7,
    undertrained7: undertrained,
    streak,
    calendar30,
    ...(debugTrend ? { debugTrend } : {}),
  };
}

module.exports = { getAnalysis };
