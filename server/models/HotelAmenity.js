const { AMENITY_CODES } = require("../config/amenities");

module.exports = (sequelize, DataTypes) => {
  const HotelAmenity = sequelize.define(
    "HotelAmenity",
    {
      hotelId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(40),
        allowNull: false,
        primaryKey: true,
        validate: { isIn: [AMENITY_CODES] },
      },
    },
    { timestamps: false }
  );

  HotelAmenity.associate = (models) => {
    HotelAmenity.belongsTo(models.Hotel, { foreignKey: "hotelId" });
  };

  return HotelAmenity;
};
