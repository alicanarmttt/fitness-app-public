/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Yeni Tabloları Oluştur
  await knex.schema.createTable("SampleMovements", function (table) {
    table.increments("id").primary();
    table.string("name", 255).notNullable().unique();
    table.string("primary_muscle_group", 50).notNullable();
  });

  await knex.schema.createTable(
    "SampleMovement_Muscle_Impact",
    function (table) {
      table
        .integer("movement_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("SampleMovements")
        .onDelete("CASCADE");
      table.string("muscle_group", 50).notNullable();
      table.decimal("impact_multiplier", 3, 2).notNullable();
      table.primary(["movement_id", "muscle_group"]);
    }
  );

  // --- GÜVENLİK ADIMI: UYUMSUZ ESKİ VERİLERİ TEMİZLE ---
  // SampleExercises tablosunu değiştirmeden önce, ona bağlı olan tüm alt verileri siliyoruz.
  // Bu, Foreign Key hatalarını önler.
  await knex("SampleLogExercises").del();
  await knex("SampleLogs").del();
  await knex("SampleExercises").del();

  // 3. Mevcut Tabloyu Güncelleme: SampleExercises
  // Artık SampleExercises tablosu boş olduğu için bu işlem güvenle çalışacaktır.
  await knex.schema.alterTable("SampleExercises", function (table) {
    // <-- Burası güncellendi
    table.dropColumn("name");
    table.dropColumn("muscle");

    table
      .integer("movement_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("SampleMovements") // <-- Burası güncellendi
      .onDelete("CASCADE");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Yukarıdaki işlemlerin tam tersini, ters sırada yapıyoruz.

  // 1. Önce 'SampleExercises' tablosunu eski haline getir
  await knex.schema.alterTable("SampleExercises", function (table) {
    // <-- Burası güncellendi
    // Önce bağlantıyı (FOREIGN KEY) kaldırıyoruz.
    table.dropForeign("movement_id");

    table.dropColumn("movement_id");
    table.string("name", 50).notNullable().defaultsTo("deleted");
    table.string("muscle", 30);
  });

  // 2. Yeni oluşturulan tabloları sil
  await knex.schema.dropTableIfExists("SampleMovement_Muscle_Impact");
  await knex.schema.dropTableIfExists("SampleMovements");
};
