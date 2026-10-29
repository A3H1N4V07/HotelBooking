"use strict";

// Baseline schema, as it existed when the project switched from
// sequelize.sync({ alter: true }) to migrations.
//
// Databases created by the old sync() already have these tables, so each
// table is only created when it's missing. A fresh database gets the full
// schema; an existing one is left as-is for the following migrations.

async function tableExists(queryInterface, name) {
  const tables = await queryInterface.showAllTables();
  return tables.map((t) => String(t).toLowerCase()).includes(name.toLowerCase());
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamps = {
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    };

    if (!(await tableExists(queryInterface, "Users"))) {
      await queryInterface.createTable("Users", {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        firstName: { type: Sequelize.STRING, allowNull: false },
        lastName: { type: Sequelize.STRING, allowNull: false },
        age: { type: Sequelize.STRING, allowNull: false },
        Origin: { type: Sequelize.STRING, allowNull: false },
        Destination: { type: Sequelize.STRING, allowNull: false },
        travelDate: { type: Sequelize.STRING, allowNull: false },
        checkInDate: { type: Sequelize.STRING, allowNull: false },
        checkOutDate: { type: Sequelize.STRING, allowNull: false },
        NoOfGuests: { type: Sequelize.STRING, allowNull: false },
        PhoneNo: { type: Sequelize.STRING, allowNull: false },
        EmailAddress: { type: Sequelize.STRING, allowNull: false, unique: true },
        password: { type: Sequelize.STRING, allowNull: false },
        role: { type: Sequelize.ENUM("user", "admin"), defaultValue: "user" },
        ...timestamps,
      });
    }

    if (!(await tableExists(queryInterface, "Hotels"))) {
      await queryInterface.createTable("Hotels", {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        name: { type: Sequelize.STRING, allowNull: false },
        city: { type: Sequelize.STRING, allowNull: false },
        state: { type: Sequelize.STRING },
        address: { type: Sequelize.TEXT },
        description: { type: Sequelize.TEXT },
        price: { type: Sequelize.INTEGER },
        rating: { type: Sequelize.FLOAT },
        image: { type: Sequelize.TEXT },
        phone: { type: Sequelize.STRING },
        category: { type: Sequelize.STRING, defaultValue: "Budget" },
        ...timestamps,
      });
    }

    if (!(await tableExists(queryInterface, "Bookings"))) {
      await queryInterface.createTable("Bookings", {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        hotelId: { type: Sequelize.STRING, allowNull: false },
        hotelName: { type: Sequelize.STRING, allowNull: false },
        hotelImage: { type: Sequelize.TEXT },
        location: { type: Sequelize.STRING, allowNull: false },
        userId: {
          type: Sequelize.INTEGER,
          references: { model: "Users", key: "id" },
          onDelete: "SET NULL",
          onUpdate: "CASCADE",
        },
        checkInDate: { type: Sequelize.STRING, allowNull: false },
        checkOutDate: { type: Sequelize.STRING, allowNull: false },
        guests: { type: Sequelize.INTEGER, allowNull: false },
        amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        bookingStatus: {
          type: Sequelize.ENUM("Pending", "Confirmed", "Cancelled"),
          defaultValue: "Pending",
        },
        paymentStatus: {
          type: Sequelize.ENUM("Pending", "Paid", "Failed"),
          defaultValue: "Pending",
        },
        guestName: { type: Sequelize.STRING },
        guestPhone: { type: Sequelize.STRING },
        ...timestamps,
      });
    }

    if (!(await tableExists(queryInterface, "Payments"))) {
      await queryInterface.createTable("Payments", {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        bookingId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "Bookings", key: "id" },
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        },
        stripePaymentId: { type: Sequelize.STRING, allowNull: false },
        amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        currency: { type: Sequelize.STRING, defaultValue: "inr" },
        status: {
          type: Sequelize.ENUM("Pending", "Succeeded", "Failed", "Refunded"),
          defaultValue: "Succeeded",
        },
        paymentMethod: { type: Sequelize.STRING },
        ...timestamps,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Payments");
    await queryInterface.dropTable("Bookings");
    await queryInterface.dropTable("Hotels");
    await queryInterface.dropTable("Users");
  },
};
