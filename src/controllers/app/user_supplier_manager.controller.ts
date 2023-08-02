import { StatusCodes } from "http-status-codes";
import { Roles } from "../../utils/constant";
import catchAsync from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import { User } from "../../models/user.model";
import _ from "lodash"
import { UserPrivateFields } from "../../utils/private_field";

export const getAllSupplier = catchAsync(async (_req, res, next) => {
    const suppliers = await User.findAll({ where: { roleID: Roles.Supplier }, attributes: { exclude: UserPrivateFields[Roles.Supplier] } })
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { suppliers });
    next();
});