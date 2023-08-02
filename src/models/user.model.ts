import bcrypt from 'bcryptjs';
import { DataTypes, ForeignKey, HasManyAddAssociationsMixin, HasManyGetAssociationsMixin, HasManySetAssociationsMixin, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Roles, Status } from '../utils/constant';
import crypto from 'crypto';
import { Role } from './role.model';
import { Personalities } from './personalities.model';
import { TravelerPersonalities } from './traveler_personalites.model';
import { Session } from './session.model';
import AppError from '../utils/app_error';
import { StatusCodes } from 'http-status-codes';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    declare id: string;
    email!: string;
    password!: string;
    passwordUpdatedAt!: Date;
    passwordResetToken!: string | null;
    passwordResetExpires!: number | null;
    verifyCode!: string | null;
    verifyCodeExpires!: number | null;
    name!: string;
    avatar!: string | null;
    gender!: string;
    dob!: Date;
    phone!: string;
    address!: string;
    owner!: string;
    commissionRate?: number;
    roleID!: ForeignKey<Role['id']>;
    authType!: string;
    status?: string;
    firebaseID!: string;
    comparePassword!: (candidatePassword: string) => Promise<any>;
    createResetPasswordToken!: () => Promise<string>;
    createVerifyCode!: () => Promise<string>;

    declare getTravelerPersonalities: HasManyGetAssociationsMixin<Personalities>;
    declare addTravelerPersonalities: HasManyAddAssociationsMixin<Personalities, string>;
    declare setTravelerPersonalities: HasManySetAssociationsMixin<Personalities, string>;
    role?: any
    travelerPersonalities?: any
    session?: any
    isCheck?: boolean
}

User.init({
    // Model attributes are defined here
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        validate: {
            isUUID: 4
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
            name: 'email-exist',
            msg: 'email-exist: Email đã được sử dụng bởi tài khoản khác'
        },
        validate: {
            notEmpty: { msg: 'Vui lòng nhập email' },
            isEmail: { msg: "Email không hợp lệ" }
        }
    },
    password: {
        type: DataTypes.STRING,
    },
    passwordUpdatedAt: {
        type: DataTypes.DATE
    },
    passwordResetToken: {
        type: DataTypes.STRING
    },
    passwordResetExpires: {
        type: DataTypes.DATE
    },
    verifyCode: {
        type: DataTypes.STRING
    },
    verifyCodeExpires: {
        type: DataTypes.DATE
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Vui lòng nhập tên' },
            notEmpty: { msg: 'Vui lòng nhập tên' },
            len: { msg: 'Tên phải có từ 2 đến 50 ký tự', args: [2, 50] }
        }
    },
    avatar: {
        type: DataTypes.TEXT,
    },
    gender: {
        type: DataTypes.STRING,
        validate: {
            isIn: {
                args: [['Nam', 'Nữ']],
                msg: 'Giới tính không hợp lệ'
            }
        }
    },
    dob: {
        type: DataTypes.DATEONLY
    },
    phone: {
        type: DataTypes.STRING,
        unique: {
            name: 'phone-exist',
            msg: 'phone-exist: Số điện thoại đã được sử dụng bởi tài khoản khác'
        },
        validate: {
            notEmpty: { msg: 'Vui lòng nhập số điện thoại' },
            is: {
                msg: "Số điện thoại không hợp lệ",
                args: /(\+84|0)((2[0-9])|(3)|(5)|(7)|(8)|(9))+([0-9]{8})\b/g
            }
        }
    },
    address: {
        type: DataTypes.STRING,
        validate: {
            notEmpty: { msg: 'Vui lòng nhập địa chỉ' },
            len: { msg: 'Địa chỉ không quá 200 ký tự', args: [0, 200] }
        }
    },
    owner: {
        type: DataTypes.STRING,
        validate: {
            notEmpty: { msg: 'Vui lòng nhập tên chủ sở hữu' },
            len: { msg: 'Tên chủ sở hữu phải có từ 2 đến 50 ký tự', args: [2, 50] }
        }
    },
    commissionRate: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
        validate: {
            isInt: { msg: 'Tỷ lệ hoa hồng không hợp lệ' },
            min: { msg: 'Tỷ lệ hoa hồng có giá trị từ 1% đến 10%', args: [1] },
            max: { msg: 'Tỷ lệ hoa hồng có giá trị từ 1% đến 10%', args: [10] }
        }
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: Status.unverified,
        validate: {
            isIn: {
                args: [['Unverified', 'Verified', 'Deactivated']],
                msg: 'Phương thức xác thực không hợp lệ'
            }
        },
    },
    roleID: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    authType: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: {
                args: [['Sketter', 'Google']],
                msg: 'Phương thức xác thực không hợp lệ'
            }
        },
        defaultValue: 'Sketter'
    },
    firebaseID: {
        type: DataTypes.STRING,
    },
}, {
    // Other model options go here
    timestamps: true,
    sequelize: sequelize,
    modelName: 'User' // We need to choose the model name
});

Role.hasMany(User, { foreignKey: "roleID", as: 'role' });
User.belongsTo(Role, { foreignKey: 'roleID', as: 'role' })

User.belongsToMany(Personalities, { through: TravelerPersonalities, foreignKey: "userID", as: 'travelerPersonalities' });
Personalities.belongsToMany(User, { through: TravelerPersonalities, foreignKey: "personality", as: 'travelerPersonalities' });

User.hasMany(Session, { foreignKey: "userID", as: 'session' });
Session.belongsTo(User, { foreignKey: "userID", as: 'session' })

User.beforeSave(async (user) => {
    //pass 6-16
    if (user.changed("password")) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        user.password = hashedPassword;
        user.passwordUpdatedAt = new Date(Date.now() - 1000); // Now - 1 minutes
    }

    if (user.isCheck) {
        if (!user.email || user.email === null)
            throw new AppError('Vui lòng nhập emal', StatusCodes.BAD_REQUEST)

        if (!user.name || user.name === null)
            throw new AppError('Vui lòng nhập tên', StatusCodes.BAD_REQUEST)

        if (!user.roleID || user.roleID === null)
            throw new AppError('Vui lòng chọn vai trò', StatusCodes.BAD_REQUEST)

        if (user.roleID == Roles.Supplier) {
            if (!user.name || user.name === null)
                throw new AppError('Vui lòng nhập tên đối tác', StatusCodes.BAD_REQUEST)

            if (!user.owner || user.owner === null)
                throw new AppError('Vui lòng nhập tên chủ sở hũu', StatusCodes.BAD_REQUEST)

            if (user.phone !== null && user.phone === '')
                throw new AppError('Vui lòng nhập số điện thoại', StatusCodes.BAD_REQUEST)

            if (!user.address || user.address === null)
                throw new AppError('Vui lòng nhập địa chỉ', StatusCodes.BAD_REQUEST)
        }
    }
});

User.prototype.comparePassword = async function (
    candidatePassword: string,
) {
    // 'This point' to the current password
    return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.createResetPasswordToken = async function () {
    // 'This point' to the current password
    // Create a random 32 bytes as HEX (unhashed)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hashing the resetToken with SHA256 as HEX and store to database
    this.passwordResetToken = crypto.createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // 10 min expire
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    // Return the UNHASHED token, we need to hash and compare when have this
    return resetToken;
};

User.prototype.createVerifyCode = async function () {
    this.verifyCode = ''
    for (let i = 0; i < 6; i++)
        this.verifyCode += Math.floor(Math.random() * 10)

    // 5 min
    this.verifyCodeExpires = Date.now() + 5 * 60 * 1000;

    return this.verifyCode
}