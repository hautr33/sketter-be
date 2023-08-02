import catch_async from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import { StatusCodes } from "http-status-codes";
import { TimeFrame } from "../../models/time_frame.model";

/**
 * This controller is getAllTimeFrames that get all time frames
 *
 */
export const getAllTimeFrames = catch_async(async (_req, res, next) => {
    const timeFrames = await TimeFrame.findAll()
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { timeFrames });
    next()
})