"use strict";

// Cache for OpenStreetMap lookups (place -> coordinates, "restaurants near
// this hotel"). The public OSM services ask apps to cache results, and hotels
// don't move, so each lookup is fetched once and reused until it expires.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("PlaceCaches", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      key: { type: Sequelize.STRING(255), allowNull: false },
      data: { type: Sequelize.TEXT, allowNull: true }, // JSON; null = "looked up, nothing found"
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("PlaceCaches", ["key"], { unique: true, name: "place_caches_key_unique" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("PlaceCaches");
  },
};
