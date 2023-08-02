import { StatusCodes } from "http-status-codes";
import AppError from "../../utils/app_error";
import { PlanDestination } from "../../models/plan_destination.model";
import catchAsync from "../../utils/catch_async";
import { Plan } from "../../models/plan.model";
import RESDocument from "../factory/res_document";
import { Status } from "../../utils/constant";
import sequelizeConnection from "../../db/sequelize.db";
import { Destination } from "../../models/destination.model";
import _ from "lodash"
import { PlanPrivateFields } from "../../utils/private_field";
import { Op } from "sequelize";
import { getDestinationDistanceService } from "../../services/destination.service";
import { Catalog } from "../../models/catalog.model";
import { getOnePlanInclude } from "./plan.controller";

export const saveDraftPlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findOne({ where: { id: req.params.id, status: 'Draft', travelerID: res.locals.user.id } });

    if (!plan)
        return next(new AppError('Không tìm thấy lịch trình này', StatusCodes.NOT_FOUND));

    const date = Date.now()
    if (Math.floor((date - new Date(plan.fromDate).getTime()) / (1000 * 3600 * 24)) >= 0)
        throw new AppError(`Ngày bắt đầu kể từ ngày mai`, StatusCodes.BAD_REQUEST)

    const planDes = await PlanDestination.findAll({ where: { planID: plan.id } })
    let maxDate = plan.fromDate
    await sequelizeConnection.transaction(async (save) => {
        for (let i = 0; i < planDes.length; i++) {

            if (planDes[i].date > maxDate)
                maxDate = planDes[i].date

            const destination = await Destination.findOne({ where: { id: planDes[i].destinationID } })
            if (!destination || destination.status !== 'Open')
                throw new AppError(`Địa điểm '${destination ? destination.name : planDes[i].destinationName}' hiện đang đóng cửa, vui lòng chọn địa điểm khác`, StatusCodes.BAD_REQUEST)
            planDes[i].destinationName = destination.name
            planDes[i].destinationImage = destination.image
            const cloneDes = new PlanDestination();
            cloneDes.planID = planDes[i].planID
            cloneDes.destinationID = planDes[i].destinationID
            cloneDes.date = planDes[i].date
            cloneDes.fromTime = planDes[i].fromTime
            cloneDes.toTime = planDes[i].toTime
            cloneDes.distance = planDes[i].distance
            cloneDes.duration = planDes[i].duration
            cloneDes.profile = planDes[i].profile
            cloneDes.distanceText = planDes[i].distanceText
            cloneDes.durationText = planDes[i].durationText
            cloneDes.destinationName = planDes[i].destinationName
            cloneDes.destinationImage = planDes[i].destinationImage
            cloneDes.status = planDes[i].status
            cloneDes.isPlan = false
            await cloneDes.save({ transaction: save })
            await planDes[i].save({ transaction: save })
        }
        plan.toDate = maxDate
        plan.actualCost = plan.estimatedCost
        plan.actualStayDestinationID = plan.stayDestinationID
        plan.status = 'Planned'
        await plan.save({ transaction: save })
    })

    res.resDocument = new RESDocument(StatusCodes.OK, `Bạn đã hoàn tất việc lên kế hoạch cho "${plan.name}"`, null);
    next();
})

export const checkinPlan = catchAsync(async (req, res, next) => {

    const plan = await Plan.findOne({ where: { id: req.params.id, travelerID: res.locals.user.id, status: 'Activated' } });
    if (!plan)
        return next(new AppError('Không tìm thấy lịch trình này', StatusCodes.NOT_FOUND));

    const { totalCost, details } = req.body;
    details.sort((a: { date: number; }, b: { date: number; }) => (a.date < b.date) ? -1 : 1)

    const now = Date.now() < new Date(plan.toDate).getTime() ? Date.now() : new Date(plan.toDate).getTime();
    const date = Math.floor((now - new Date(plan.fromDate).getTime()) / (1000 * 3600 * 24)) + 1
    const stayDestinationID = req.body.stayDestinationID === '' ? null : req.body.stayDestinationID
    const stay = await Destination.findOne({
        where: { id: stayDestinationID, status: Status.open },
        attributes: ['id'],
        include: [
            { model: Catalog, as: 'catalogs', where: { [Op.or]: [{ name: { [Op.iLike]: '%Lưu Trú%' } }, { parent: { [Op.iLike]: '%Lưu Trú%' } }] }, through: { attributes: [] }, attributes: [] }
        ]
    })
    if (stayDestinationID && !stay)
        return next(new AppError('Địa điểm lưu trú không hợp lệ', StatusCodes.BAD_REQUEST))
    plan.actualStayDestinationID = stayDestinationID
    plan.actualCost = totalCost

    await sequelizeConnection.transaction(async (checkin) => {
        await plan.save({ transaction: checkin });

        for (let i = 0; i < date; i++) {
            const tmpDate = new Date(new Date(plan.fromDate).getTime() + 1000 * 3600 * 24 * i)
            if (details[i] && (Math.floor((tmpDate.getTime() - new Date(details[i].date).getTime()) / (1000 * 3600 * 24)) == 0)) {


                await PlanDestination.destroy({ where: { planID: plan.id, isPlan: false, date: tmpDate }, transaction: checkin })
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
                    const planDestination = new PlanDestination();
                    planDestination.planID = plan.id;
                    planDestination.destinationID = details[i].destinations[j].destinationID;
                    planDestination.status = details[i].destinations[j].status;
                    planDestination.destinationName = destination.name
                    planDestination.destinationImage = destination.image
                    planDestination.profile = 'driving'
                    planDestination.date = details[i].date;
                    planDestination.isPlan = false
                    planDestination.rating = details[i].destinations[j].rating == 0 ? null : details[i].destinations[j].rating;
                    planDestination.description = details[i].destinations[j].description == '' ? null : details[i].destinations[j].description;
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
                    await planDestination.save({ transaction: checkin })
                }
            } else
                throw new AppError(`Ngày thứ ${i + 1} không hợp lệ`, StatusCodes.BAD_REQUEST)
        }
        await plan.save({ transaction: checkin })
    });
    const result = await Plan.findOne(
        {
            where: { id: plan.id },
            attributes: { exclude: PlanPrivateFields.default },
            include: getOnePlanInclude(plan.status ?? 'Draft'),
            order: [['details', 'fromTime', 'ASC']]
        });
    const onePlan = _.omit(result?.toJSON(), []);
    onePlan.travelDetails = null
    res.resDocument = new RESDocument(StatusCodes.OK, 'Cập nhật lịch trình thành công', { plan: onePlan });
    next();
});


export const completePlan = catchAsync(async (req, res, next) => {
    const plan = await Plan.findOne({ where: { id: req.params.id, status: 'Activated', travelerID: res.locals.user.id } });

    if (!plan)
        return next(new AppError('Không tìm thấy lịch trình này', StatusCodes.NOT_FOUND));

    if (Math.floor((Date.now() - new Date(plan.toDate).getTime()) / (1000 * 3600 * 24)) < 0)
        throw new AppError(`Bạn chỉ có thể hoàn tất lịch trình kể từ ngày cuối`, StatusCodes.BAD_REQUEST)
    const index: number[] = []

    const planned = await PlanDestination.findAll({ where: { planID: plan.id, isPlan: true } })
    const activated = await PlanDestination.findAll({ where: { planID: plan.id, isPlan: false } })
    for (let i = 0; i < activated.length; i++) {
        activated[i].status = 'New'
        let isCheck = false
        for (let j = 0; j < planned.length && !isCheck; j++) {
            if (!index.includes(j) && activated[i].destinationID === planned[j].destinationID && activated[i].date === planned[j].date) {
                activated[i].status = 'Checked-in'
                planned[j].status = 'Checked-in'
                index.push(j)
            }
        }
    }

    for (let i = 0; i < planned.length; i++)
        if (!index.includes(i))
            planned[i].status = 'Skipped'

    await sequelizeConnection.transaction(async (complete) => {
        await Plan.update({ status: 'Completed' }, { where: { id: req.params.id }, transaction: complete })
        for (let i = 0; i < planned.length; i++)
            await planned[i].save({ transaction: complete })

        for (let i = 0; i < activated.length; i++) {
            await activated[i].save({ transaction: complete })
            const sum = await PlanDestination.sum("rating", { where: { destinationID: activated[i].destinationID, isPlan: false, rating: { [Op.ne]: null } }, transaction: complete })
            const count = await PlanDestination.count({ where: { destinationID: activated[i].destinationID, isPlan: false, rating: { [Op.ne]: null } }, transaction: complete })
            const avgRating = count > 0 ? Math.floor(sum * 10 / count) / 10 : 0
            await Destination.update({ avgRating: avgRating, totalRating: count }, { where: { id: activated[i].destinationID } })
        }

    })

    res.resDocument = new RESDocument(StatusCodes.OK, `Bạn đã hoàn tất lịch trình "${plan.name}"`, null);
    next();
})