module.exports = (sequelize, DataTypes) => {
  const Review = sequelize.define("Review", {
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    hotelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    comment: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  });

  Review.associate = (models) => {
    Review.belongsTo(models.Booking, { foreignKey: "bookingId" });
    Review.belongsTo(models.User, { foreignKey: "userId" });
    Review.belongsTo(models.Hotel, { foreignKey: "hotelId" });
  };

  return Review;
};
