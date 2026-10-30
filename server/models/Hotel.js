module.exports = (sequelize, DataTypes) => {
  const Hotel = sequelize.define("Hotel", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    state: {
      type: DataTypes.STRING,
    },

    address: {
      type: DataTypes.TEXT,
    },

    description: {
      type: DataTypes.TEXT,
    },

    // "From" price shown in listings: the cheapest room type per night.
    price: {
      type: DataTypes.INTEGER,
    },

    rating: {
      type: DataTypes.FLOAT,
    },

    image: {
      type: DataTypes.TEXT,
    },

    phone: {
      type: DataTypes.STRING,
    },

    category: {
      type: DataTypes.STRING,
      defaultValue: "Budget",
    },

    latitude: {
      type: DataTypes.DECIMAL(9, 6),
    },

    longitude: {
      type: DataTypes.DECIMAL(9, 6),
    },
  });

  Hotel.associate = (models) => {
    Hotel.hasMany(models.RoomType, { foreignKey: "hotelId" });
    Hotel.hasMany(models.HotelAmenity, { foreignKey: "hotelId" });
  };

  return Hotel;
};