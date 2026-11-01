module.exports = (sequelize, DataTypes) => {
  const PlaceCache = sequelize.define("PlaceCache", {
    key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    // JSON text; null means "looked up and nothing was found".
    data: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  return PlaceCache;
};
