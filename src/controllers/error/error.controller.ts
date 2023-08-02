import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import logger from '../../utils/logger';
import { ENVIRONMENT } from '../../config/default';
import AppError from '../../utils/app_error';

/**
 * Token Invalid Error - JWT (prod)
 * ---
 * This error handler is used in production env, that handles
 *  when JWT token errors are raised. It is because the token
 *  are invalid or fail validation from JWT.
 *
 * Send user back StatusCode 401 - Unauthorised
 * @param {*} err - Instance of AppError
 */
const handleJWTError = () =>
	new AppError(
		'Không thể xác thực! Vui lòng thử lại',
		StatusCodes.UNAUTHORIZED
	);

/**
 * Token Expired Error - JWT (prod)
 * ---
 * This error handler is used in production env, that handles
 *  when JWT token has been expired. User now need to log-in
 *  again to acquire a new token
 *
 * Send user back StatusCode 401 - Unauthorised
 * @param {*} err - Instance of AppError
 */
const handleJWTExpiredError = () =>
	new AppError('Phiên đăng nhập đã hết hạn!', StatusCodes.UNAUTHORIZED);

/**
 * Cast to Object Error - DB (prod)
 * ---
 * This error handler is used in production env, that handles
 *  when the MongoDB couldn't cast the provided value into
 *  schema.
 *
 *  E.g  MongoDB Id is special, if you provide a wrong formatted
 *  ID, MongoDB cannot understand neither cast it into ObjectID
 *
 * Send user back StatusCode 400 - Bad Request
 * @param {*} err - Instance of AppError
 */
const handleCastErrorDB = (err: any) => {
	const message = `Wrong ${err.path}: ${err.value}`;
	return new AppError(message, StatusCodes.BAD_REQUEST);
};

/**
 * Key Duplication - DB (prod)
 * ---
 * This error handler is used in production env, that handles
 *  when there exist a record that has the same key as provided
 *  one.
 *
 *  E.g  email = "Test11@gmail.com" already exists
 *
 * Send user back StatusCode 400 - Bad Request
 * @param {*} err - Instance of AppError
 */
const handleDuplicateFieldsDB = (err: any) => {
	const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
	const message = `Data existed: ${value}. Please fill another data`;
	return new AppError(message, StatusCodes.CONFLICT);
};

/**
 * Validation Failed - DB (prod)
 * ---
 * This error handler is used in production env, that handles
 *  when the provided payload failed to be validated by DB.
 *  Provided input should meet all the requirements when being
 *  stored in the Database.
 *
 *  E.g  email = "Test11@" is wrong formatted, and will be rejected
 *
 * Send user back StatusCode 400 - Bad Request
 * @param {*} err - Instance of AppError
 */
const handleValidationErrorDB = (err: any) => {
	const errors = Object.values(err.errors).map((el: any) => el.message);

	const message = `Wrong format: ${errors}`;
	return new AppError(message, StatusCodes.BAD_REQUEST);
};

/**
 * This method send an error response to the client
 *  in development environment. We will give as much
 *  details of error as we can to debug
 *
 * @param {*} err Instance of AppError
 * @param {*} res Instance of Response of ExpressJS
 */
const sendErrorDev = (err: AppError, res: Response) => {
	if (err.message.includes('notNull Violation') || err.message.includes('Validation error') || err.message.includes('exist')) {
		const message = err.message.split(': ')[1] ? err.message.split(': ')[1].split(',')[0] : err.message
		const statusCode = StatusCodes.BAD_REQUEST
		const status = 'fail'
		res.status(statusCode).json({
			status: status,
			message: message,
			error: err,
			stack: err.stack

		});
	} else {
		res.status(err.statusCode).json({
			status: err.status,
			message: err.message,
			error: err,
			stack: err.stack
		});
	}
};

/**
 * This method send an error response to the client
 *  in production environment. We never give users too
 *  much details about our errors.
 *
 * Recommend to use Error Controllers as written to
 *  prepare for this
 * @param {*} err Instance of AppError
 * @param {*} res Instance of Response of ExpressJS
 */
const sendErrorProd = (err: AppError, res: Response) => {
	// Operational, trusted error: send message to client
	if (err.isOperational) {
		res.status(err.statusCode).json({
			status: err.status,
			message: err.message
		});

		// Programming or other unknown error
	} else {
		// Log to the console, but not to the client
		logger.error('*****ERROR*****\n', err);

		if (err.message.includes('notNull Violation') || err.message.includes('Validation error') || err.message.includes('exist')) {
			const message = err.message.split(': ')[1].split(',')[0] ?? err.message
			const statusCode = StatusCodes.BAD_REQUEST
			const status = 'fail'
			res.status(statusCode).json({
				status: status,
				message: message,
			});
		} else {
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
				status: 'error',
				message: 'Đã có lỗi xảy ra!\nMáy chủ đã gặp phải lỗi và không thể hoàn thành yêu cầu của bạn.'
			});
		}
	}
};

/**
 * Main method that handles the Error and send back to client end.
 *  It will distinguish between whether a production env or development env.
 *  If it is dev env, send the as much as details of error for users & developers
 *  for debugging. Otherwise, if production env, only send appropriate error message.
 *
 *  Please consider to use Error Controllers as provided to prepare for this.
 */
export default (
	error: AppError,
	_req: Request,
	res: Response,
	next: NextFunction
): void => {
	// If is not defined, take a default value
	error.statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
	error.status = error.status || 'error';
	if (ENVIRONMENT === 'development') {
		sendErrorDev(error, res);
	}
	// Only send error handlers in production env, that we already customed the message
	else if (ENVIRONMENT === 'production' || ENVIRONMENT === 'test') {
		if (error.name === 'CastError') error = handleCastErrorDB(error);
		else if (error.code === 11000) error = handleDuplicateFieldsDB(error);
		else if (error.name === 'ValidationError')
			error = handleValidationErrorDB(error);
		else if (error.name === 'JsonWebTokenError') error = handleJWTError();
		else if (error.name === 'TokenExpiredError')
			error = handleJWTExpiredError();

		// Send back production error when all is handled
		sendErrorProd(error, res);
	}

	next();
};