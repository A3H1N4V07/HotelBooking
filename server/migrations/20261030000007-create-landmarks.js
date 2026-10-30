"use strict";

// Reference points per city (beaches, city centre, airport, station, sights)
// that hotel distances are measured against.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Landmarks", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      city: { type: Sequelize.STRING, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      type: {
        type: Sequelize.ENUM("beach", "centre", "airport", "station", "attraction"),
        allowNull: false,
      },
      latitude: { type: Sequelize.DECIMAL(9, 6), allowNull: false },
      longitude: { type: Sequelize.DECIMAL(9, 6), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("Landmarks", ["city", "name"], {
      unique: true,
      name: "landmarks_city_name_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Landmarks");
  },
};
