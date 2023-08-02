import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';
import { User } from './user.model';

export class DestinationBookmark extends Model<InferAttributes<DestinationBookmark>, InferCreationAttributes<DestinationBookmark>> {
    destinationID!: ForeignKey<Destination['id']>;
    travelerID!: ForeignKey<User['id']>;
    isBookmark!: boolean
}

DestinationBookmark.init({
    // Model attributes are defined here
    destinationID: {
        type: DataTypes.UUID,
        primaryKey: true
    },
    travelerID: {
        type: DataTypes.UUID,
        primaryKey: true
    },
    isBookmark: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'DestinationBookmark' // We need to choose the model name
});

User.hasMany(DestinationBookmark, { foreignKey: "travelerID"});
DestinationBookmark.belongsTo(User, { foreignKey: 'travelerID'})

Destination.hasMany(DestinationBookmark, { foreignKey: "destinationID"});
DestinationBookmark.belongsTo(Destination, { foreignKey: 'destinationID'})