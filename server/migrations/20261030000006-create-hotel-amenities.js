"use strict";

// One row per (hotel, amenity). Codes come from config/amenities.js; the
// table stores only the code so labels can change without a migration.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("HotelAmenities", {
      hotelId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: "Hotels", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      code: {
        type: Sequelize.STRING(40),
        allowNull: false,
        primaryKey: true,
      },
    });

    // "Hotels with a pool" looks up by code first.
    await queryInterface.addIndex("HotelAmenities", ["code"], {
      name: "hotel_amenities_code",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("HotelAmenities");
  },
};
