import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import AppError from '../utils/app_error';

/**
 * Set up Pipeline
 */
export const setUpPipeline = (
	_req: Request,
	res: Response,
	next: NextFunction
): void => {
	res.backgroundTasks = [];

	next();
};

/**
 * Middleware that execute all backgrounds task.
 * Use this middleware at the end of the pipes, so that
 * it will not block any operations.
 */
export const executeBackgrounds = async (
	_req: Request,
	res: Response,
	next: NextFunction
): Promise<any> => {
	Promise.all(res.backgroundTasks)
		.catch((e) => {
			return next(new AppError(e, StatusCodes.INTERNAL_SERVER_ERROR));
		})
		.finally(() => {
			res.end();
		});
};

export function respondJSON(
	_req: Request,
	res: Response,
	next: NextFunction
): void {
	if (res.resDocument === undefined) {
		return next(new AppError('Có lỗi xảy ra', 500));
	}
	res.status(res.resDocument?.statusCode).json({
		message: res.resDocument?.message,
		data: res.resDocument?.document,
		maxPage: res.resDocument?.maxPage,
		currentPage: res.resDocument?.currentPage
	});
}