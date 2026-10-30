module.exports = (sequelize, DataTypes) => {
  const Landmark = sequelize.define("Landmark", {
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("beach", "centre", "airport", "station", "attraction"),
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: false,
    },
  });

  return Landmark;
};
