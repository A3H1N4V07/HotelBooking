"use strict";

// What a hotel actually sells: each room type has its own capacity, nightly
// price and number of rooms. Availability = totalRooms minus overlapping
// bookings of that room type.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("RoomTypes", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      hotelId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Hotels", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      name: { type: Sequelize.STRING, allowNull: false },
      capacity: { type: Sequelize.INTEGER, allowNull: false },
      pricePerNight: { type: Sequelize.INTEGER, allowNull: false },
      totalRooms: { type: Sequelize.INTEGER, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("RoomTypes", ["hotelId"], { name: "room_types_hotel_id" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("RoomTypes");
  },
};
