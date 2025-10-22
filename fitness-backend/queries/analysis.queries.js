// queries/analysis.js
const { sql, config } = require("../db");

const poolPromise = require("../db").poolPromise;

// ---- sabitler ----
const LEVEL_RANGES = {
  beginner: {
    chest: [12, 15],
    back: [12, 15], // DİKKAT: Sırt toplulaştırması nedeniyle burayı yükseltmen gerekecek.
    quads: [12, 15],
    hamstrings: [10, 12],
    shoulders: [8, 10],
    biceps: [8, 10],
    triceps: [8, 10],
    glutes: [8, 12],
    calves: [6, 10],
    abs: [3, 12],
  },
  intermediate: {
    chest: [12, 18],
    back: [12, 18], // DİKKAT: Sırt toplulaştırması nedeniyle burayı yükseltmen gerekecek.
    quads: [14, 18],
    hamstrings: [12, 16],
    shoulders: [10, 12],
    biceps: [10, 12],
    triceps: [10, 12],
    glutes: [10, 14],
    calves: [8, 12],
    abs: [6, 15],
  },
  advanced: {
    chest: [16, 20],
    back: [18, 24], // DİKKAT: Sırt toplulaştırması nedeniyle burayı yükseltmen gerekecek.
    quads: [16, 20],
    hamstrings: [14, 18],
    shoulders: [12, 18],
    biceps: [12, 15],
    triceps: [12, 14],
    glutes: [12, 16],
    calves: [10, 14],
    abs: [8, 18],
  },
};

// --- YENİ DEĞİŞİKLİK 1: ÇEKİRDEK KAS LİSTESİ ---
// Ana 'program7.sufficiency' yüzdesine dahil edilecek kaslar
const CORE_MUSCLE_GROUPS_FOR_AVG = [
  "chest",
  "back",
  "quads",
  "hamstrings",
  "shoulders",
  "biceps",
  "triceps",
  "glutes",
];
// ---------------------------------------------

const ALL_MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Quads",
  "Hamstrings",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Glutes",
  "Calves",
  "Abs",
  "Erector Spinae",
  "Lats",
  "Traps",
  "Anterior Deltoid",
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

  const pool = await poolPromise; // 1) Haftalık plandaki tüm egzersizleri ve kas etkilerini çek

  const plannedImpactQuery = await pool
    .request()
    .input("userId", sql.Int, userId).query(`
      SELECT 
        ex.sets,
        imp.muscle_group,
        imp.impact_multiplier
      FROM dbo.SampleExercises ex
      INNER JOIN dbo.SamplePrograms dp ON ex.program_id = dp.id
      INNER JOIN dbo.SampleMovement_Muscle_Impact imp ON ex.movement_id = imp.movement_id
      WHERE dp.user_id = @userId
    `); // 2) Planlanan Etki Puanlarını hesapla

  const plannedImpactMap = {};
  plannedImpactQuery.recordset.forEach((row) => {
    const muscle = row.muscle_group.toLowerCase();
    if (!plannedImpactMap[muscle]) {
      plannedImpactMap[muscle] = 0;
    }
    plannedImpactMap[muscle] += row.sets * row.impact_multiplier;
  });

  // 2.5) Yeterlilik Hesabı İçin Etki Puanlarını Topla (SIRT)
  // (Bu kod senin sağladığın "temiz" kodda zaten vardı, korundu)
  const aggregatedPlannedImpactMap = { ...plannedImpactMap }; // Orijinal map'in kopyasını al // Sırt Grubu Toplama

  const backSubMuscles = ["lats", "traps", "erector_spinae"];
  let totalBackImpact = aggregatedPlannedImpactMap["back"] || 0; // 'back' adında genel bir etki varsa onu da al

  backSubMuscles.forEach((subMuscle) => {
    if (aggregatedPlannedImpactMap[subMuscle]) {
      totalBackImpact += aggregatedPlannedImpactMap[subMuscle]; // ÖNEMLİ: Alt kası buradan siliyoruz.

      // (Yorumların korundu)
      delete aggregatedPlannedImpactMap[subMuscle];
    }
  });
  aggregatedPlannedImpactMap["back"] = totalBackImpact; // 3) Son 7 günde tamamlanan egzersizlerin kas etkilerini çek
  // TODO: Benzer bir mantığı 'shoulders' ve alt grupları (anterior_deltoid vb.) için yapabilirsin.

  const done7ImpactQuery = await pool
    .request()
    .input("from", sql.Date, from7)
    .input("to", sql.Date, today)
    .input("userId", sql.Int, userId).query(`
      SELECT
        wle.sets,
        imp.muscle_group,
        imp.impact_multiplier
      FROM dbo.SampleLogExercises wle
      INNER JOIN dbo.SampleLogs wl ON wle.workout_log_id = wl.id
      INNER JOIN dbo.SamplePrograms dp ON wl.program_id = dp.id
      INNER JOIN dbo.SampleExercises ex ON wle.exercise_id = ex.id
      INNER JOIN dbo.SampleMovement_Muscle_Impact imp ON ex.movement_id = imp.movement_id
      WHERE wle.isCompleted = 1 AND wl.[date] BETWEEN @from AND @to AND dp.user_id = @userId
    `); // 4) Tamamlanan Etki Puanlarını hesapla

  const done7ImpactMap = {};
  done7ImpactQuery.recordset.forEach((row) => {
    const muscle = row.muscle_group.toLowerCase();
    if (!done7ImpactMap[muscle]) {
      done7ImpactMap[muscle] = 0;
    }
    done7ImpactMap[muscle] += row.sets * row.impact_multiplier;
  }); // 5) Son 30 gün: günlük planlanan ve tamamlanan setler

  const planned30 = await pool
    .request()
    .input("from", sql.Date, from30)
    .input("userId", sql.Int, userId)
    .input("to", sql.Date, today).query(`
      SELECT wl.[date], COALESCE(SUM(wle.sets), 0) AS plannedSetsDay
      FROM dbo.SampleLogs wl
      JOIN dbo.SampleLogExercises wle ON wle.workout_log_id = wl.id
      JOIN dbo.SamplePrograms dp ON wl.program_id = dp.id
      WHERE wl.[date] BETWEEN @from AND @to AND dp.user_id = @userId
      GROUP BY wl.[date]
    `);

  const done30 = await pool
    .request()
    .input("from", sql.Date, from30)
    .input("userId", sql.Int, userId)
    .input("to", sql.Date, today).query(`
      SELECT wl.[date], COALESCE(SUM(CASE WHEN wle.isCompleted=1 THEN wle.sets ELSE 0 END), 0) AS doneSetsDay
      FROM dbo.SampleLogs wl
      JOIN dbo.SampleLogExercises wle ON wle.workout_log_id = wl.id
      JOIN dbo.SamplePrograms dp ON wl.program_id = dp.id
      WHERE wl.[date] BETWEEN @from AND @to AND dp.user_id = @userId
      GROUP BY wl.[date]
    `); // ---------- Program7: Yeterlilik (Artık Etki Puanına Göre) ----------

  let suffSum = 0,
    suffCount = 0;
  const byMuscle = []; // LEVEL_RANGES'deki tüm kas grupları için hesaplama yap

  Object.keys(ranges).forEach((m) => {
    // Toplulaştırılmış map'i kullanıyoruz
    const planned = Number(aggregatedPlannedImpactMap[m] || 0);
    const [L, U] = ranges[m] || [0, 0];
    let suff = 0,
      status = "under";

    if (planned === 0 && L > 0) {
      suff = 0;
      status = "under";
    } else if (planned < L) {
      suff = planned / L;
      status = "under";
    } else if (planned <= U) {
      suff = 1;
      status = "within";
    } else {
      // planned > U
      // YENİ (Azaltılmış Ceza - Karekök):
      suff = Math.sqrt(U / planned);
      status = "over";
    }

    // 'abs' ve 'calves' dahil TÜM kaslar listeye eklenir
    byMuscle.push({
      muscle: m,
      plannedImpact: +planned.toFixed(2),
      range: [L, U],
      sufficiency: +suff.toFixed(2),
      status,
    });

    // --- YENİ DEĞİŞİKLİK 2: SEÇİCİ ORTALAMA ---
    // Sadece 'CORE_MUSCLE_GROUPS_FOR_AVG' listesindekileri genel ortalamaya kat
    if (CORE_MUSCLE_GROUPS_FOR_AVG.includes(m)) {
      suffSum += suff;
      suffCount++;
    }
    // ESKİ KOD: if (L > 0) { ... }
    // ------------------------------------------
  });

  const program7 = {
    // 'suffCount' sıfır değilse ortalamayı al
    sufficiency: suffCount ? +(suffSum / suffCount).toFixed(2) : 0,
    byMuscle,
  }; // ---------- 30g plan/done map'leri ----------

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
  ); // ---------- Program30: completion + weeklyTrend ----------

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
  }; // 4 hafta (eski→yeni)

  for (let w = 3; w >= 0; w--) {
    let p = 0,
      d = 0;
    for (let i = 0; i < 7; i++) {
      const day = addDaysLocal(today, -(w * 7 + i));
      p += pMap.get(day) || 0;
      d += dMap.get(day) || 0;
    }
    program30.weeklyTrend.push(p ? +(d / p).toFixed(2) : 0);
  } // (opsiyonel) debugTrend

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
  } // ---------- STREAK (30g) — planlı seans bazlı ----------

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
  }; // ---------- En çok / En az çalışan kas (7 gün, Etki Puanına Göre) ----------

  const present7 = ALL_MUSCLE_GROUPS.map((m) => ({
    muscle: m,
    doneImpact: +(done7ImpactMap[m.toLowerCase()] || 0).toFixed(2),
  })).sort((a, b) => b.doneImpact - a.doneImpact);

  const topMuscle7 = present7[0] || { muscle: null, doneImpact: 0 };
  const bottomMuscle7 = present7.filter((m) => m.doneImpact > 0).pop() || {
    muscle: null,
    doneImpact: 0,
  }; // ---------- Eksik kalan kas (7g) ----------

  const undertrained =
    byMuscle
      // --- YENİ DEĞİŞİKLİK 3: ÇEKİRDEK FİLTRESİ ---
      // Sadece çekirdek kaslardaki 'under' durumuna bak
      .filter(
        (x) =>
          x.status === "under" && CORE_MUSCLE_GROUPS_FOR_AVG.includes(x.muscle)
      )
      // ------------------------------------------
      .map((x) => ({
        muscle: x.muscle,
        sufficiency: x.sufficiency,
        gapSets: Math.max(0, x.range[0] - x.plannedImpact), // Bu aslında 'gapImpact'tır
      }))
      .sort((a, b) => a.sufficiency - b.sufficiency)[0] || null; // ---------- Takvim 30g oranları ----------

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
  }; // ---------- response ----------

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
