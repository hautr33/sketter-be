import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { User } from './user.model';

export class Session extends Model<InferAttributes<Session>, InferCreationAttributes<Session>> {
    declare id?: string;
    userID!: ForeignKey<User['id']>;
    iat!: number;
    exp!: number;
}

Session.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    userID: {
        type: DataTypes.UUID
    },
    iat: {
        type: DataTypes.INTEGER
    },
    exp: {
        type: DataTypes.INTEGER
    }
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Session' // We need to choose the model name
});