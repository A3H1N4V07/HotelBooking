"use strict";

// Coordinates make distances ("0.4 km from the beach") a calculation
// instead of a claim in a description.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Hotels", "latitude", {
      type: Sequelize.DECIMAL(9, 6),
      allowNull: true,
    });

    await queryInterface.addColumn("Hotels", "longitude", {
      type: Sequelize.DECIMAL(9, 6),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Hotels", "longitude");
    await queryInterface.removeColumn("Hotels", "latitude");
  },
};
