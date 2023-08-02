import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';

export class TimeFrame extends Model<InferAttributes<TimeFrame>, InferCreationAttributes<TimeFrame>> {
    declare id: number;
    declare from: string;
    declare to: string;
}

TimeFrame.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    from: {
        type: DataTypes.STRING(5),
    },
    to: {
        type: DataTypes.STRING(5),
    }
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'TimeFrame' // We need to choose the model name
});