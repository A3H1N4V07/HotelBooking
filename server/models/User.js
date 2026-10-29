module.exports = (sequelize, DataTypes) => {
  const phoneValidationRegex = /^[789]\d{9}$/;
  const User = sequelize.define("User", {
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    PhoneNo: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        // Custom validators must throw; returning false is ignored.
        isValidPhone(value) {
          if (value && !phoneValidationRegex.test(value)) {
            throw new Error("Phone number must be a 10-digit mobile number");
          }
        },
      },
    },
    EmailAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    role: {
      type: DataTypes.ENUM("user", "admin"),
      defaultValue: "user",
    },
  });

  User.associate = (models) => {
    User.hasMany(models.Booking, {
      foreignKey: "userId",
    });
  };

  return User;
};
