import { DataTypes, ForeignKey, HasManyAddAssociationsMixin, HasManyCreateAssociationMixin, HasManyGetAssociationsMixin, HasManySetAssociationsMixin, InferAttributes, InferCreationAttributes, Model, Op } from 'sequelize';
import { Status } from '../utils/constant';
import sequelize from '../db/sequelize.db';
import { Catalog } from './catalog.model';
import { DestinationCatalog } from './destination_catalog.model';
import { Personalities } from './personalities.model';
import { User } from './user.model';
import { DestinationRecommendedTime } from './destination_recommended_time.model';
import { DestinationImage } from './destination_image.model';
import { DestinationPersonalites } from './destination_personalities.model';
import AppError from '../utils/app_error';
import { StatusCodes } from 'http-status-codes';
import { TimeFrame } from './time_frame.model';
import { City } from './city.model';

export class Destination extends Model<InferAttributes<Destination>, InferCreationAttributes<Destination>> {
    declare id?: string;
    name!: string;
    latinName?: string;
    address!: string;
    phone?: string;
    email?: string;
    description!: string;
    image!: string;
    longitude!: number;
    latitude!: number;
    lowestPrice!: number;
    highestPrice!: number;
    openingTime!: string;
    closingTime!: string;
    estimatedTimeStay!: number;
    status?: string;
    avgRating?: number;
    view?: number;
    totalRating?: number;
    isHaveVoucher?: boolean;
    cityID!: ForeignKey<City['id']>;
    supplierID?: ForeignKey<User['id']> | null;
    createdBy!: ForeignKey<User['id']>;

    readonly createdAt?: Date;
    readonly updatedAt?: Date;

    declare getCatalogs: HasManyGetAssociationsMixin<Catalog>;
    declare addCatalogs: HasManyAddAssociationsMixin<Catalog, string>;
    declare setCatalogs: HasManySetAssociationsMixin<Catalog, string>;

    declare addDestinationPersonalities: HasManyAddAssociationsMixin<Personalities, string>;
    declare setDestinationPersonalities: HasManySetAssociationsMixin<Personalities, string>;

    declare addRecommendedTimes: HasManyAddAssociationsMixin<TimeFrame, number>;
    declare setRecommendedTimes: HasManySetAssociationsMixin<TimeFrame, number>;

    declare getGallery: HasManyGetAssociationsMixin<DestinationImage>;
    declare createGallery: HasManyCreateAssociationMixin<DestinationImage, 'destinationID'>;
    destinationPersonalities?: any[];
    recommendedTimes?: any[];
    catalogs?: any[];
    isBookmarked?: boolean;
    vouchers?: any[];
    personalityCount?: number = 0;
    dateCount?: number = 0;
    point?: number = 0;
    timePoint?: number = 0;
    value?: number = 0;
    cost?: number = 0;
}

Destination.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập tên địa điểm' },
            notEmpty: { msg: 'Vui lòng nhập tên địa điểm' },
            len: { msg: 'Tên địa điểm phải có từ 2 đến 50 ký tự', args: [2, 50] }
        }
    },
    latinName: {
        type: DataTypes.STRING,
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập địa chỉ' },
            notEmpty: { msg: 'Vui lòng nhập địa chỉ' },
            len: { msg: 'Địa chỉ không quá 200 ký tự', args: [0, 200] }
        }
    },
    phone: {
        type: DataTypes.STRING,
        validate: {
            notEmpty: { msg: 'Vui lòng nhập số điện thoại' },
            is: {
                msg: "Số điện thoại không hợp lệ",
                args: /(\+84|0)((2[0-9])|(3)|(5)|(7)|(8)|(9))+([0-9]{8})\b/g
            }
        }
    },
    email: {
        type: DataTypes.STRING,
        validate: {
            notEmpty: { msg: 'Vui lòng nhập email' },
            isEmail: {
                msg: "Email không hợp lệ",
            }
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập mô tả địa điểm' },
            notEmpty: { msg: 'Vui lòng nhập mô tả địa điểm' },
            len: { msg: 'Mô tả địa điểm không quá 500 ký tự', args: [0, 500] }
        }
    },
    image: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng thêm ảnh vào địa điểm' },
            notEmpty: { msg: 'Vui lòng  thêm ảnh vào địa điểm' }
        }
    },
    longitude: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập kinh độ' },
            isNumeric: { msg: 'Kinh độ không hợp lệ' },
            min: { msg: 'Kinh độ có giá trị từ -180 đến 180', args: [-180] },
            max: { msg: 'Kinh độ có giá trị từ -180 đến 180', args: [180] }
        }
    },
    latitude: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập vĩ độ' },
            isNumeric: { msg: 'Vĩ độ không hợp lệ' },
            min: { msg: 'Vĩ độ có giá trị từ -90 đến 90', args: [-90] },
            max: { msg: 'Vĩ độ có giá trị từ -90 đến 90', args: [90] }
        }
    },
    lowestPrice: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập giá thấp nhất' },
            isInt: { msg: 'Giá thấp nhất không hợp lệ' },
            min: { msg: 'Giá thấp nhất không hợp lệ', args: [0] },
            max: { msg: 'Giá thấp nhất không hợp lệ', args: [99999] }
        }
    },
    highestPrice: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập giá cao nhất' },
            isInt: { msg: 'Giá cao nhất không hợp lệ' },
            min: { msg: 'Giá cao nhất không hợp lệ', args: [0] },
            max: { msg: 'Giá cao nhất không hợp lệ', args: [99999] }
        }
    },
    openingTime: {
        type: DataTypes.STRING(5),
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập giờ mở cửa' },
            notEmpty: { msg: 'Vui lòng nhập giờ mở cửa' },
            is: {
                msg: "Giờ mở cửa không hợp lệ (HH:MM)",
                args: /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
            }
        }
    },
    closingTime: {
        type: DataTypes.STRING(5),
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập giờ đóng cửa' },
            notEmpty: { msg: 'Vui lòng nhập giờ đóng cửa' },
            is: {
                msg: "Giờ đóng cửa không hợp lệ (HH:MM)",
                args: /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g
            }
        }
    },
    estimatedTimeStay: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập thời gian tham quan' },
            isInt: { msg: 'Thời gian tham quan không hợp lệ' },
            min: { msg: 'Thời gian tham quan không hợp lệ', args: [0] },
            max: { msg: 'Thời gian tham quan không hợp lệ', args: [240] }
        }
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: Status.open,
        validate: {
            isIn: {
                args: [[Status.open, Status.deactivated, Status.closed]],
                msg: 'Trạng thái không hợp lệ'
            }
        }
    },
    avgRating: {
        type: DataTypes.REAL,
        allowNull: false,
        defaultValue: 0.0
    },
    view: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    totalRating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    cityID: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    isHaveVoucher: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    supplierID: {
        type: DataTypes.UUID,
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: false
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
}, {
    // Other model options go here
    timestamps: true,
    paranoid: true,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Destination' // We need to choose the model name
});

Destination.belongsToMany(Catalog, { through: DestinationCatalog, foreignKey: "destinationID", as: 'catalogs' });
Catalog.belongsToMany(Destination, { through: DestinationCatalog, foreignKey: "catalogName", as: 'catalogs' });

Destination.belongsToMany(Personalities, { through: DestinationPersonalites, foreignKey: "destinationID", as: 'destinationPersonalities' });
Personalities.belongsToMany(Destination, { through: DestinationPersonalites, foreignKey: "personality", as: 'destinationPersonalities' });

Destination.belongsToMany(TimeFrame, { through: DestinationRecommendedTime, foreignKey: "destinationID", as: 'recommendedTimes' });
TimeFrame.belongsToMany(Destination, { through: DestinationRecommendedTime, foreignKey: "timeFrameID", as: 'recommendedTimes' });

Destination.hasMany(DestinationImage, { foreignKey: "destinationID", as: 'gallery' });
DestinationImage.belongsTo(Destination, { foreignKey: "destinationID", as: 'gallery' });

User.hasMany(Destination, { foreignKey: "supplierID", as: "supplier" });
Destination.belongsTo(User, { foreignKey: 'supplierID', as: "supplier" });

City.hasMany(Destination, { foreignKey: "cityID", as: "city" });
Destination.belongsTo(City, { foreignKey: 'cityID', as: "city" })

Destination.beforeSave(async (destination) => {
    const { email, lowestPrice, highestPrice, openingTime, closingTime, supplierID
    } = destination;

    if (email && email !== null) {
        const count = await Destination.count({ where: { email: email, supplierID: { [Op.ne]: supplierID ? supplierID : null } } })
        if (count > 0)
            throw new AppError('Email đã được sử dụng bởi địa điểm của đối tác khác', StatusCodes.BAD_REQUEST)
    }

    if (closingTime < openingTime)
        throw new AppError('Giờ đóng cửa phải sau giờ mở cửa', StatusCodes.BAD_REQUEST)

    if (highestPrice < lowestPrice)
        throw new AppError('Giá cao nhất phải cao hơn giá thấp nhất', StatusCodes.BAD_REQUEST)
})