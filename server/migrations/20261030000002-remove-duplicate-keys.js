"use strict";

// Every restart under sync({ alter: true }) added another copy of the same
// unique index / foreign key: Users ended up with 20 unique indexes on
// EmailAddress (MySQL's limit is 64 per table) and Bookings/Payments with
// 82 identical foreign keys each. Keep exactly one of each, with a fixed name.

const FOREIGN_KEYS = [
  {
    table: "Bookings",
    column: "userId",
    name: "bookings_user_id_fk",
    references: { table: "Users", field: "id" },
    onDelete: "SET NULL",
  },
  {
    table: "Payments",
    column: "bookingId",
    name: "payments_booking_id_fk",
    references: { table: "Bookings", field: "id" },
    onDelete: "CASCADE",
  },
];

async function select(queryInterface, sql, replacements) {
  return queryInterface.sequelize.query(sql, {
    replacements,
    type: queryInterface.sequelize.QueryTypes.SELECT,
  });
}

module.exports = {
  async up(queryInterface) {
    // Unique indexes on Users.EmailAddress: keep one, drop the copies.
    const uniqueIndexes = await select(
      queryInterface,
      `SELECT DISTINCT INDEX_NAME AS name FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'users'
         AND COLUMN_NAME = 'EmailAddress' AND NON_UNIQUE = 0`
    );

    const names = uniqueIndexes.map((row) => row.name).sort();
    const keep = names.includes("EmailAddress") ? "EmailAddress" : names[0];

    for (const name of names) {
      if (name !== keep) {
        await queryInterface.removeIndex("Users", name);
      }
    }

    // Foreign keys: drop every copy, then add a single named one back.
    for (const fk of FOREIGN_KEYS) {
      const existing = await select(
        queryInterface,
        `SELECT DISTINCT CONSTRAINT_NAME AS name FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(:table)
           AND COLUMN_NAME = :column AND REFERENCED_TABLE_NAME IS NOT NULL`,
        { table: fk.table, column: fk.column }
      );

      for (const { name } of existing) {
        await queryInterface.removeConstraint(fk.table, name);
      }

      await queryInterface.addConstraint(fk.table, {
        fields: [fk.column],
        type: "foreign key",
        name: fk.name,
        references: fk.references,
        onDelete: fk.onDelete,
        onUpdate: "CASCADE",
      });
    }
  },

  // Nothing to undo: the duplicates were never intentional.
  async down() {},
};
