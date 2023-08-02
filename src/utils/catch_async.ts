/* eslint-disable no-unused-vars */
import { NextFunction, Request, RequestHandler, Response } from 'express';

type catchAsyncFnType = (
	req: Request,
	res: Response,
	next: NextFunction
) => Promise<void>;

export default (fn: catchAsyncFnType): RequestHandler => (req, res, next) => {
	fn(req, res, next).catch(next);
};