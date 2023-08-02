import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';

export class Distance extends Model<InferAttributes<Distance>, InferCreationAttributes<Distance>> {
    declare id: string;
    fromDestination!: ForeignKey<Destination['id']>;
    toDestination!: ForeignKey<Destination['id']>;
    count?: number;
    profile!: string;
    distance !: number;
    duration !: number;
    distanceText !: string;
    durationText !: string;
}

Distance.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    fromDestination: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng chọn địa điểm bắt đầu' }
        }
    },
    toDestination: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng chọn địa điểm đến' }
        }
    },
    count: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    profile: {
        type: DataTypes.STRING,
        defaultValue: 'driving',
        validate: {
            isIn: {
                args: [['driving', 'walking', 'cycling']],
                msg: 'Phương tiện di chuyển không hợp lệ'
            }
        }
    },
    distance: {
        type: DataTypes.DOUBLE,
        allowNull: false,
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    distanceText: {
        type: DataTypes.STRING,
        allowNull: false
    },
    durationText: {
        type: DataTypes.STRING,
        allowNull: false
    },
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Distance' // We need to choose the model name
});

Destination.hasMany(Distance, { foreignKey: 'fromDestination' });
Destination.hasMany(Distance, { foreignKey: 'toDestination' });
Distance.belongsTo(Destination, { foreignKey: 'fromDestination' });
Distance.belongsTo(Destination, { foreignKey: 'toDestination' });
