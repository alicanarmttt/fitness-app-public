/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // 1. ADIM: Mevcut verileri temizle (çocuk tablodan başla)
  // Bu, 'seed' komutunu her çalıştırdığınızda verilerin kopyalanmasını önler.
  await knex("SampleMovement_Muscle_Impact").del();
  await knex("SampleMovements").del();

  // 2. ADIM: 'SampleMovements' tablosunu doldur
  // Bu, 'movements_data_plan.md' dosyasındaki listeyi temel alır.
  const movements = await knex("SampleMovements")
    .insert([
      { name: "Squat", primary_muscle_group: "Quads" },
      { name: "Sumo Deadlift", primary_muscle_group: "Glutes" },
      { name: "Romanian Deadlift", primary_muscle_group: "Hamstrings" },
      { name: "Stiff-Legged Deadlift", primary_muscle_group: "Glutes" },
      { name: "Bench Press", primary_muscle_group: "Chest" },
      { name: "Incline Bench Press", primary_muscle_group: "Chest" },
      { name: "Decline Bench Press", primary_muscle_group: "Chest" },
      { name: "Close-Grip Bench Press", primary_muscle_group: "Chest" },
      { name: "Overhead Press (OHP)", primary_muscle_group: "Shoulders" },
      { name: "Bent-Over Row", primary_muscle_group: "Erector Spinae" },
      { name: "Pull-up", primary_muscle_group: "Lats" },
      { name: "Leg Press", primary_muscle_group: "Quads" },
      { name: "Dips", primary_muscle_group: "Triceps" },
      { name: "Lunge", primary_muscle_group: "Quads" },
      { name: "Push-up", primary_muscle_group: "Chest" },
      { name: "Biceps Curl", primary_muscle_group: "Biceps" },
      { name: "Triceps Pushdown", primary_muscle_group: "Triceps" },
      { name: "Lateral Raise", primary_muscle_group: "Shoulders" },
      { name: "Front Raise", primary_muscle_group: "Shoulders" },
      { name: "Chest Fly", primary_muscle_group: "Chest" },
      { name: "Leg Extension", primary_muscle_group: "Quads" },
      { name: "Leg Curl", primary_muscle_group: "Hamstrings" },
      { name: "Seated Calf Raise", primary_muscle_group: "Calves" },
      { name: "Standing Calf Raise", primary_muscle_group: "Calves" },
      { name: "Cable Crunch / Sit-up", primary_muscle_group: "Abs" },
      { name: "Hyperextension", primary_muscle_group: "Erector Spinae" },
    ])
    .returning(["id", "name", "primary_muscle_group"]);

  // Yardımcı bir map oluşturarak hareket adından ID'ye kolayca ulaşalım.
  const movementMap = movements.reduce((map, mov) => {
    map[mov.name] = mov.id;
    return map;
  }, {});

  // 3. ADIM: 'SampleMovement_Muscle_Impact' tablosunu doldur
  // Bu, 'muscle_impact_plan.md' dosyasındaki birleştirilmiş listeyi temel alır.
  await knex("SampleMovement_Muscle_Impact").insert([
    // Ana Kas Etkileri (Her zaman 1.0)
    ...movements.map((mov) => ({
      movement_id: mov.id,
      muscle_group: mov.primary_muscle_group,
      impact_multiplier: 1.0,
    })),

    // İkincil Kas Etkileri (Sizin verdiğiniz liste)
    {
      movement_id: movementMap["Squat"],
      muscle_group: "Glutes",
      impact_multiplier: 0.8,
    },
    {
      movement_id: movementMap["Sumo Deadlift"],
      muscle_group: "Hamstrings",
      impact_multiplier: 0.8,
    },
    {
      movement_id: movementMap["Sumo Deadlift"],
      muscle_group: "Erector Spinae",
      impact_multiplier: 0.6,
    },
    {
      movement_id: movementMap["Sumo Deadlift"],
      muscle_group: "Traps",
      impact_multiplier: 0.5,
    },
    {
      movement_id: movementMap["Romanian Deadlift"],
      muscle_group: "Glutes",
      impact_multiplier: 0.8,
    },
    {
      movement_id: movementMap["Romanian Deadlift"],
      muscle_group: "Erector Spinae",
      impact_multiplier: 0.6,
    },
    {
      movement_id: movementMap["Romanian Deadlift"],
      muscle_group: "Traps",
      impact_multiplier: 0.5,
    },
    {
      movement_id: movementMap["Stiff-Legged Deadlift"],
      muscle_group: "Erector Spinae",
      impact_multiplier: 0.8,
    },
    {
      movement_id: movementMap["Stiff-Legged Deadlift"],
      muscle_group: "Hamstrings",
      impact_multiplier: 0.8,
    },
    {
      movement_id: movementMap["Stiff-Legged Deadlift"],
      muscle_group: "Traps",
      impact_multiplier: 0.5,
    },
    {
      movement_id: movementMap["Bench Press"],
      muscle_group: "Shoulders",
      impact_multiplier: 0.7,
    },
    {
      movement_id: movementMap["Bench Press"],
      muscle_group: "Triceps",
      impact_multiplier: 0.6,
    },
    {
      movement_id: movementMap["Incline Bench Press"],
      muscle_group: "Shoulders",
      impact_multiplier: 0.8,
    },
    {
      movement_id: movementMap["Incline Bench Press"],
      muscle_group: "Triceps",
      impact_multiplier: 0.7,
    },
    {
      movement_id: movementMap["Decline Bench Press"],
      muscle_group: "Triceps",
      impact_multiplier: 0.8,
    },
    {
      movement_id: movementMap["Decline Bench Press"],
      muscle_group: "Shoulders",
      impact_multiplier: 0.7,
    },
    {
      movement_id: movementMap["Close-Grip Bench Press"],
      muscle_group: "Triceps",
      impact_multiplier: 0.8,
    },
    {
      movement_id: movementMap["Close-Grip Bench Press"],
      muscle_group: "Shoulders",
      impact_multiplier: 0.8,
    },
    {
      movement_id: movementMap["Overhead Press (OHP)"],
      muscle_group: "Triceps",
      impact_multiplier: 0.6,
    },
    {
      movement_id: movementMap["Bent-Over Row"],
      muscle_group: "Lats",
      impact_multiplier: 0.8,
    },
    {
      movement_id: movementMap["Bent-Over Row"],
      muscle_group: "Shoulders",
      impact_multiplier: 0.5,
    },
    {
      movement_id: movementMap["Pull-up"],
      muscle_group: "Traps",
      impact_multiplier: 0.7,
    },
    {
      movement_id: movementMap["Leg Press"],
      muscle_group: "Glutes",
      impact_multiplier: 0.7,
    },
    {
      movement_id: movementMap["Dips"],
      muscle_group: "Chest",
      impact_multiplier: 0.7,
    },
    {
      movement_id: movementMap["Dips"],
      muscle_group: "Shoulders",
      impact_multiplier: 0.7,
    },
    {
      movement_id: movementMap["Lunge"],
      muscle_group: "Glutes",
      impact_multiplier: 0.8,
    },
    {
      movement_id: movementMap["Lunge"],
      muscle_group: "Hamstrings",
      impact_multiplier: 0.5,
    },
    {
      movement_id: movementMap["Push-up"],
      muscle_group: "Triceps",
      impact_multiplier: 0.8,
    },
    {
      movement_id: movementMap["Push-up"],
      muscle_group: "Shoulders",
      impact_multiplier: 0.8,
    },
  ]);
};
