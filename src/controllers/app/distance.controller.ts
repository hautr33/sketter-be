import catch_async from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import { StatusCodes } from "http-status-codes";
import { getDestinationDistanceService } from "../../services/destination.service";

/**
 * This controller is getDistance that get distance and duration between two destination
 *
 */
export const getDistance = catch_async(async (req, res, next) => {
    const { fromDestination, toDestination, profile } = req.body;
    const distance = await getDestinationDistanceService(fromDestination, toDestination, profile)
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { distance });
    next()

})