import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { Catalog } from "../../models/catalog.model";
import { Destination } from "../../models/destination.model";
import catchAsync from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import { Roles, Status } from "../../utils/constant";
import { PAGE_LIMIT } from "../../config/default";
import { DestinationImage } from "../../models/destination_image.model";
import sequelizeConnection from "../../db/sequelize.db";
import _ from "lodash"
import { Op, Sequelize } from "sequelize";
import { User } from "../../models/user.model";
import { TimeFrame } from "../../models/time_frame.model";
import { Personalities } from "../../models/personalities.model";
import { City } from "../../models/city.model";
import { DestinationBookmark } from "../../models/destination_bookmark.model";
import { DestinationPrivateFields } from "../../utils/private_field";
import { Voucher } from "../../models/voucher.model";
const jsrmvi = require('jsrmvi');
const { removeVI } = jsrmvi;

export const createDestination = catchAsync(async (req, res, next) => {
    const supplierID = res.locals.user.roleID === Roles.Supplier ? res.locals.user.id : req.body.supplierID;
    let error = await validate(req.body)
    if (error != null)
        return next(new AppError(error, StatusCodes.BAD_REQUEST))

    const { cityID, name, address, phone, email, description, longitude, latitude, lowestPrice, highestPrice,
        openingTime, closingTime, estimatedTimeStay, catalogs, destinationPersonalities
    } = req.body;
    const recommendedTimes: (number)[] = [];
    for (let i = 0; i < req.body.recommendedTimes.length; i++) {
        const timeFrame = await TimeFrame.findOne({ where: { from: req.body.recommendedTimes[i].from, to: req.body.recommendedTimes[i].to } })
        if (!timeFrame)
            throw new AppError('Khung thời gian không hợp lệ', StatusCodes.BAD_REQUEST)
        recommendedTimes.push(timeFrame.id)
    }


    const latinName = removeVI(name, { replaceSpecialCharacters: false })
    const gallery = req.body.gallery as DestinationImage[]
    const createdBy = res.locals.user.id;
    const result = await sequelizeConnection.transaction(async (create) => {

        const destination = await Destination.create({
            name: name, address: address, phone: phone, email: email, description: description, image: gallery[0].url, latinName: latinName,
            longitude: longitude, latitude: latitude, lowestPrice: lowestPrice, highestPrice: highestPrice, cityID: cityID,
            openingTime: openingTime, closingTime: closingTime, estimatedTimeStay: estimatedTimeStay, supplierID: supplierID, createdBy: createdBy
        }, { transaction: create })
        await destination.addCatalogs(catalogs, { transaction: create })
        await destination.addDestinationPersonalities(destinationPersonalities, { transaction: create })
        await destination.addRecommendedTimes(recommendedTimes, { transaction: create })
        for (let i = 0; i < gallery.length; i++) {
            await destination.createGallery(gallery[i], { transaction: create })
        }
        return destination
    })

    const destination = await Destination.findOne({ where: { id: result.id }, attributes: ['id', 'name', 'address', 'image'] })
    res.resDocument = new RESDocument(StatusCodes.OK, 'Tạo địa điểm thành công', { destination })
    next()
})

export const updateDestination = catchAsync(async (req, res, next) => {
    const query = res.locals.user.roleID === Roles.Supplier ? { id: req.params.id, supplierID: res.locals.user.id, status: { [Op.ne]: Status.deactivated } } : { id: req.params.id, status: { [Op.ne]: Status.deactivated } }
    const destination = await Destination.findOne({
        where: query,
        include: [
            { model: TimeFrame, as: 'recommendedTimes', through: { attributes: [] }, attributes: ['from', 'to'] },
        ]
    })
    if (!destination)
        return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND))

    const { name, address, phone, email, description, lowestPrice, highestPrice,
        openingTime, closingTime, catalogs, estimatedTimeStay, status
    } = req.body;

    const recommendedTimes: (number)[] = [];
    for (let i = 0; i < req.body.recommendedTimes.length; i++) {
        const timeFrame = await TimeFrame.findOne({ where: { from: req.body.recommendedTimes[i].from, to: req.body.recommendedTimes[i].to } })
        if (!timeFrame)
            throw new AppError('Khung thời gian không hợp lệ', StatusCodes.BAD_REQUEST)
        recommendedTimes.push(timeFrame.id)
    }

    const latinName = removeVI(name, { replaceSpecialCharacters: false })
    const gallery = req.body.gallery as DestinationImage[]

    if (res.locals.user.roleID == Roles.Manager) {
        const { longitude, latitude } = req.body;
        longitude ? destination.longitude = longitude : 0
        latitude ? destination.latitude = latitude : 0
    }
    gallery.length > 0 ? destination.image = gallery[0].url : 0
    name ? destination.name = name : 0
    name ? destination.latinName = latinName : 0
    address ? destination.address = address : 0
    phone ? destination.phone = phone : 0
    email ? destination.email = email : 0
    description ? destination.description = description : 0
    lowestPrice ? destination.lowestPrice = lowestPrice : 0
    highestPrice ? destination.highestPrice = highestPrice : 0
    openingTime ? destination.openingTime = openingTime : 0
    closingTime ? destination.closingTime = closingTime : 0
    estimatedTimeStay || estimatedTimeStay === 0 ? destination.estimatedTimeStay = estimatedTimeStay : 0;
    [Status.open, Status.closed].includes(status as string) ? destination.status = status : 0
    await sequelizeConnection.transaction(async (update) => {
        await destination.save({ transaction: update })
        catalogs ? await destination.setCatalogs(catalogs, { transaction: update }) : 0
        recommendedTimes ? await destination.setRecommendedTimes(recommendedTimes, { transaction: update }) : 0
        if (gallery) {
            await DestinationImage.destroy({ where: { destinationID: destination.id }, transaction: update })
            for (let i = 0; i < gallery.length; i++) {
                await destination.createGallery(gallery[i], { transaction: update })
            }
        }
        return destination
    })

    res.resDocument = new RESDocument(StatusCodes.OK, 'Cập nhật địa điểm thành công', null)
    next()
})

export const searchDestination = catchAsync(async (req, res, next) => {

    const des = await Destination.findAll({
        where: { status: 'Open' }, attributes: ['id'],
        include: [
            { model: Voucher, as: 'vouchers', where: { status: 'Activated' }, attributes: [] }
        ]
    })
    await Destination.update({ isHaveVoucher: false }, { where: { isHaveVoucher: true } })
    for (let i = 0; i < des.length; i++) {
        await Destination.update({ isHaveVoucher: true }, { where: { id: des[i].id } })
    }
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const cityID = isNaN(Number(req.query.cityID)) || !req.query.cityID ? 1 : Number(req.query.cityID)
    const name = req.query.name as string ?? '';
    const catalog = req.query.catalog as string;
    const orderBy = ['createdAt', 'name', 'avgRating', 'lowestPrice', 'highestPrice'].includes(req.query.orderBy as string) ? req.query.orderBy as string : 'name';
    const orderDirection = (req.query.isOrderASC as string) === 'true' ? 'ASC' : 'DESC';
    const skipStay = req.query.skipStay === 'true' ? true : false
    const catalogQuery = `WHERE desCata."catalogName" IN (SELECT "name"
        FROM public."Catalogs" as cata
        WHERE cata."name" ILIKE '%${catalog}%'
        OR cata."parent" ILIKE '%${catalog}%')`
    const supplierID = res.locals.user.roleID === Roles.Supplier ? res.locals.user.id : null
    const status = res.locals.user.roleID === Roles.Traveler ? Status.open : req.query.status ?? ''
    const destinationQuery = supplierID === null ? {
        [Op.or]: [{ name: { [Op.iLike]: `%${name}%` } }, { latinName: { [Op.iLike]: `%${name}%` } }],
        status: { [Op.like]: `%${status}%` },
        cityID: cityID,
        id: {
            [Op.in]: Sequelize.literal(`(
                SELECT "destinationID"
                FROM public."DestinationCatalogs" as desCata
                ${catalog ? catalogQuery : ''}
        )`)
        }
    } : {
        [Op.or]: [{ name: { [Op.iLike]: `%${name}%` } }, { latinName: { [Op.iLike]: `%${name}%` } }],
        status: { [Op.like]: `%${status}%` },
        supplierID: supplierID,
        cityID: cityID,
        id: {
            [Op.in]: Sequelize.literal(`(
                SELECT "destinationID"
                FROM public."DestinationCatalogs" as desCata
                ${catalog ? catalogQuery : ''}
        )`)
        }
    }
    const result = await Destination.findAll({
        where: destinationQuery,
        attributes: ['id', 'name', 'address', 'image', 'lowestPrice', 'highestPrice', 'avgRating', 'view', 'isHaveVoucher', 'status', 'createdAt'],
        include: defaultInclude(false, skipStay),
        order: [[orderBy, orderDirection]],
        offset: (page - 1) * PAGE_LIMIT,
        limit: PAGE_LIMIT
    })

    // const destinations = []
    // for (let i = 0; i < result.length; i++) {
    //     const destination = _.omit(result[i].toJSON(), []);
    //     const check = await Voucher.count({ where: { destinationID: destination.id, status: 'Activated' } })
    //     const isHaveVoucher = check > 0 ? true : false
    //     destination.isHaveVoucher = isHaveVoucher
    //     destinations.push(destination)
    // }

    const count = await Destination.findAll({
        where: destinationQuery,
        attributes: ['id'],
        include: defaultInclude(true, skipStay),
    })

    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { count: count.length, destinations: result }
    )
    if (count.length != 0) {
        const maxPage = Math.ceil(count.length / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;
    next()
})

export const getAllDestination = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const skipStay = req.query.skipStay === 'true' ? true : false
    const roleID = res.locals.user.roleID;
    let option = {}
    let privatFields = DestinationPrivateFields.default

    if (roleID == Roles.Supplier) {
        option = { supplierID: res.locals.user.id }
        privatFields = DestinationPrivateFields.getAllSupplier
    } else if (roleID == Roles.Traveler) {
        option = { status: Status.open }
        privatFields = DestinationPrivateFields.getAllTraveler
    }

    const destinations = await Destination.findAll(
        {
            where: option,
            attributes: { exclude: privatFields },
            include: defaultInclude(false, skipStay),
            order: [['name', 'ASC']],
            offset: (page - 1) * PAGE_LIMIT,
            limit: PAGE_LIMIT,
        }
    )

    const count = await Destination.findAll(
        {
            where: option,
            attributes: ['id'],
            include: defaultInclude(true, skipStay)
        }
    )
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

export const getOneDestination = catchAsync(async (req, res, next) => {
    const role = res.locals.user.roleID;
    if (role === Roles.Traveler) {
        await Destination.increment({ view: 1 }, { where: { id: req.params.id } })
    }
    const query = role === Roles.Traveler ? { id: req.params.id, status: Status.open } : (
        role === Roles.Supplier ? { id: req.params.id, supplierID: res.locals.user.id } : { id: req.params.id }
    )

    const result = await Destination.findOne({
        where: query,
        attributes: { exclude: DestinationPrivateFields.default },
        include: destinationInclude
    })

    if (!result || result === null)
        return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND))

    const destination = _.omit(result.toJSON(), []);

    if (role === Roles.Traveler) {
        const count = await DestinationBookmark.count({ where: { destinationID: result.id, travelerID: res.locals.user.id, isBookmark: true } })
        count === 1 ? destination.isBookmarked = true : destination.isBookmarked = false
    }

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { destination })
    next()
})

export const deactivateDestination = catchAsync(async (req, res, next) => {
    const count = await Destination.count({ where: { id: req.params.id, status: { [Op.ne]: Status.deactivated } } })

    if (count !== 1)
        return next(new AppError('Không tìm thấy địa điểm với ID này', StatusCodes.NOT_FOUND))

    await Destination.update({ status: Status.deactivated }, { where: { id: req.params.id } })
    res.resDocument = new RESDocument(StatusCodes.OK, 'Huỷ kích hoạt địa điểm thành công', null)
    next()
})

export const deleteOneDestination = catchAsync(async (req, res, next) => {
    const des = await Destination.findOne({ where: { id: req.params.id }, attributes: ['id', 'supplierID'] })
    if (!des || (res.locals.user.roleID == Roles.Supplier && des.supplierID !== res.locals.user.id))
        return next(new AppError('Không tìm thấy địa điểm với ID này', StatusCodes.NOT_FOUND))

    if (res.locals.user.roleID === Roles.Manager && des.supplierID !== null)
        return next(new AppError('Không thể xoá địa điểm có chủ sở hữu', StatusCodes.BAD_REQUEST))

    await Destination.destroy({ where: { id: req.params.id } })
    res.resDocument = new RESDocument(StatusCodes.NO_CONTENT, 'Đã xoá địa điểm', null)
    next()
})

const validate = async (body: any) => {
    const { catalogs, recommendedTimes } = body;

    const gallery = body.gallery as DestinationImage[]

    if (!catalogs || catalogs === '' || catalogs === null || catalogs.length === 0)
        throw new AppError('Vui lòng chọn loại địa điểm', StatusCodes.BAD_REQUEST)

    if (!gallery || gallery === null || gallery.length === 0)
        throw new AppError('Vui lòng thêm ảnh vào địa điểm', StatusCodes.BAD_REQUEST)

    if (!recommendedTimes || recommendedTimes === null || recommendedTimes.length === 0)
        throw new AppError('Vui lòng thêm khung giờ lý tưởng vào địa điểm', StatusCodes.BAD_REQUEST)
}

const destinationInclude = [
    { model: Catalog, as: 'catalogs', through: { attributes: [] }, attributes: ['name'] },
    { model: TimeFrame, as: 'recommendedTimes', through: { attributes: ['planCount', 'visitCount'], as: 'count' }, attributes: ['from', 'to'] },
    { model: Personalities, as: 'destinationPersonalities', through: { attributes: ['planCount', 'visitCount'], as: 'count' }, attributes: ['name'] },
    { model: DestinationImage, as: 'gallery', attributes: { exclude: ['destinationID', 'id'] } },
    { model: User, as: 'supplier', attributes: ['id', 'email', 'name', 'avatar', 'phone'] },
    { model: City, as: 'city', attributes: ['name'] }
]

const defaultInclude = (count: boolean, skipStay: boolean) => [
    {
        model: Catalog,
        where: skipStay ? { name: { [Op.notILike]: '%Lưu Trú%' }, parent: { [Op.notILike]: '%Lưu Trú%' } } : {},
        as: 'catalogs',
        through: { attributes: [] },
        attributes: count ? [] : ['name']
    }
]