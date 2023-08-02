import catch_async from "../../utils/catch_async";
import { Personalities } from "../../models/personalities.model";
import RESDocument from "../factory/res_document";
import { StatusCodes } from "http-status-codes";
import _ from "lodash";

export const getAllPersonalities = catch_async(async (_req, res, next) => {
    const result = await Personalities.findAll({
        order: [['name', 'ASC']]
    })
    const personalities = _.map(result, function (personality) { return personality.name; })
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { personalities });
    next()
})