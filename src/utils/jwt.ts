import { NextFunction, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { ENVIRONMENT, JWT_COOKIES_EXPIRES_IN, JWT_EXPIRES_IN, JWT_PUBLIC, JWT_SECRET } from '../config/default';
import { Session } from '../models/session.model';
import RESDocument from '../controllers/factory/res_document';
import AppError from './app_error';
import { StatusCodes } from 'http-status-codes';

const signJwt = (payload: Object, options: SignOptions = {}) => {
    const privateKey = Buffer.from(
        JWT_SECRET,
        'base64'
    ).toString('ascii');
    return jwt.sign(payload, privateKey, {
        ...(options && options),
        algorithm: 'RS256',
    });
};

export const verifyJwt = <T>(token: string): T | null => {
    try {
        const publicKey = Buffer.from(
            JWT_PUBLIC,
            'base64'
        ).toString('ascii');
        return jwt.verify(token, publicKey) as T;
    } catch (error) {
        return null;
    }
};


/**
 * This function is for signing a token or generate a JWT
 *  token with provided JWT_SECRET, JWT_EXPIRES_IN as a
 *  .env variables.
 * @param {*} id - payload of the JWT, in this situation
 *  we include as an id of user
 */
const signToken = (id: string) =>
    signJwt(
        { id: id },
        {
            expiresIn: JWT_EXPIRES_IN,
        }
    )

/**
* This function Create & Send the JWT Token to the user end.
*  By using the function "signToken", it generates a JWT Token
*  with specific expires time. Furthermore, this method filters
*  some sensitive key fields such as "password" and also leverage
*  cookies when sending.
* @param {*} user - Instance of User Model from MongoDB
* @param {*} statusCode - HTTP StatusCode to be sent
* @param {*} res - Instance of Response in ExpressJS
*/
export const createSendToken = (
    userID: string,
    statusCode: number,
    res: Response,
    next: NextFunction
) => {
    // Generate the JWT Token with user id
    const token = signToken(userID);

    // CookieOptions for sending
    const cookieOptions = {
        expires: new Date(
            // Now + Day * 24 Hours * 60 Minutes * 60 Seconds * 1000 milliseconds
            Date.now() +
            parseInt(JWT_COOKIES_EXPIRES_IN as string, 10) *
            24 *
            60 *
            60 *
            1000
        ),
        // Only work in HTTP or HTTPS Protocol
        httpOnly: true,
        secure: false
    };

    /* In HTTPS connection, Cookies will be encrypted and stay secure
      We only want this feature in production environment. Not in 
      development environment.
   */
    if (ENVIRONMENT === 'production') cookieOptions.secure = true;

    const decoded = jwt.decode(token) as JWTPayload;
    if (decoded) {
        Session.create({ userID: userID, iat: decoded.iat, exp: decoded.exp })
        // Send the JWT Token as cookie
        res.cookie('jwt', token, cookieOptions);
        res.resDocument = new RESDocument(statusCode, 'Đăng nhập thành công', { token });
        next();
    } else {
        return next(new AppError('Có lỗi xảy ra khi đăng nhập', StatusCodes.BAD_GATEWAY))
    }

};