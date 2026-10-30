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

        // "YYYY-MM-DD". NULL only on legacy rows from before date
        // validation; new bookings always get validated dates.
        checkInDate: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },

        checkOutDate: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },

        // NULL on bookings made before room types existed.
        roomTypeId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        // Unpaid bookings hold their room only until this time.
        holdExpiresAt: {
            type: DataTypes.DATE,
            allowNull: true
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

    Booking.belongsTo(models.RoomType, {
        foreignKey: 'roomTypeId'
    });

};

    return Booking;
};