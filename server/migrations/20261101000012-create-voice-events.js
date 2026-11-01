"use strict";

// One row per phrase the voice assistant handled: was it understood locally
// (free, instant), by the AI, or not at all. Shows how often the AI is
// really needed and which phrases to teach the local rules next.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("VoiceEvents", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      // local | ai | missed (AI couldn't tell) | offline (AI unavailable)
      handledBy: { type: Sequelize.STRING(10), allowNull: false },
      page: { type: Sequelize.STRING(20), allowNull: true },
      // What it was understood as, e.g. "details", "book", "BOOK_HOTEL".
      action: { type: Sequelize.STRING(40), allowNull: true },
      ms: { type: Sequelize.INTEGER, allowNull: true },
      // Only for phrases the local rules missed, digits masked.
      phrase: { type: Sequelize.STRING(200), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("VoiceEvents", ["createdAt"], { name: "voice_events_created_at" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("VoiceEvents");
  },
};
