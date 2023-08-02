import catch_async from "../../utils/catch_async";
import { Catalog } from "../../models/catalog.model";
import RESDocument from "../factory/res_document";
import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { Op } from "sequelize";
import { Roles } from "../../utils/constant";

/**
 * This controller is getAllCatalog that get all destination catalogs
 *
 */
export const getAllCatalog = catch_async(async (req, res, next) => {
    const skipStay = req.query.skipStay === 'true' ? true : false
    const catalogs = await Catalog.findAll(
        {
            where: skipStay ? { name: { [Op.notILike]: '%Lưu Trú%' }, parent: null } : { parent: null },
            attributes: ['name'],
            include: [
                {
                    model: Catalog, as: 'sub', attributes: res.locals.user.roleID === Roles.Admin ? ['name', 'deletedAt'] : ['name'],
                    paranoid: res.locals.user.roleID === Roles.Admin ? false : true,
                }
            ]
        }
    )
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { catalogs });
    next()
})

/**
 * This controller is createCatalog that get all catalogs
 *
 */
export const createCatalog = catch_async(async (req, res, next) => {
    const { name, parent } = req.body;

    const count = await Catalog.count({ where: { name: parent, parent: null } });
    if (count !== 1)
        return next(new AppError('Loại địa điểm cha không hợp lệ', StatusCodes.BAD_REQUEST));

    await Catalog.create({ name: name, parent: parent })
    res.resDocument = new RESDocument(StatusCodes.OK, `Đã thêm loại địa điểm "${name}" vào "${parent}"`, null);

    next()
})

export const disableCatalog = catch_async(async (req, res, next) => {
    const action = req.query.action ? (req.query.action as string).toLowerCase() : null;

    const count = await Catalog.count({ where: { name: req.params.name, parent: { [Op.ne]: null }, deletedAt: action === 'enable' ? { [Op.ne]: null } : null }, paranoid: action === 'enable' ? false : true })
    if (count !== 1)
        return next(new AppError(`Không tìm thấy loại địa điểm "${req.params.name}"`, StatusCodes.BAD_REQUEST));

    if (action === 'disable')
        await Catalog.destroy({ where: { name: req.params.name } })
    else if (action === 'enable')
        await Catalog.restore({ where: { name: req.params.name } })
    else
        return next(new AppError(`Hành động không hợp lệ`, StatusCodes.BAD_REQUEST));

    const message = action === 'disable' ? `Vô hiệu hoá loại địa điểm "${req.params.name}" thành công` : `Kích hoạt loại địa điểm "${req.params.name}" thành công`
    res.resDocument = new RESDocument(StatusCodes.OK, message, null);
    next()
})