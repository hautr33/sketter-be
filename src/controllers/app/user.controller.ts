import crypto from 'crypto';
import { FORGOT_PASSWORD_URL } from '../../config/default';
import { StatusCodes } from "http-status-codes";
import { Roles, Status } from "../../utils/constant";
import catchAsync from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import AppError from "../../utils/app_error";
import { User } from "../../models/user.model";
import sequelizeConnection from "../../db/sequelize.db";
import _ from "lodash"
import { Op } from "sequelize";
import { sendEmail } from "../../services/mail.service";
import { checkPassword, getUserService, sendVerifyEmailService, updateUserPasswordService, updateUserService, verifyEmailService } from '../../services/user.service';

/**
 * This controller is getMe that get profile of logged in User
 *
 * @author HauTr
 * @version 0.0.1
 *
 */
export const getMe = catchAsync(async (_req, res, next) => {

    const user = await getUserService(res.locals.user.id)
    if (!user)
        return next(new AppError('Không tìm thấy tài khoản này', StatusCodes.NOT_FOUND))

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { profile: user });
    next();
});

/**
 * This controller is updateMe that update profile of logged in User
 *
 * @author HauTr
 * @version 0.0.1
 *
 */
export const updateMe = catchAsync(async (req, res, next) => {

    const user = await updateUserService(res.locals.user.id, req.body)
    if (!user)
        return next(new AppError('Không tìm thấy tài khoản này', StatusCodes.NOT_FOUND))

    res.resDocument = new RESDocument(StatusCodes.OK, 'Thông tin tài khoản đã được cập nhật', null);
    next();
});

/**
 * This controller is updatePassword that update password of logged in User
 *
 * @author HauTr
 * @version 0.0.1
 *
 */
export const updatePassword = catchAsync(async (req, res, next) => {

    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    checkPassword(newPassword, confirmNewPassword, currentPassword)

    const user = await User.findOne({ where: { id: res.locals.user.id } })
    if (!user || !(await user.comparePassword(currentPassword)))
        return next(new AppError('Mật khẩu hiện tại không đúng', StatusCodes.BAD_REQUEST))

    await updateUserPasswordService(user, newPassword)

    res.resDocument = new RESDocument(StatusCodes.OK, 'Thay đổi mật khẩu thành công', null);
    next();
});

/**
 * This controller is forgotPassword that send an email 
 * to reset user password when they forgot
 *
 * @author HauTr
 * @version 0.0.1
 *
 */
export const forgotPassword = catchAsync(async (req, res, next) => {

    const user = await User.findOne({ where: { email: req.body.email, roleID: { [Op.or]: [Roles.Traveler, Roles.Supplier] } } });
    if (!user)
        return next(new AppError('Không tìm thấy tài khoản với email này', StatusCodes.NOT_FOUND));

    const resetToken = await user.createResetPasswordToken()
    const resetURL = `${FORGOT_PASSWORD_URL}/${resetToken}`;
    const message = `Xin chào ${user.name},\nChúng tôi đã nhận được yêu cầu đặt lại mật khẩu Sketter của bạn.
        \nVui lòng bấm vào đường dẫn ở dưới để đặt lại mật khẩu:
        \n${resetURL}
        \nNếu bạn không yêu cầu đặt lại mật khẩu mới, hãy bỏ qua tin nhắn này.`;
    await sequelizeConnection.transaction(async (update) => {
        await user.save({ transaction: update });
        await sendEmail({
            email: user.email,
            subject: 'Đặt lại mật khẩu Sketter (hết hạn sau 10 phút)',
            message
        });
    })

    res.resDocument = new RESDocument(StatusCodes.OK, 'Đường dẫn đặt lại mật khẩu đã được gửi sang email của bạn', null);
    next();
});

/**
 * This controller is resetPassword that set new password 
 * after click on reset password url in forgot password email
 *
 * @author HauTr
 * @version 0.0.1
 *
 */
export const resetPassword = catchAsync(async (req, res, next) => {

    const { password, confirmPassword } = req.body;

    checkPassword(password, confirmPassword)

    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        where: {
            passwordResetToken: hashedToken,
            passwordResetExpires: { [Op.gt]: Date.now() }
        }
    });

    if (!user)
        return next(new AppError('Đường dẫn đặt lại mật khẩu đã hết hạn', StatusCodes.BAD_REQUEST));

    await updateUserPasswordService(user, password)

    res.resDocument = new RESDocument(StatusCodes.OK, 'Đặt lại mật khẩu thành công', null);
    next();
});

/**
 * This controller is sendVerifyEmail that send a email to verify user's account
 *
 * @author HauTr
 * @version 0.0.1
 *
 */
export const sendVerifyEmail = catchAsync(async (_req, res, next) => {

    const user = await User.findOne({ where: { id: res.locals.user.id }, attributes: ['id', 'email', 'name', 'status'] })
    if (!user)
        return next(new AppError('Không tìm thấy tài khoản này', StatusCodes.NOT_FOUND))

    if (user.status !== Status.unverified)
        return next(new AppError('Tài khoản đã được xác thực', StatusCodes.BAD_REQUEST))

    await sendVerifyEmailService(user)

    res.resDocument = new RESDocument(StatusCodes.OK, `Mã xác thực đã được gửi đến ${user.email}`, null);
    next();
});


/**
 * This controller is verifyEmail that enter code from email to verify user's account
 *
 * @author HauTr
 * @version 0.0.1
 *
 */
export const verifyEmail = catchAsync(async (req, res, next) => {

    const count = await User.count({
        where: {
            id: res.locals.user.id,
            verifyCode: req.body.code,
            verifyCodeExpires: { [Op.gt]: Date.now() }
        }
    })

    if (count !== 1)
        return next(new AppError('Mã xác thực đã hết hạn', StatusCodes.BAD_REQUEST))

    await verifyEmailService(res.locals.user.id)

    res.resDocument = new RESDocument(StatusCodes.OK, `Xác thực email thành công`, null);
    next();
});