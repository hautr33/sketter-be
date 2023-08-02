import catch_async from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import { StatusCodes } from "http-status-codes";
import { City } from "../../models/city.model";

/**
 * This controller is getAllCities that get all cities
 *
 */
export const getAllCities = catch_async(async (_req, res, next) => {
    const cities = await City.findAll({ order: ['name'] })
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { cities });
    next()
})