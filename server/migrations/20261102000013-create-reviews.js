"use strict";

// Guest reviews: one per booking, written from My Bookings once the stay has
// started. They feed the home page reviews and the "happy guests" stat.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Reviews", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      bookingId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "Bookings", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      hotelId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Hotels", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      // 1-5 stars.
      rating: { type: Sequelize.INTEGER, allowNull: false },
      comment: { type: Sequelize.STRING(500), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("Reviews", ["createdAt"], { name: "reviews_created_at" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Reviews");
  },
};
