const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

// Names of migration files that sequelize-cli hasn't applied yet
// (it records applied ones in the SequelizeMeta table).
async function pendingMigrations(sequelize) {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".js"))
    .sort();

  const tables = await sequelize.getQueryInterface().showAllTables();
  const hasMeta = tables.some((t) => String(t).toLowerCase() === "sequelizemeta");

  if (!hasMeta) return files;

  const [rows] = await sequelize.query("SELECT name FROM SequelizeMeta");
  const applied = new Set(rows.map((row) => row.name));

  return files.filter((file) => !applied.has(file));
}

module.exports = { pendingMigrations };
