/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. SampleUsers Tablosu
  await knex.schema.createTable("SampleUsers", function (table) {
    table.increments("id").primary();
    table.string("email", 255).notNullable().unique();
    table.string("passwordHash", 255).notNullable();
    table.datetime("createdAt").notNullable().defaultTo(knex.fn.now());
  });

  // 2. SamplePrograms Tablosu
  await knex.schema.createTable("SamplePrograms", function (table) {
    table.increments("id").primary();
    table.string("day", 20).notNullable();
    table.boolean("isLocked").notNullable().defaultTo(false);

    table
      .integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("SampleUsers") // Değişti
      .onDelete("CASCADE");
  });

  // 3. SampleExercises Tablosu
  await knex.schema.createTable("SampleExercises", function (table) {
    table.increments("id").primary();
    table.string("name", 50).notNullable();
    table.integer("sets").notNullable();
    table.integer("reps").notNullable();
    table.string("muscle", 30);
    table.boolean("isCompleted");

    table
      .integer("program_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("SamplePrograms") // Değişti
      .onDelete("CASCADE");
  });

  // 4. SampleLogs Tablosu
  await knex.schema.createTable("SampleLogs", function (table) {
    table.increments("id").primary();
    table.date("date").notNullable();

    table
      .integer("program_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("SamplePrograms") // Değişti
      .onDelete("CASCADE");
  });

  // 5. SampleLogExercises Tablosu
  await knex.schema.createTable("SampleLogExercises", function (table) {
    table.increments("id").primary();
    table.string("exercise_name", 50).notNullable();
    table.integer("sets");
    table.integer("reps");
    table.string("muscle", 30);
    table.boolean("isCompleted");
    table.integer("exercise_id");

    table
      .integer("workout_log_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("SampleLogs") // Değişti
      .onDelete("CASCADE");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Tabloları, oluşturma sırasının tam tersi bir sırayla siliyoruz.
  await knex.schema.dropTableIfExists("SampleLogExercises");
  await knex.schema.dropTableIfExists("SampleLogs");
  await knex.schema.dropTableIfExists("SampleExercises");
  await knex.schema.dropTableIfExists("SamplePrograms");
  await knex.schema.dropTableIfExists("SampleUsers");
};
