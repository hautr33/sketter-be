import { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { PAGE_LIMIT } from "../../config/default";
import AppError from "../../utils/app_error";
import catchAsync from "../../utils/catch_async";
import RESDocument from "./res_document";

/**
 * This controller is a middleware (req, res, next) that perform
 *  deleting single record from the Database by specifying the ID.
 *
 * @param {Object} Model - The model or collection pointing to
 */
export function deleteOne(Model: any): RequestHandler {
    return catchAsync(async (req, res, next) => {
        const document = await Model.destroy({ where: { id: req.params.id } });

        if (!document) {
            return next(
                new AppError(
                    'Không tìm thấy thông tin với ID này',
                    StatusCodes.NOT_FOUND
                )
            );
        }

        res.resDocument = new RESDocument(
            StatusCodes.NO_CONTENT,
            'deleted',
            null
        );

        next();
    });
}

/**
 * This controller is a middleware (req, res, next) that perform
 *  updating single record from the Database by specifying the ID
 *  and the payload that need to update
 *
 * @param {Object} Model - The model or collection pointing to
 */
export function updateOne(Model: any): RequestHandler {
    return catchAsync(async (req, res, next) => {
        await Model.update(
            req.body,
            {
                where: { id: req.params.id }
            }
        );

        res.resDocument = new RESDocument(StatusCodes.OK, 'success', "Cập nhập thông tin thành công");
        next();

    });
}

/**
 * This controller is a middleware (req, res, next) that perform
 *  creating single record from the Database by specifying the ID
 *  and the payload data that need to be created
 *
 * @param {Object} Model - The model or collection pointing to
 */
export function createOne(Model: any): RequestHandler {
    return catchAsync(async (req, res, next) => {
        const document = await Model.create(req.body);

        // Send back to client results
        res.resDocument = new RESDocument(
            StatusCodes.CREATED,
            'success',
            document
        );

        next();
    });
}


/**
 * This controller is a middleware (req, res, next) that perform
 *  fetching single record from the Database by specifying the ID
 *
 * @param {Object} Model - The model or collection pointing to
 */
export function getOne(Model: any, option?: any): RequestHandler {
    return catchAsync(async (req, res, next) => {
        /* We only use "await" in the end, when the query is fulfilled 
        & ready to fetch */
        const document = await Model.findOne(
            option,
            {
                where: { id: req.params.id }
            });
        if (!document) {
            return next(
                new AppError(
                    'Không tìm thấy thông tin với ID này',
                    StatusCodes.NOT_FOUND
                )
            );
        }

        // Send back to client
        res.resDocument = new RESDocument(StatusCodes.OK, 'success', document);

        next();
    });
}

/**
 * This controller is a middleware (req, res, next) that perform
 *  getting all records from the Database, which satisfy some of
 *  the options such as "filter", "sort", "limit", "pagination".
 *  If there is no options provided, it get all the records.
 *
 * This middleware leverage the FetchAPIFeatures.js, as it provides
 *  features
 *
 * @param {Object} Model - The model or collection pointing to
 */
export function getAll(Model: any, option?: any): RequestHandler {
    return catchAsync(async (req, res, next) => {
        // Add features to the query by leveraging fetchAPIFeatures.js
        const page = Number(req.query.page ?? 1);
        if (isNaN(page) || page < 1)
            return next(new AppError('Trang không hợp lệ', StatusCodes.BAD_REQUEST))

        const { count, rows } = await Model.findAndCountAll(option, {
            offset: (page - 1) * PAGE_LIMIT as number,
            limit: PAGE_LIMIT
        });

        if (!rows) {
            res.resDocument = new RESDocument(StatusCodes.OK, 'success', null)
            next()
        }
        const maxPage = Math.ceil(count / PAGE_LIMIT);
        if (page > maxPage)
            return next(new AppError('Trang không hợp lệ', StatusCodes.BAD_REQUEST))

        // Create a response object
        const resDocument = new RESDocument(
            StatusCodes.OK,
            'success',
            rows
        );
        resDocument.setCurrentPage(page);
        resDocument.setMaxPage(maxPage);

        res.resDocument = resDocument;

        next();
    });
}