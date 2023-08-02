import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';
import { Personalities } from './personalities.model';

export class DestinationPersonalites extends Model<InferAttributes<DestinationPersonalites>, InferCreationAttributes<DestinationPersonalites>> {
    destinationID!: ForeignKey<Destination['id']>;
    personality!: ForeignKey<Personalities['name']>;
    planCount!: number;
    visitCount!: number;
}


DestinationPersonalites.init({
    // Model attributes are defined here
    destinationID: {
        type: DataTypes.UUID,
        primaryKey: true
    },
    personality: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    planCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    visitCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    }
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'DestinationPersonalites' // We need to choose the model name
});