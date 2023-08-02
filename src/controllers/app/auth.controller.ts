import { RequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import _ from 'lodash';
import RESDocument from '../factory/res_document';
import { User } from '../../models/user.model';
import AppError from '../../utils/app_error';
import catchAsync from '../../utils/catch_async';
import { Roles, Status } from '../../utils/constant';
import { Role } from '../../models/role.model';
import { Session } from '../../models/session.model';
import { createSendToken } from '../../utils/jwt';
import { loginViaGoogle, signUpFirebase } from '../../services/firebase/firebase_admin.service';
import { Op } from 'sequelize';
import { checkPassword } from '../../services/user.service';
/**
 * This controller is signup that user can sign up with traveler or supplier role
 *
 */
export const signup = catchAsync(async (req, res, next) => {
    // Get parameters from body
    const { email, password, confirmPassword, role } = req.body;
    checkPassword(password, confirmPassword)

    // Set parameters to user
    const user = new User();
    user.email = email.toLowerCase();
    user.password = password;
    user.roleID = role;

    if (role == Roles.Traveler)
        user.name = email.split('@')[0];
    else if (role == Roles.Supplier) {
        const { name, owner, phone, address } = req.body;
        user.name = name;
        user.owner = owner;
        user.phone = phone;
        user.address = address;
    } else
        return next(new AppError('Không thể đăng kí', StatusCodes.BAD_GATEWAY));

    await signUpFirebase(user)
    res.resDocument = new RESDocument(StatusCodes.OK, 'Đăng kí thành công', null);
    next();


});

/**
 * This controller is login that enter email and password to login to Sketter
 *
 */
export const login = catchAsync(async (req, res, next) => {
    // Check auth type
    const authType = req.query.auth as string;
    if (authType && !(['Sketter', 'Google'].includes(authType)))
        return next(new AppError('Phương thức xác thực không hợp lệ', StatusCodes.BAD_REQUEST));

    // Login email password
    if (!authType || authType == 'Sketter') {
        const { email, password } = req.body;
        if (!(email || password))
            return next(new AppError('Email hoặc mật khẩu không đúng', StatusCodes.BAD_REQUEST));

        // Check password
        const user = await User.findOne({ where: { email: email, status: { [Op.ne]: Status.deactivated } } });
        if (!user || !(await user.comparePassword(password as string)))
            return next(new AppError('Email hoặc mật khẩu không đúng', StatusCodes.BAD_REQUEST));

        if (user.roleID === Roles.Traveler && req.header('Origin') !== 'sketter-mobile')
            return next(new AppError('Email hoặc mật khẩu không đúng', StatusCodes.BAD_REQUEST));

        if (user.roleID !== Roles.Traveler && req.header('Origin') === 'sketter-mobile')
            return next(new AppError('Email hoặc mật khẩu không đúng', StatusCodes.BAD_REQUEST));

        createSendToken(user.id, StatusCodes.OK, res, next);

        // Login to firebase
        // const error = await loginEmailPasswordFirebase(email, password)
        // if (error) {
        //     return next(new AppError(error, StatusCodes.BAD_REQUEST));
        // } else {
        //     const user = await User.findOne({ where: { email: email } });
        //     if (user)
        //         createSendToken(user.id, StatusCodes.OK, res, next);
        //     else
        //         return next(new AppError('Không tìm thấy tài khoản này', StatusCodes.NOT_FOUND));
        // }
    }
    if (authType == 'Google') {
        const { token } = req.body;
        if (!token)
            return next(new AppError('Token không hợp lệ', StatusCodes.BAD_REQUEST));

        const user = await loginViaGoogle(token)
        createSendToken(user.id, StatusCodes.OK, res, next);
    }
});

/**
 * This controller is logout that will destroy the current session
 *
 */
export const logout = catchAsync(async (req, res, next) => {
    const user = res.locals.user;
    await Session.destroy({ where: { userID: user.id, id: user.session[0].id } });
    res.clearCookie('jwt');
    req.headers.authorization = undefined;
    res.resDocument = new RESDocument(StatusCodes.NO_CONTENT, 'Đăng xuất thành công', null);

    next();
});

export const restrictTo = (...roles: Role['id'][]): RequestHandler => (_req, res, next) => {
    /* 
    We check if the attached User with the "role" is in the 
      whitelist of permissions
    */

    if (!roles.includes(res.locals.user.roleID as Role['id'])) {
        return next(
            new AppError(
                'Bạn không có quyền để sử dụng tính năng này',
                StatusCodes.FORBIDDEN
            )
        );
    }
    next();
};

export const requireStatus = (...status: string[]): RequestHandler => (_req, res, next) => {
    /* 
    We check if the attached User with the "role" is in the 
      whitelist of permissions
    */
    const userStatus = res.locals.user.status
    if (!status.includes(userStatus)) {
        if (userStatus == Status.unverified) {
            return next(
                new AppError(
                    'Vui lòng xác thực tài khoản của bạn để sử dụng tính năng này',
                    StatusCodes.FORBIDDEN
                )
            );
        } else if (userStatus == Status.deactivated) {
            return next(
                new AppError(
                    'Không thể sử dụng tính năng này do tài khoản của bạn đã bị ngưng hoạt động',
                    StatusCodes.FORBIDDEN
                )
            );
        } else if (userStatus == Status.inactivated) {
            return next(
                new AppError(
                    'Vui lòng kích hoạt lại tài khoản của bạn để sử dụng tính năng này',
                    StatusCodes.FORBIDDEN
                )
            );
        } else {
            return next(
                new AppError(
                    'Bạn không thẻ sử dụng tính năng này',
                    StatusCodes.FORBIDDEN
                )
            );
        }
    }
    next();
};