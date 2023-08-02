import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';
import { TimeFrame } from './time_frame.model';

export class DestinationRecommendedTime extends Model<InferAttributes<DestinationRecommendedTime>, InferCreationAttributes<DestinationRecommendedTime>> {
    destinationID!: ForeignKey<Destination['id']>;
    timeFrameID!: ForeignKey<TimeFrame['id']>;
    planCount!: number;
    visitCount!: number;
}

DestinationRecommendedTime.init({
    // Model attributes are defined here
    destinationID: {
        type: DataTypes.UUID,
        primaryKey: true,

    },
    timeFrameID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
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
    modelName: 'DestinationRecommendedTime' // We need to choose the model name
});