import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import _ from 'lodash';
import { Status } from '../utils/constant';
import { Session } from '../models/session.model';
import { User } from '../models/user.model';
import AppError from '../utils/app_error';
import { verifyJwt } from '../utils/jwt';
import { Op } from 'sequelize';

export const deserializeUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the token
    let access_token;
    if (req.headers.authorization
      && req.headers.authorization.startsWith('Bearer')
    ) {
      access_token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      access_token = req.cookies.jwt;
    }

    if (!access_token)
      return next(new AppError('Vui lòng đăng nhập để sử dụng tính năng này', 401));

    // Validate Access Token
    const decoded = verifyJwt<{ id: string, iat: number, exp: number }>(access_token);
    if (!decoded)
      return next(new AppError(`Token không hợp lệ hoặc tài khoản không tồn tại`, 401));

    const user = await User.findOne({
      where: { id: decoded.id, status: { [Op.ne]: Status.deactivated } }, attributes: ['id', 'roleID', 'status'],
      include: { model: Session, as: 'session', where: { iat: decoded.iat, exp: decoded.exp }, attributes: ['id'] }
    });
    if (!user)
      return next(new AppError('Không tìm thấy tài khoản của bạn', StatusCodes.NOT_FOUND));

    if (user.session.length != 1)
      return next(new AppError('Phiên đăng nhập đã hết hạn', StatusCodes.UNAUTHORIZED))
    // This is really important (Helps us know if the user is logged in from other controllers)
    // You can do: (req.user or res.locals.user)

    // if (user.roleID === Roles.Traveler)
    //   user = await User.findOne({
    //     where: { id: decoded.id }
    //     , include: [
    //       { model: TravelPersonalityType, as: 'travelerPersonalities', through: { attributes: [] }, attributes: ['name'] },
    //       { model: Role, as: 'role' },
    //     ]
    //   });
    // const excludedUser = _.omit(user?.toJSON(), UserPrivateFields[user?.role.id ?? 0]);
    res.locals.user = user;
    // if (res.locals.user.roleID === Roles.Traveler)
    //   res.locals.user.travelerPersonalities = _.map(res.locals.user.travelerPersonalities, function (personality) { return personality.name; })
    next();
  } catch (err: any) {
    next(err);
  }
};
