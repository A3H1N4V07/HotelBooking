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
    }
  });

  return Hotel;
};