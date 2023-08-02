import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { Destination } from "../../models/destination.model";
import catchAsync from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import { Status } from "../../utils/constant";
import { PAGE_LIMIT } from "../../config/default";
import _ from "lodash"
import { Op, Sequelize } from "sequelize";
import { DestinationBookmark } from "../../models/destination_bookmark.model";
import { Catalog } from "../../models/catalog.model";

export const bookmarkDestination = catchAsync(async (req, res, next) => {
    const id = req.params.id as string;
    const destination = await Destination.findOne({ where: { id: id, status: Status.open } })
    if (!destination)
        return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND))

    const [bookmark, created] = await DestinationBookmark.findOrCreate({ where: { destinationID: destination.id, travelerID: res.locals.user.id } })
    if (created) {
        res.resDocument = new RESDocument(StatusCodes.OK, 'Đã thêm địa điểm vào mục yêu thích', null)
    } else {
        bookmark.isBookmark = bookmark.isBookmark === true ? false : true
        await bookmark.save()
        if (bookmark.isBookmark) {
            res.resDocument = new RESDocument(StatusCodes.OK, 'Đã thêm địa điểm vào mục yêu thích', null)
        } else {
            res.resDocument = new RESDocument(StatusCodes.OK, 'Đã xóa địa điểm khỏi mục yêu thích', null)
        }
    }
    next()
})

export const getBookmarkDestination = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const query = {
        id: {
            [Op.in]: Sequelize.literal(`(
            SELECT "destinationID"
            FROM public."DestinationBookmarks" AS bookmark
            WHERE
                bookmark."isBookmark" = true
                AND
                bookmark."travelerID" = '${res.locals.user.id}'
    )`)
        }
    }

    const destinations = await Destination.findAll({
        where: query,
        attributes: ['id', 'name', 'address', 'image', 'lowestPrice', 'highestPrice', 'avgRating', 'view','isHaveVoucher', 'status', 'createdAt'],
        include: defaultInclude(false),
        order: [['name', 'ASC']],
        offset: (page - 1) * PAGE_LIMIT,
        limit: PAGE_LIMIT,
    })
    const count = await Destination.findAll({
        where: query,
        attributes: ['id'],
        include: defaultInclude(true),
    })
    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { count: count.length, destinations }
    )
    if (count.length != 0) {
        const maxPage = Math.ceil(count.length / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;

    next()
})

const defaultInclude = (count: boolean) => [
    {
        model: Catalog,
        as: 'catalogs',
        through: { attributes: [] },
        attributes: count ? [] : ['name']
    }
]