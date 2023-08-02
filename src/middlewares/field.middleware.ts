/* eslint-disable import/no-unresolved */
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { decode } from 'jsonwebtoken';
import { Role } from '../models/role.model';

/**
 * [USE-WITH-CARE] only use this one when user are CREATING resources.
 * And the owner of the resource is the user within the cookies.
 */
export function attachCreatedBy(
	req: Request,
	_res: Response,
	next: NextFunction
): void {
	// Get jwt cookies
	const jwtCookie = req.cookies.jwt;
	// Get payload data
	const payload = decode(jwtCookie) as JWTPayload;
	// Attach createdBy to the req.body
	req.body.createdBy = payload?.id;
	next();
}

/**
 * @param unwantedFieldString - List of unwanted field in string
 * This middleware will add unwanted fieid param to request body. This is because
 * we want to block some unwanted fields from request body.
 */
export function blockUnwantedFields(
	unwantedFieldString: string
): RequestHandler {
	const unwantedFields = unwantedFieldString.split(' ');

	return (req, _res, next) => {
		unwantedFields.forEach((field) => {
			if (req.body[field]) {
				delete req.body[field];
			}
		});

		next();
	};
}

/**
 * @param roles - User role like admin, normal user, supplier
 * This middleware will add role param to request body. This is because
 * we login by sending email and password.
 */
export const addRoleMiddleware = (...roles: Role['id'][]): RequestHandler => (
	req,
	_res,
	next
) => {
	req.body.role = roles;
	next();
};