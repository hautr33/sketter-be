import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { Status } from '../utils/constant';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';
import AppError from '../utils/app_error';
import { StatusCodes } from 'http-status-codes';
import { VoucherDetail } from './voucher_detail.model';

export class Voucher extends Model<InferAttributes<Voucher>, InferCreationAttributes<Voucher>> {
    declare id?: string;
    destinationID!: ForeignKey<Destination['id']>;
    name!: string;
    image!: string;
    description!: string;
    quantity!: number;
    totalSold?: number;
    totalUsed?: number;
    value!: number;
    salePrice!: number;
    refundRate!: number;
    discountPercent!: number;
    fromDate!: Date;
    toDate!: Date;
    commissionRate?: number;
    status?: string;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;
}

Voucher.init({
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
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập tên khuyến mãi' },
            notEmpty: { msg: 'Vui lòng nhập tên khuyến mãi' },
            len: { msg: 'Tên khuyến mãi phải có từ 2 đến 100 ký tự', args: [2, 100] }
        }
    },
    image: {
        type: DataTypes.STRING
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập mô tả về khuyến mãi' },
            notEmpty: { msg: 'Vui lòng nhập mô tả về khuyến mãi' },
            len: { msg: 'Mô tả về khuyến mãi không quá 500 ký tự', args: [0, 500] }
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập số lượng khuyến mãi' },
            isInt: { msg: 'Số lượng khuyến mãi không hợp lệ' },
            min: { msg: 'Số lượng khuyến mãi phải từ 1 đến 99999', args: [1] },
            max: { msg: 'Số lượng khuyến mãi phải từ 1 đến 99999', args: [99999] }
        }
    },
    totalSold: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    totalUsed: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    salePrice: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập giá bán' },
            isInt: { msg: 'Giá bán không hợp lệ' },
            min: { msg: 'Giá bán phải từ 1.000 đồng đến 99.999.000 đồng', args: [1] },
            max: { msg: 'Giá bán phải từ 1.000 đồng đến 99.999.000 đồng', args: [99999] }
        }
    },
    value: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập giá trị của voucher' },
            isInt: { msg: 'Giá trị của voucher không hợp lệ' },
            min: { msg: 'Giá trị của voucher phải từ 1.000 đồng đến 99.999.000 đồng', args: [1] },
            max: { msg: 'Giá trị của voucher phải từ 1.000 đồng đến 99.999.000 đồng', args: [99999] }
        }
    },
    refundRate: {
        type: DataTypes.INTEGER,
        defaultValue: 50,
        // allowNull: false,
        validate: {
            // notNull: { msg: 'Vui lòng nhập tỷ lệ hoàn tiền' },
            isInt: { msg: 'Tỷ lệ hoàn tiền không hợp lệ' },
            min: { msg: 'Tỷ lệ hoàn tiền có giá trị từ 50% đến 100%', args: [50] },
            max: { msg: 'Tỷ lệ hoàn tiền có giá trị từ 50% đến 100%', args: [100] }
        }
    },
    discountPercent: {
        type: DataTypes.INTEGER
    },
    fromDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng chọn ngày bắt đầu' },
            notEmpty: { msg: 'Vui lòng chọn ngày bắt đầu' }
        }
    },
    toDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng chọn ngày kết thúc' },
            notEmpty: { msg: 'Vui lòng chọn ngày kết thúc' }
        }
    },
    commissionRate: {
        type: DataTypes.INTEGER,
        defaultValue: 5
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: Status.draft,
        validate: {
            isIn: {
                args: [[Status.draft, Status.activated, Status.stop, Status.soldOut, Status.expired]],
                msg: 'Trạng thái không hợp lệ'
            }
        }
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: Date.now()
    },
    updatedAt: {
        type: DataTypes.DATE,
    },
}, {
    // Other model options go here
    timestamps: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Voucher' // We need to choose the model name
});

Destination.hasMany(Voucher, { foreignKey: "destinationID", as: 'destinationApply' });
Voucher.belongsTo(Destination, { foreignKey: 'destinationID', as: 'destinationApply' })

Destination.hasMany(Voucher, { foreignKey: "destinationID", as: 'vouchers' });
Voucher.belongsTo(Destination, { foreignKey: 'destinationID', as: 'vouchers' })

Voucher.hasMany(VoucherDetail, { foreignKey: "voucherID", as: 'details' });
VoucherDetail.belongsTo(Voucher, { foreignKey: 'voucherID', as: 'details' });

Voucher.hasMany(VoucherDetail, { foreignKey: "voucherID", as: 'voucherInfo' });
VoucherDetail.belongsTo(Voucher, { foreignKey: 'voucherID', as: 'voucherInfo' });

Voucher.beforeSave(async (voucher) => {
    const { value, salePrice, fromDate, toDate
    } = voucher;
    if (value < salePrice)
        throw new AppError('Giá bán phải thấp hơn giá trị của khuyến mãi', StatusCodes.BAD_REQUEST)


    if (toDate < fromDate)
        throw new AppError('Ngày kết thúc không được trước ngày bắt đầu', StatusCodes.BAD_REQUEST)

    voucher.discountPercent = 100 - Math.round((salePrice / value) * 100)
})