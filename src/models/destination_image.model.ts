import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';

export class DestinationImage extends Model<InferAttributes<DestinationImage>, InferCreationAttributes<DestinationImage>> {
    declare id?: string;
    destinationID!: ForeignKey<Destination['id']>;
    url!: string;
}

DestinationImage.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    destinationID: {
        type: DataTypes.UUID,
        allowNull: false
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng thêm ảnh vào địa điểm' },
            notEmpty: { msg: 'Vui lòng thêm ảnh vào địa điểm' },
            max: 200
        }
    },
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'DestinationImage' // We need to choose the model name
});