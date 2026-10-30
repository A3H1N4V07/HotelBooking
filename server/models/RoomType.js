module.exports = (sequelize, DataTypes) => {
  const RoomType = sequelize.define("RoomType", {
    hotelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    // Maximum guests in one room of this type.
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    // Rupees per night for one room.
    pricePerNight: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    // How many rooms of this type the hotel has.
    totalRooms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
  });

  RoomType.associate = (models) => {
    RoomType.belongsTo(models.Hotel, { foreignKey: "hotelId" });
    RoomType.hasMany(models.Booking, { foreignKey: "roomTypeId" });
  };

  return RoomType;
};
