import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { PlanDestination } from "../../models/plan_destination.model";
import catchAsync from "../../utils/catch_async";
import { Plan } from "../../models/plan.model";
import RESDocument from "../factory/res_document";
import { Personalities } from "../../models/personalities.model";
import { Roles, Status } from "../../utils/constant";
import sequelizeConnection from "../../db/sequelize.db";
import { Destination } from "../../models/destination.model";
import _ from "lodash"
import { PlanPrivateFields } from "../../utils/private_field";
import { User } from "../../models/user.model";
import { Op } from "sequelize";
import { DestinationPersonalites } from "../../models/destination_personalities.model";
import { PAGE_LIMIT } from "../../config/default";
import { getDestinationDistanceService } from "../../services/destination.service";
import { Catalog } from "../../models/catalog.model";
import { Voucher } from "../../models/voucher.model";

export const createPlan = catchAsync(async (req, res, next) => {
    const user = await User.findByPk(res.locals.user.id, {
        attributes: ['id'],
        include: [{ model: Personalities, as: 'travelerPersonalities', through: { attributes: [] }, attributes: ['name'] }]
    })
    await validate(req.body)
    const { name, isPublic, details } = req.body;
    const fromDate = new Date(req.body.fromDate)
    const toDate = new Date(req.body.toDate)
    details.sort((a: { date: number; }, b: { date: number; }) => (a.date < b.date) ? -1 : 1)
    const today = Math.floor((Date.now() - fromDate.getTime()) / (1000 * 3600 * 24))
    if (today >= 0)
        return next(new AppError('Ngày bắt đầu kể từ ngày mai', StatusCodes.BAD_REQUEST))

    const date = (toDate.getTime() - fromDate.getTime()) / (1000 * 3600 * 24) + 1
    const stayDestinationID = req.body.stayDestinationID === '' ? null : req.body.stayDestinationID
    const stay = await Destination.findOne({
        where: { id: stayDestinationID, status: Status.open },
        attributes: ['id', 'lowestPrice', 'highestPrice'],
        include: [
            { model: Catalog, as: 'catalogs', where: { [Op.or]: [{ name: { [Op.iLike]: '%Lưu Trú%' } }, { parent: { [Op.iLike]: '%Lưu Trú%' } }] }, through: { attributes: [] }, attributes: [] }
        ]
    })
    if (stayDestinationID && !stay)
        return next(new AppError('Địa điểm lưu trú không hợp lệ', StatusCodes.BAD_REQUEST))
    const id = await sequelizeConnection.transaction(async (create) => {
        const plan = await Plan.create(
            { name: name, fromDate: fromDate, toDate: toDate, stayDestinationID: stayDestinationID, isPublic: isPublic, travelerID: res.locals.user.id },
            { transaction: create })
        let cost = stay ? Math.ceil((stay.lowestPrice + stay.highestPrice) / 2) : 0;
        for (let i = 0; i < date; i++) {
            if (details[i]) {
                const tmpDate = new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * i)
                if (Math.floor((tmpDate.getTime() - new Date(details[i].date).getTime()) / (1000 * 3600 * 24)) != 0)
                    throw new AppError(`Ngày thứ ${i + 1} không hợp lệ`, StatusCodes.BAD_REQUEST)
                let hh = 8
                let mm = 0
                for (let j = 0; j < details[i].destinations.length; j++) {
                    const destination = await Destination.findOne({ where: { id: details[i].destinations[j].destinationID }, attributes: ['lowestPrice', 'highestPrice', 'estimatedTimeStay', 'status'] })
                    if (!destination || destination === null)
                        throw new AppError(`Không tìm thấy địa điểm với id: ${details[i].destinations[j].destinationID}`, StatusCodes.BAD_REQUEST)

                    if (destination.status !== Status.open)
                        throw new AppError(`Địa điểm '${destination.name}' hiện đang đóng cửa hoặc ngưng hoạt động, vui lòng chọn địa điểm khác`, StatusCodes.BAD_REQUEST)

                    cost += Math.ceil((destination.lowestPrice + destination.highestPrice) / 2)
                    const planDestination = new PlanDestination(details[i].destinations[j]);
                    planDestination.planID = plan.id;
                    planDestination.date = details[i].date;
                    planDestination.destinationName = destination.name
                    planDestination.destinationImage = destination.image

                    if (j !== 0) {
                        const distance = await getDestinationDistanceService(details[i].destinations[j - 1].destinationID, details[i].destinations[j].destinationID, planDestination.profile)
                        if (!distance)
                            throw new AppError('Có lỗi xảy ra khi tính khoảng cách giữa 2 địa điểm', StatusCodes.BAD_REQUEST)

                        hh += Math.floor((Math.ceil(distance.duration / 60) + mm) / 60)
                        mm = Math.ceil(distance.duration / 60) + mm - Math.floor((Math.ceil(distance.duration / 60) + mm) / 60) * 60
                        planDestination.distance = distance.distance
                        planDestination.duration = distance.duration
                        planDestination.distanceText = distance.distanceText
                        planDestination.durationText = distance.durationText
                    } else {
                        planDestination.distance = 0
                        planDestination.duration = 0
                        planDestination.distanceText = '0m'
                        planDestination.durationText = '0s'
                    }
                    if (hh == 23 && mm > 1 || hh > 23)
                        throw new AppError('Thời gian không đủ', StatusCodes.BAD_REQUEST)
                    const fromTime = details[i].date + ' ' + (hh < 10 ? '0' + hh : hh) + ':' + (mm < 10 ? '0' + mm : mm)
                    hh += Math.floor((destination.estimatedTimeStay + mm) / 60)
                    mm = destination.estimatedTimeStay + mm - Math.floor((destination.estimatedTimeStay + mm) / 60) * 60
                    const toTime = details[i].date + ' ' + (hh < 10 ? '0' + hh : hh) + ':' + (mm < 10 ? '0' + mm : mm)
                    planDestination.fromTime = new Date(fromTime)
                    planDestination.toTime = new Date(toTime)

                    await planDestination.save({ transaction: create })

                    if (!user || !user.travelerPersonalities)
                        throw new AppError('Vui lòng cập nhật thông tin tài khoản về "Tính cách du lịch" để sử dụng tính năng này', StatusCodes.BAD_REQUEST)

                    for (let i = 0; i < user.travelerPersonalities.length; i++) {
                        await DestinationPersonalites.findOrCreate({
                            where: { destinationID: planDestination.destinationID, personality: user?.travelerPersonalities[i].name }
                        })
                        await DestinationPersonalites.
                            increment(
                                { planCount: 1 },
                                { where: { destinationID: planDestination.destinationID, personality: user?.travelerPersonalities[i].name } }
                            )
                    }
                }
            } else {
                plan.toDate = new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * (i - 1))
            }
        }
        plan.estimatedCost = cost
        await plan.save({ transaction: create })
        return plan.id
    })

    const result = await Plan.findOne(
        {
            where: { id: id },
            attributes: { exclude: PlanPrivateFields.default },
            include: getOnePlanInclude('Draft'),
            order: [['details', 'fromTime', 'ASC']]
        });
    const plan = _.omit(result?.toJSON(), []);
    plan.travelDetails = null
    res.resDocument = new RESDocument(StatusCodes.OK, 'Tạo lịch trình thành công', { plan: plan });
    next();
});


export const updatePlan = catchAsync(async (req, res, next) => {
    const user = await User.findByPk(res.locals.user.id, {
        attributes: ['id'],
        include: [{ model: Personalities, as: 'travelerPersonalities', through: { attributes: [] }, attributes: ['name'] }]
    })
    const plan = await Plan.findOne({ where: { id: req.params.id, travelerID: res.locals.user.id, status: 'Draft' } });
    if (!plan)
        return next(new AppError('Không tìm thấy lịch trình này', StatusCodes.NOT_FOUND));

    await validate(req.body)

    const { name, isPublic, details } = req.body;
    details.sort((a: { date: number; }, b: { date: number; }) => (a.date < b.date) ? -1 : 1)
    const fromDate = new Date(req.body.fromDate)
    const toDate = new Date(req.body.toDate)
    const today = Math.floor((Date.now() - new Date(fromDate).getTime()) / (1000 * 3600 * 24))
    if (today > 0)
        return next(new AppError('Ngày bắt đầu không được trước hôm nay', StatusCodes.BAD_REQUEST))

    const date = (toDate.getTime() - fromDate.getTime()) / (1000 * 3600 * 24) + 1
    const stayDestinationID = req.body.stayDestinationID === '' ? null : req.body.stayDestinationID
    const stay = await Destination.findOne({
        where: { id: stayDestinationID, status: Status.open },
        attributes: ['id', 'lowestPrice', 'highestPrice'],
        include: [
            { model: Catalog, as: 'catalogs', where: { [Op.or]: [{ name: { [Op.iLike]: '%Lưu Trú%' } }, { parent: { [Op.iLike]: '%Lưu Trú%' } }] }, through: { attributes: [] }, attributes: [] }
        ]
    })
    if (stayDestinationID && !stay)
        return next(new AppError('Địa điểm lưu trú không hợp lệ', StatusCodes.BAD_REQUEST))
    name ? plan.name = name : 0;
    fromDate ? plan.fromDate = fromDate : 0;
    toDate ? plan.toDate = toDate : 0;
    isPublic ? plan.isPublic = isPublic : 0;
    plan.stayDestinationID = stayDestinationID

    await sequelizeConnection.transaction(async (update) => {
        await plan.save({ transaction: update });
        await PlanDestination.destroy({ where: { planID: plan.id }, transaction: update })
        let cost = stay ? Math.ceil((stay.lowestPrice + stay.highestPrice) / 2) : 0;

        for (let i = 0; i < date; i++) {
            if (details[i]) {
                const tmpDate = new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * i)

                if (Math.floor((tmpDate.getTime() - new Date(details[i].date).getTime()) / (1000 * 3600 * 24)) != 0)
                    throw new AppError(`Ngày thứ ${i + 1} không hợp lệ`, StatusCodes.BAD_REQUEST)
                let hh = 0
                let mm = 0
                for (let j = 0; j < details[i].destinations.length; j++) {
                    const destination = await Destination.findOne({
                        where: { id: details[i].destinations[j].destinationID }, attributes: ['name', 'lowestPrice', 'highestPrice', 'openingTime', 'closingTime', 'estimatedTimeStay', 'status'],
                        include: [
                            { model: Catalog, as: 'catalogs', where: { name: { [Op.notILike]: '%lưu trú%' }, parent: { [Op.notILike]: '%lưu trú%' } } }
                        ]
                    })

                    if (!destination || destination === null)
                        throw new AppError(`Không tìm thấy địa điểm với id: ${details[i].destinations[j].destinationID}`, StatusCodes.BAD_REQUEST)

                    if (destination.status === Status.closed)
                        throw new AppError(`Địa điểm '${destination.name}' hiện đang đóng cửa, vui lòng chọn địa điểm khác`, StatusCodes.BAD_REQUEST)

                    if (destination.status === Status.deactivated)
                        return next(new AppError(`Địa điểm '${destination.name}' đã bị ngưng hoạt động, vui lòng chọn địa điểm khác`, StatusCodes.BAD_REQUEST))
                    cost += Math.ceil((destination.lowestPrice + destination.highestPrice) / 2)
                    const planDestination = new PlanDestination(details[i].destinations[j]);
                    planDestination.planID = plan.id;
                    planDestination.destinationID = details[i].destinations[j].destinationID;
                    planDestination.destinationName = destination.name
                    planDestination.destinationImage = destination.image
                    planDestination.date = details[i].date;
                    const from = details[i].destinations[j].fromTime.split(' ');
                    const to = details[i].destinations[j].toTime.split(' ');
                    planDestination.fromTime = new Date(tmpDate.toLocaleDateString() + ' ' + from[from.length - 1])
                    planDestination.toTime = new Date(tmpDate.toLocaleDateString() + ' ' + to[to.length - 1])
                    if (!(planDestination.fromTime instanceof Date && !isNaN(planDestination.fromTime.getTime())))
                        throw new AppError(`Thời gian đến địa điểm '${destination.name}' không hợp lệ`, StatusCodes.BAD_REQUEST)
                    if (!(planDestination.toTime instanceof Date && !isNaN(planDestination.toTime.getTime())))
                        throw new AppError(`Thời gian rời địa điểm '${destination.name}' không hợp lệ`, StatusCodes.BAD_REQUEST)

                    if (j !== 0) {
                        const distance = await getDestinationDistanceService(details[i].destinations[j - 1].destinationID, details[i].destinations[j].destinationID, planDestination.profile)
                        if (!distance)
                            throw new AppError('Có lỗi xảy ra khi tính khoảng cách giữa 2 địa điểm', StatusCodes.BAD_REQUEST)

                        // console.log(Math.ceil(distance.duration / 60));


                        hh += Math.floor((Math.ceil(distance.duration / 60) + mm) / 60)
                        mm = Math.ceil(distance.duration / 60) + mm - Math.floor((Math.ceil(distance.duration / 60) + mm) / 60) * 60
                        const preToTime = new Date(planDestination.date + ' ' + (hh < 10 ? '0' + hh : hh) + ':' + (mm < 10 ? '0' + mm : mm))

                        if (planDestination.fromTime < preToTime)
                            throw new AppError(`Thời gian đến địa điểm '${destination.name}' không được trước ${preToTime.toLocaleString()}`, StatusCodes.BAD_REQUEST)

                        planDestination.distance = distance.distance
                        planDestination.duration = distance.duration
                        planDestination.distanceText = distance.distanceText
                        planDestination.durationText = distance.durationText
                    } else {
                        planDestination.distance = 0
                        planDestination.duration = 0
                        planDestination.distanceText = '0m'
                        planDestination.durationText = '0s'
                        // console.log(planDestination.fromTime.toLocaleString());
                        // console.log(planDestination.toTime.toLocaleString());
                        // console.log('----------------------');
                    }
                    hh = parseInt(planDestination.toTime.toLocaleTimeString().split(':')[0])
                    mm = parseInt(planDestination.toTime.toLocaleTimeString().split(':')[1])
                    await planDestination.save({ transaction: update })
                    if (!user || !user.travelerPersonalities)
                        throw new AppError('Vui lòng cập nhật thông tin tài khoản về "Tính cách du lịch" để sử dụng tính năng này', StatusCodes.BAD_REQUEST)

                    for (let i = 0; i < user.travelerPersonalities.length; i++) {
                        await DestinationPersonalites.findOrCreate({
                            where: { destinationID: planDestination.destinationID, personality: user?.travelerPersonalities[i].name }
                        })
                        await DestinationPersonalites.
                            increment(
                                { planCount: 1 },
                                { where: { destinationID: planDestination.destinationID, personality: user?.travelerPersonalities[i].name } }
                            )
                    }
                }
            } else {
                plan.toDate = new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * (i - 1))
            }
        }
        plan.estimatedCost = cost
        await plan.save({ transaction: update })
    });
    let result = await Plan.findOne(
        {
            where: { id: plan.id },
            attributes: { exclude: PlanPrivateFields.default },
            include: getOnePlanInclude(plan.status ?? 'Draft'),
            order: [['details', 'fromTime', 'ASC']]
        });

    const updated = _.omit(result?.toJSON(), []);
    updated.travelDetails = null
    res.resDocument = new RESDocument(StatusCodes.OK, 'Cập nhật lịch trình thành công', { plan: updated });
    next();
});

export const getAllCreatedPlan = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const status = ['Draft', 'Planned', 'Activated', 'Completed'].includes(req.query.status as string) ? req.query.status as string : 'Draft'
    const plans = await Plan.findAll(
        {
            where: { travelerID: res.locals.user.id, status: status == 'Completed' ? { [Op.or]: ['Completed', 'Skipped'] } : status },
            attributes: ['id', 'name', 'point', 'fromDate', 'toDate', 'estimatedCost', 'view', 'isPublic', 'createdAt'],
            include: [{ model: Destination, as: 'destinations', through: { attributes: [] }, attributes: ['name', 'image'] }],
            order: [['createdAt', 'DESC']],
            offset: (page - 1) * PAGE_LIMIT,
            limit: PAGE_LIMIT,
        });
    const count = await Plan.findAll(
        {
            where: { travelerID: res.locals.user.id, status: status == 'Completed' ? { [Op.or]: ['Completed', 'Skipped'] } : status },
            attributes: ['id'],
            include: [{ model: Destination, as: 'destinations', through: { attributes: [] }, attributes: [] }],
        });
    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { count: count.length, plans: plans }
    )
    if (count.length != 0) {
        const maxPage = Math.ceil(count.length / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;
    next()
});

export const getAllPublicPlan = catchAsync(async (req, res, next) => {
    const page = isNaN(Number(req.query.page)) || Number(req.query.page) < 1 ? 1 : Number(req.query.page)
    const orderBy = ['view', 'createdAt', 'fromDate'].includes(req.query.orderBy as string) ? req.query.orderBy as string : 'fromDate';
    const plans = await Plan.findAll(
        {
            where: { isPublic: true },
            attributes: ['id', 'name', 'point', 'fromDate', 'toDate', 'estimatedCost', 'view', 'isPublic', 'createdAt'],
            include: [{ model: Destination, as: 'destinations', through: { attributes: [] }, attributes: ['name', 'image'] }],
            order: [[orderBy, 'DESC']],
            offset: (page - 1) * PAGE_LIMIT,
            limit: PAGE_LIMIT,
        });
    const count = await Plan.findAll(
        {
            where: { isPublic: true },
            attributes: ['id'],
            include: [{ model: Destination, as: 'destinations', through: { attributes: [] }, attributes: [] }],
        });
    // Create a response object
    const resDocument = new RESDocument(
        StatusCodes.OK,
        'success',
        { count: count.length, plans: plans }
    )
    if (count.length != 0) {
        const maxPage = Math.ceil(count.length / PAGE_LIMIT)
        resDocument.setCurrentPage(page)
        resDocument.setMaxPage(maxPage)
    }
    res.resDocument = resDocument;
    next()
});

export const getOnePlan = catchAsync(async (req, res, next) => {
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
    if (res.locals.user.roleID === Roles.Traveler) {
        await Plan.increment({ view: 1 }, { where: { id: req.params.id } })
    }
    const check = await Plan.findOne({
        where: { id: req.params.id, [Op.or]: [{ travelerID: res.locals.user.id }, { isPublic: true }] },
        attributes: ['id', 'status']
    })
    if (!check)
        return next(new AppError('Không tìm thấy lịch trình này này', StatusCodes.NOT_FOUND));
    const result = await Plan.findOne(
        {
            where: { id: req.params.id, [Op.or]: [{ travelerID: res.locals.user.id }, { isPublic: true }] },
            attributes: { exclude: PlanPrivateFields.default },
            include: getOnePlanInclude(check.status ?? 'Draft'),
            order: check.status !== 'Completed' ? [['details', 'fromTime', 'ASC']] : [['details', 'fromTime', 'ASC'],['travelDetails', 'fromTime', 'ASC']]
        });

    if (!result)
        return next(new AppError('Không tìm thấy lịch trình này này', StatusCodes.NOT_FOUND));
    const plan = _.omit(result.toJSON(), []);
    if (check.status !== 'Completed')
        plan.travelDetails = null
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { plan });
    next();
})

export const duplicatePlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findOne({ where: { id: req.params.id } });

    if (!plan)
        return next(new AppError('Không tìm thấy lịch trình này', StatusCodes.NOT_FOUND));

    const today = Math.floor((Date.now() - new Date(plan.fromDate).getTime()) / (1000 * 3600 * 24))
    if (today >= 0)
        return next(new AppError('Bạn chỉ có thể sao chép lịch trình bắt đầu kể từ ngày mai', StatusCodes.BAD_REQUEST))
    const newPlan = new Plan()
    newPlan.name = plan.name + ' (Bản sao)'
    newPlan.fromDate = plan.fromDate
    newPlan.toDate = plan.toDate
    newPlan.stayDestinationID = plan.stayDestinationID
    newPlan.estimatedCost = plan.estimatedCost
    newPlan.isPublic = false
    newPlan.travelerID = res.locals.user.id

    const details = await PlanDestination.findAll({ where: { planID: plan.id, isPlan: true } })
    const id = await sequelizeConnection.transaction(async (duplicate) => {
        await newPlan.save({ transaction: duplicate })
        for (let i = 0; i < details.length; i++) {
            const newDetail = new PlanDestination()
            newDetail.planID = newPlan.id
            newDetail.destinationID = details[i].destinationID
            newDetail.date = details[i].date
            newDetail.fromTime = details[i].fromTime
            newDetail.toTime = details[i].toTime
            newDetail.distance = details[i].distance
            newDetail.duration = details[i].duration
            newDetail.profile = details[i].profile
            newDetail.distanceText = details[i].distanceText
            newDetail.durationText = details[i].durationText
            newDetail.destinationName = details[i].destinationName
            newDetail.destinationImage = details[i].destinationImage
            await newDetail.save({ transaction: duplicate })
        }
        return newPlan.id
    })

    const result = await Plan.findOne(
        {
            where: { id: id },
            attributes: { exclude: PlanPrivateFields.default },
            include: getOnePlanInclude('Draft'),
            order: [['details', 'fromTime', 'ASC']]
        });
    const onePlan = _.omit(result?.toJSON(), []);
    onePlan.travelDetails = null
    res.resDocument = new RESDocument(StatusCodes.OK, 'Sao chép lịch trình thành công', { plan: onePlan });
    next();
})

export const deletePlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findOne({ where: { id: req.params.id, status: 'Draft', travelerID: res.locals.user.id } });

    if (!plan)
        return next(new AppError('Không tìm thấy lịch trình này', StatusCodes.NOT_FOUND));

    await plan.destroy()
    res.resDocument = new RESDocument(StatusCodes.NO_CONTENT, 'Xoá lịch trình thành công', null);
    next();
})

const validate = async (body: any) => {
    const { details } = body;
    if (!details || details.length == 0)
        throw new AppError('Chi tiết lịch trình không được trống', StatusCodes.BAD_REQUEST)
    for (let i = 0; i < details.length; i++) {
        if (!details[i].destinations || details[i].destinations.length == 0)
            throw new AppError('Địa điểm không được trống', StatusCodes.BAD_REQUEST)
    };
}

export const getOnePlanInclude = (status: string) => status == 'Draft' || status == 'Smart' ? [
    { model: User, as: 'traveler', attributes: ['email', 'name', 'avatar'] },
    { model: Destination, as: 'stayDestination', attributes: ['id', 'name', 'address', 'image', 'lowestPrice', 'highestPrice', 'status'] },
    { model: Destination, as: 'actualStayDestination', attributes: ['id', 'name', 'address', 'image', 'lowestPrice', 'highestPrice', 'status'] },
    {
        model: PlanDestination, as: 'details', attributes: ['date', 'fromTime', 'toTime', 'distance', 'duration', 'distanceText', 'durationText', 'status', 'rating', 'description'],
        where: { isPlan: true },
        include: [
            {
                model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'openingTime', 'closingTime', 'lowestPrice', 'highestPrice', 'longitude', 'latitude', 'isHaveVoucher', 'estimatedTimeStay', 'status']
            }
        ]
    },
    {
        model: PlanDestination, as: 'travelDetails', attributes: ['date'],
    }
] : (status == 'Completed' ? [
    { model: User, as: 'traveler', attributes: ['email', 'name', 'avatar'] },
    { model: Destination, as: 'stayDestination', attributes: ['id', 'name', 'address', 'image', 'lowestPrice', 'highestPrice', 'status'] },
    { model: Destination, as: 'actualStayDestination', attributes: ['id', 'name', 'address', 'image', 'lowestPrice', 'highestPrice', 'status'] },
    {
        model: PlanDestination, as: 'details', attributes: ['date', 'fromTime', 'toTime', 'distance', 'duration', 'distanceText', 'durationText', 'status', 'rating', 'description'],
        where: { isPlan: true },
        include: [
            {
                model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'openingTime', 'closingTime', 'lowestPrice', 'highestPrice', 'longitude', 'latitude', 'isHaveVoucher', 'estimatedTimeStay', 'status']
            }
        ]
    },
    {
        model: PlanDestination, as: 'travelDetails', attributes: ['date', 'fromTime', 'toTime', 'distance', 'duration', 'distanceText', 'durationText', 'status', 'rating', 'description'],
        where: { isPlan: false },
        include: [
            {
                model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'openingTime', 'closingTime', 'lowestPrice', 'highestPrice', 'longitude', 'latitude', 'isHaveVoucher', 'estimatedTimeStay', 'status']
            }
        ]
    }
] : [
    { model: User, as: 'traveler', attributes: ['email', 'name', 'avatar'] },
    { model: Destination, as: 'stayDestination', attributes: ['id', 'name', 'address', 'image', 'lowestPrice', 'highestPrice', 'status'] },
    { model: Destination, as: 'actualStayDestination', attributes: ['id', 'name', 'address', 'image', 'lowestPrice', 'highestPrice', 'status'] },
    {
        model: PlanDestination, as: 'details', attributes: ['date', 'fromTime', 'toTime', 'distance', 'duration', 'distanceText', 'durationText', 'status', 'rating', 'description'],
        where: { isPlan: false },
        include: [
            {
                model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'openingTime', 'closingTime', 'lowestPrice', 'highestPrice', 'longitude', 'latitude', 'isHaveVoucher', 'estimatedTimeStay', 'status']
            }
        ]
    },
    {
        model: PlanDestination, as: 'travelDetails', attributes: ['date'],
    }
])


// const includeDetailGetOne = [
//     { model: User, as: 'traveler', attributes: ['email', 'name', 'avatar'] },
//     { model: Destination, as: 'stayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
//     { model: Destination, as: 'actualStayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
//     {
//         model: PlanDestination, as: 'details', attributes: ['date', 'fromTime', 'toTime', 'distance', 'duration', 'distanceText', 'durationText', 'status'],
//         where: { isPlan: true },
//         include: [
//             {
//                 model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'openingTime', 'closingTime', 'estimatedTimeStay', 'status']
//             }
//         ]
//     },
//     {
//         model: PlanDestination, as: 'travelDetails', attributes: ['date'],
//     }
// ]

// const includeDetailGetOneCompleted = [
//     { model: User, as: 'traveler', attributes: ['email', 'name', 'avatar'] },
//     { model: Destination, as: 'stayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
//     { model: Destination, as: 'actualStayDestination', attributes: ['id', 'name', 'address', 'image', 'status'] },
//     {
//         model: PlanDestination, as: 'details', attributes: ['date', 'fromTime', 'toTime', 'distance', 'duration', 'distanceText', 'durationText', 'status'],
//         where: { isPlan: true },
//         include: [
//             {
//                 model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'openingTime', 'closingTime', 'estimatedTimeStay', 'status']
//             }
//         ]
//     },
//     {
//         model: PlanDestination, as: 'travelDetails', attributes: ['date', 'fromTime', 'toTime', 'distance', 'duration', 'distanceText', 'durationText', 'status'],
//         where: { isPlan: false },
//         include: [
//             {
//                 model: Destination, as: 'destination', attributes: ['id', 'name', 'address', 'image', 'openingTime', 'closingTime', 'estimatedTimeStay', 'status']
//             }
//         ]
//     }
// ]