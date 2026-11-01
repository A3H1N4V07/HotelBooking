module.exports = (sequelize, DataTypes) => {
  const VoiceEvent = sequelize.define("VoiceEvent", {
    // local | ai | missed | offline
    handledBy: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    page: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Only for phrases the local rules missed, digits masked.
    phrase: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
  });

  return VoiceEvent;
};
