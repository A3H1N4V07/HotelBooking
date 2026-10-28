module.exports = (sequelize, DataTypes) => {
    const Booking = sequelize.define('Booking', {
        hotelId: {
            type: DataTypes.STRING,
            allowNull: false
        },

        hotelName: {
            type: DataTypes.STRING,
            allowNull: false
        },

        hotelImage: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        location: {
            type: DataTypes.STRING,
            allowNull: false
        },

        userId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        checkInDate: {
            type: DataTypes.STRING,
            allowNull: false
        },

        checkOutDate: {
            type: DataTypes.STRING,
            allowNull: false
        },

        guests: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        amount: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: false
        },

        bookingStatus: {
            type: DataTypes.ENUM(
                'Pending',
                'Confirmed',
                'Cancelled'
            ),
            defaultValue: 'Pending'
        },

        paymentStatus: {
            type: DataTypes.ENUM(
                'Pending',
                'Paid',
                'Failed'
            ),
            defaultValue: 'Pending'
        },

                guestName: {
            type: DataTypes.STRING,
            allowNull: true
        },

        guestPhone: {
            type: DataTypes.STRING,
            allowNull: true
        }
    });
    Booking.associate = (models) => {

    Booking.belongsTo(models.User, {
        foreignKey: 'userId'
    });

    Booking.hasMany(models.Payment, {
        foreignKey: 'bookingId'
    });

};

    return Booking;
};