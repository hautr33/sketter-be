import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Status } from '../utils/constant';
import sequelize from '../db/sequelize.db';
import { User } from './user.model';
import { Voucher } from './voucher.model';

export class VoucherDetail extends Model<InferAttributes<VoucherDetail>, InferCreationAttributes<VoucherDetail>> {
    declare id?: string;
    voucherID!: ForeignKey<Voucher['id']>;
    travelerID?: ForeignKey<User['id']> | null;
    code!: string;
    price!: number;
    refundRate!: number;
    commissionRate!: number;
    finalPrice?: number;
    status?: string;
    readonly soldAt?: Date;
    readonly usedAt?: Date| null;
}

VoucherDetail.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    voucherID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    travelerID: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    price: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    refundRate: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    commissionRate: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    finalPrice: {
        type: DataTypes.FLOAT,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: Status.inStock,
        validate: {
            isIn: {
                args: [[Status.inStock, Status.paying, Status.sold, 'Pending', 'Used', 'Refunded']],
                msg: 'Trạng thái không hợp lệ'
            }
        }
    },
    soldAt: {
        type: DataTypes.DATE,
    },
    usedAt: {
        type: DataTypes.DATE,
    },
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'VoucherDetail' // We need to choose the model name
});


User.hasMany(VoucherDetail, { foreignKey: "travelerID", as: 'travelerInfo' });
VoucherDetail.belongsTo(User, { foreignKey: 'travelerID', as: 'travelerInfo' })