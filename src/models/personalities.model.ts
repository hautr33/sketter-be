import { DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';

export class Personalities extends Model<InferAttributes<Personalities>, InferCreationAttributes<Personalities>> {
    declare name: string;
}

Personalities.init({
    // Model attributes are defined here
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Personalities' // We need to choose the model name
});