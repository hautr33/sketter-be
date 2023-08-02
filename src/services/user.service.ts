import { UserPrivateFields } from "../utils/private_field"
import { User } from "../models/user.model"
import { Roles, Status } from "../utils/constant"
import { Personalities } from "../models/personalities.model"
import { Role } from "../models/role.model"
import sequelizeConnection from "../db/sequelize.db"
import _ from "lodash"
import { getAuth } from "firebase-admin/auth"
import { sendEmail } from "./mail.service"
import { PAGE_LIMIT } from "../config/default"
import { Op } from "sequelize"
import RESDocument from "../controllers/factory/res_document"
import { StatusCodes } from "http-status-codes"
import AppError from "../utils/app_error"
import { TravelerPersonalities } from "../models/traveler_personalites.model"

/**
 * This method get User's information
 *
 * @param {*} id ID of User
 * @author HauTr
 * @version 0.0.1
 *
 */
export const getUserService = async (id: string) => {
    const user = await User.findByPk(
        id,
        {
            include: [
                { model: Personalities, as: 'travelerPersonalities', through: { where: { isActive: true }, attributes: [] }, attributes: ['name'] },
                { model: Role, as: 'role', attributes: { exclude: ['id'] } }
            ]
        }
    )
    if (!user)
        return null

    return _.omit(user.toJSON(), UserPrivateFields[user.roleID ?? 0])
}

/**
 * This method get all user
 *
 * @param {*} page number of current page
 * @param {*} status status of user
 * @author HauTr
 * @version 0.0.1
 *
 */
export const getAllUserService = async (page: number, status: string, search: string) => {
    const query = {
        [Op.or]: [{ name: { [Op.iLike]: `%${search}%` } }, { email: { [Op.iLike]: `%${search}%` } }],
        status: { [Op.iLike]: `%${status}%` },
        roleID: { [Op.ne]: Roles.Admin }
    }
    const users = await User.findAll(
        {
            where: query,
            attributes: { exclude: UserPrivateFields[0] },
            include: [{ model: Role, as: 'role', attributes: { exclude: ['id'] } }],
            order: [['name', 'ASC']],
            offset: (page - 1) * PAGE_LIMIT,
            limit: PAGE_LIMIT,
        }
    )
    const count = await User.findAll(
        {
            where: query,
            attributes: ['id'],
            include: [{ model: Role, as: 'role', attributes: [] }],
        })
    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { count: count.length, users: users }
    )
    if (count.length != 0) {
        const maxPage = Math.ceil(count.length / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    return resDocument
}

/**
 * This method update User's information
 *
 * @param {*} id ID of User
 * @param {*} body Body is some field to be update
 * @author HauTr
 * @version 0.0.1
 *
 */
export const updateUserService = async (id: string, body: any, isAdmin?: boolean) => {
    const user = await User.findByPk(id)
    if (!user)
        return null

    const { name, avatar, travelerPersonalities, status, address, phone } = body;
    user.isCheck = true
    name ? user.name = name : 0
    avatar ? user.avatar = avatar : 0
    address ? user.address = address : 0
    phone ? user.phone = phone : 0
    isAdmin ? status ? user.status = status : 0 : 0
    if (user.roleID == Roles.Traveler) {
        const { gender, dob, } = body;
        gender ? user.gender = gender : 0
        dob ? user.dob = dob : 0
    } else if (user.roleID == Roles.Supplier) {
        const { owner, commissionRate } = body;
        owner ? user.owner = owner : 0
        isAdmin && commissionRate ? user.commissionRate = commissionRate : 0
    }
    await sequelizeConnection.transaction(async (update) => {
        await user.save({ transaction: update })
        if (user.roleID === Roles.Traveler && travelerPersonalities) {
            await TravelerPersonalities.update({ isActive: false }, { where: { userID: id }, transaction: update })
            for (let i = 0; i < travelerPersonalities.length; i++) {
                const count = await TravelerPersonalities.count({ where: { userID: id, personality: travelerPersonalities[i] } })
                if (count > 0) {
                    await TravelerPersonalities.increment({ count: 1 }, { where: { userID: id, personality: travelerPersonalities[i] }, transaction: update })
                    await TravelerPersonalities.update({ isActive: true }, { where: { userID: id, personality: travelerPersonalities[i] }, transaction: update })
                } else {
                    const tmp = new TravelerPersonalities()
                    tmp.userID = id
                    tmp.personality = travelerPersonalities[i]
                    await tmp.save({ transaction: update })
                }
            }
        }
    })
    return user
}

/**
 * This method update User's password
 *
 * @param {*} user User that change password
 * @param {*} newPassword New Password of User
 * @author HauTr
 * @version 0.0.1
 *
 */
export const updateUserPasswordService = async (user: User, newPassword: string) => {
    await sequelizeConnection.transaction(async (update) => {
        user.password = newPassword
        user.passwordResetExpires = null
        user.passwordResetToken = null
        await user.save({ transaction: update })
        await getAuth().updateUser(user.firebaseID, { password: newPassword })
    })
}

/**
 * This method send email to verify User's account
 *
 * @param {*} user User that verify account
 * @author HauTr
 * @version 0.0.1
 *
 */
export const sendVerifyEmailService = async (user: User) => {
    await sequelizeConnection.transaction(async (verify) => {
        const code = await user.createVerifyCode();
        await user.save({ transaction: verify });
        const message = `Xin chào ${user.name},\nVui lòng nhập code dưới đây vào thiết bị của bạn để xác thực email của bạn:
        \n${code}`;

        await sendEmail({
            email: user.email,
            subject: 'Sketter - Xác thực tài khoản (hết hạn sau 5 phút)',
            message
        });
    })
}

/**
 * This method verify User account
 *
 * @param {*} id ID of User
 * @author HauTr
 * @version 0.0.1
 *
 */
export const verifyEmailService = async (id: string) => {
    await sequelizeConnection.transaction(async (verify) => {
        await User.update({ verifyCode: null, verifyCodeExpires: null, status: Status.verified }, { where: { id: id }, transaction: verify })
    })
}

/**
 * This method check password
 *
 * @param {*} password
 * @param {*} confirmPassword
 * @param {*} oldPassword
 * @author HauTr
 * @version 0.0.1
 *
 */
export const checkPassword = (password: string, confirmPassword: string, oldPassword?: string) => {
    if (oldPassword && (password === oldPassword))
        throw new AppError('Vui lòng nhập mật khẩu mới khác với mật khẩu hiện tại', StatusCodes.BAD_REQUEST)

    if (!password || password.length < 6 || password.length > 16)
        throw new AppError('Mật khẩu phải có từ 6 đến 16 kí tự', StatusCodes.BAD_REQUEST)

    if (password !== confirmPassword)
        throw new AppError('Nhập lại mật khẩu không khớp', StatusCodes.BAD_REQUEST)
}