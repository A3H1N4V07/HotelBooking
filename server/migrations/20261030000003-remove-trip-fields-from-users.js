"use strict";

// Users carried trip details from the old one-form design. Trips now live on
// Bookings, and sign-up was sending placeholder values ("NA", "0") just to
// satisfy NOT NULL. PhoneNo becomes optional: sign-up doesn't ask for it and
// every account had the same hard-coded number.

const TRIP_COLUMNS = [
  "age",
  "Origin",
  "Destination",
  "travelDate",
  "checkInDate",
  "checkOutDate",
  "NoOfGuests",
];

module.exports = {
  async up(queryInterface, Sequelize) {
    // Some dev databases already lost these columns to the old
    // sync({ alter: true }), so only drop the ones that still exist.
    const existing = await queryInterface.describeTable("Users");

    for (const column of TRIP_COLUMNS) {
      if (existing[column]) {
        await queryInterface.removeColumn("Users", column);
      }
    }

    await queryInterface.changeColumn("Users", "PhoneNo", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Drop the placeholder number every sign-up was given.
    await queryInterface.bulkUpdate("Users", { PhoneNo: null }, { PhoneNo: "9876543210" });
  },

  // Restores the columns (as nullable); their old values are not recoverable.
  async down(queryInterface, Sequelize) {
    for (const column of TRIP_COLUMNS) {
      await queryInterface.addColumn("Users", column, {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },
};
