import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';

export class City extends Model<InferAttributes<City>, InferCreationAttributes<City>> {
    declare id: number;
    declare name: string;
}

City.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        unique: true
    }
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'City' // We need to choose the model name
});