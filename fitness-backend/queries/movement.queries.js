const { poolPromise, sql } = require("../db");

/**
 * 'Movements' tablosundaki tüm hareketleri listeler.
 * @returns {Promise<Array>} Hareketlerin bir dizisini döndürür.
 */

async function listMovements() {
  const pool = await poolPromise;
  const request = new sql.Request(pool);
  const result = await request.query(
    "SELECT id, name, primary_muscle_group FROM dbo.SampleMovements ORDER BY name ASC"
  );
  return result.recordset;
}

module.exports = {
  listMovements,
};
