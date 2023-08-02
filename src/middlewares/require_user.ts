import { NextFunction, Request, Response } from 'express';
import AppError from '../utils/app_error';

export const requireUser = (
    _: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = res.locals.user;
        if (!user) {
            return next(new AppError(`Phiên đăng nhập đã hết hạn`, 401));
        }
        next();
    } catch (err: any) {
        next(err);
    }
};

