module.exports = (sequelize, DataTypes) => {

    const Payment = sequelize.define('Payment', {

        bookingId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        stripePaymentId: {
            type: DataTypes.STRING,
            allowNull: false
        },

        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },

        currency: {
            type: DataTypes.STRING,
            defaultValue: 'usd'
        },

        status: {
            type: DataTypes.ENUM(
                'Pending',
                'Succeeded',
                'Failed',
                'Refunded'
            ),
            defaultValue: 'Succeeded'
        },

        paymentMethod: {
            type: DataTypes.STRING,
            allowNull: true
        }

    });

    Payment.associate = (models) => {

        Payment.belongsTo(models.Booking, {
            foreignKey: 'bookingId'
        });

    };

    return Payment;
};