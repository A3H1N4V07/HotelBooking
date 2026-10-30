"use strict";

// Bookings get real DATE columns (needed for overlap/availability checks),
// an optional room type, and a hold expiry for unpaid bookings.
//
// Existing dates are converted only when they are unambiguous YYYY-MM-DD.
// Older rows from before date validation ("", "06/09/2026") become NULL
// rather than guessed; each one is logged with its original text.
// Bookings created by the app always have validated dates.

const DATE_COLUMNS = ["checkInDate", "checkOutDate"];
const ISO_DATE = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$";

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;

    const unconvertible = await sequelize.query(
      `SELECT id, checkInDate, checkOutDate FROM Bookings
       WHERE checkInDate NOT REGEXP :iso OR checkOutDate NOT REGEXP :iso`,
      { replacements: { iso: ISO_DATE }, type: sequelize.QueryTypes.SELECT }
    );

    for (const row of unconvertible) {
      console.warn(
        `Booking ${row.id}: dates "${row.checkInDate}" / "${row.checkOutDate}" are not YYYY-MM-DD; set to NULL`
      );
    }

    for (const column of DATE_COLUMNS) {
      const temp = `${column}New`;

      await queryInterface.addColumn("Bookings", temp, { type: Sequelize.DATEONLY, allowNull: true });
      await sequelize.query(
        `UPDATE Bookings SET ${temp} = STR_TO_DATE(${column}, '%Y-%m-%d') WHERE ${column} REGEXP :iso`,
        { replacements: { iso: ISO_DATE } }
      );
      await queryInterface.removeColumn("Bookings", column);
      await queryInterface.renameColumn("Bookings", temp, column);
    }

    await queryInterface.addColumn("Bookings", "roomTypeId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "RoomTypes", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    // An unpaid booking holds its room only until this time.
    await queryInterface.addColumn("Bookings", "holdExpiresAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addIndex("Bookings", ["roomTypeId", "checkInDate", "checkOutDate"], {
      name: "bookings_room_type_dates",
    });
  },

  async down(queryInterface, Sequelize) {
    // MySQL uses bookings_room_type_dates for the roomTypeId foreign key, so
    // the column (and its FK) must go before the index can be dropped.
    await queryInterface.removeColumn("Bookings", "holdExpiresAt");
    await queryInterface.removeColumn("Bookings", "roomTypeId");
    await queryInterface.removeIndex("Bookings", "bookings_room_type_dates");

    // Back to text; NULL dates become "" as they were before.
    for (const column of DATE_COLUMNS) {
      await queryInterface.changeColumn("Bookings", column, { type: Sequelize.STRING, allowNull: true });
      await queryInterface.sequelize.query(`UPDATE Bookings SET ${column} = '' WHERE ${column} IS NULL`);
      await queryInterface.changeColumn("Bookings", column, { type: Sequelize.STRING, allowNull: false });
    }
  },
};
