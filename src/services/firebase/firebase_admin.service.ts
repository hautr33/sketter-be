import { getAuth } from "firebase-admin/auth";
import { Auth, Roles, Status } from "../../utils/constant";
import { User } from "../../models/user.model";
import sequelizeConnection from "../../db/sequelize.db";
import AppError from "../../utils/app_error";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

export const signUpFirebase = async (user: User): Promise<any> => {
    await sequelizeConnection.transaction(async (save) => {
        await user.save({ transaction: save });
        await getAuth()
            .createUser({
                email: user.email,
                password: user.password
            })
            .then(async (userRecord: { uid: string; }) => {
                user.firebaseID = userRecord.uid
                await user.save({ transaction: save });
            })
            .catch(async () => {
                await getAuth()
                    .getUserByEmail(user.email)
                    .then(async (userRecord: { uid: string; }) => {
                        user.firebaseID = userRecord.uid
                        await user.save({ transaction: save });
                    })
            })
        return
    })
}

export const loginViaGoogle = async (token: string): Promise<any> => {
    let email = ''
    let firebaseID = ''
    await sequelizeConnection.transaction(async (save) => {
        const decodedToken = await getAuth()
            .verifyIdToken(token)
        if (decodedToken && decodedToken.email !== undefined) {
            email = decodedToken.email
            firebaseID = decodedToken.uid
            const count = await User.count({ where: { email: email, firebaseID: firebaseID } })
            if (count === 0) {
                const user = new User()
                user.email = decodedToken.email
                user.firebaseID = decodedToken.uid
                user.name = decodedToken.name
                decodedToken.picture ? user.avatar = decodedToken.picture : 0
                user.authType = Auth.google
                user.roleID = Roles.Traveler
                user.status = Status.verified
                await user.save({ transaction: save })
            } else if (count === 1) {
                await User.update(decodedToken.picture ? { name: decodedToken.name, avatar: decodedToken.picture } : { name: decodedToken.name }, { where: { email: decodedToken.email, firebaseID: decodedToken.uid }, transaction: save })
            }
        } else
            throw new AppError('Token không hợp lệ', StatusCodes.BAD_REQUEST)
    })
    const user = await User.findOne({ where: { email: email, firebaseID: firebaseID, status: { [Op.ne]: Status.deactivated } } })
    if (!user)
        throw new AppError('Không thể đăng nhập', StatusCodes.BAD_REQUEST)
    return user
}