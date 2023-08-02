import { NextFunction, Request, Response } from 'express';

/**
 * JWT Cookies reader - ExpressJS Middleware
 * ------
 * This middleware attach the JWT Cookies into authorization
 *  header, before passing to handlers. Because we use httpOnly
 *  cookies, it cannot be read by client. The cookies will
 *  automatically be sent along with request, and only us can read
 *  it at server-side.
 *
 *  So, attach this to Authorization header.
 */
export default (req: Request, _res: Response, next: NextFunction): void => {
	if (req.cookies.jwt) {
		// attach to the authorization header
		req.headers.authorization = `Bearer ${req.cookies.jwt}`;
	}

	// pass to other middleware
	next();
};