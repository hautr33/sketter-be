import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';
import { Plan } from './plan.model';

export class PlanDestination extends Model<InferAttributes<PlanDestination>, InferCreationAttributes<PlanDestination>> {
    declare id?: string;
    planID!: ForeignKey<Plan['id']>;
    destinationID!: ForeignKey<Destination['id']>;
    date!: Date;
    fromTime!: Date;
    toTime!: Date;
    distance!: number;
    duration!: number;
    profile !: string;
    distanceText !: string;
    durationText !: string;
    status?: string;
    destinationName?: string;
    destinationImage?: string;
    rating?: number | null;
    description?: string;
    isPlan?: boolean;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
}

PlanDestination.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    planID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: { msg: 'Ngày không hợp lệ', args: true }
        }
    },
    destinationID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    fromTime: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    toTime: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    distance: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Khoảng cách đến địa điểm không được trống' },
            isInt: { msg: 'Khoảng cách đến địa điểm không hợp lệ' }
        }
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Thời gian di chuyển đến địa điểm không được trống' },
            isInt: { msg: 'Thời gian di chuyển đến địa điểm không hợp lệ' }
        }
    },
    profile: {
        type: DataTypes.STRING,
        defaultValue: 'driving'
    },
    distanceText: {
        type: DataTypes.STRING,
        allowNull: false
    },
    durationText: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'Planned',
        validate: {
            isIn: {
                args: [['Planned', 'Checked-in', 'New', 'Skipped']],
                msg: 'Trạng thái không hợp lệ'
            }
        }
    },
    destinationName: {
        type: DataTypes.STRING
    },
    destinationImage: {
        type: DataTypes.STRING
    },
    rating: {
        type: DataTypes.INTEGER,
        validate: {
            isInt: { msg: 'Số sao đánh giá không hợp lệ' },
            min: { msg: 'Bạn chỉ có thể đánh giá từ 1 đến 5 sao', args: [1] },
            max: { msg: 'Bạn chỉ có thể đánh giá từ 1 đến 5 sao', args: [5] },
        }
    },
    description: {
        type: DataTypes.TEXT,
        validate: {
            len: { msg: 'Mô tả trải nghiệm của bạn không quá 500 ký tự', args: [0, 500] }
        }
    },
    isPlan: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: Date.now(),
    },
}, {
    // Other model options go here
    timestamps: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'PlanDestination' // We need to choose the model name
});


Destination.hasMany(PlanDestination, { foreignKey: 'destinationID', as: 'destination' })
PlanDestination.belongsTo(Destination, { foreignKey: 'destinationID', as: 'destination' })
