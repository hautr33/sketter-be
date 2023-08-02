import { StatusCodes } from 'http-status-codes';

class AppError extends Error {
    public message;

    public statusCode;

    public status;

    public isOperational;

    public code = -1;

    /**
     * This class handle the Error Middleware from ExpressJS with custom
     *  message and statusCode
     * @param {String} message - Message to send to client
     * @param {Number} statusCode - HTTP StatusCode
     */
    constructor(
        message: string,
        statusCode: StatusCodes,
        isOperational = true
    ) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;