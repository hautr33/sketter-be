import { StatusCodes } from "http-status-codes"
import { PlanDestination } from "../../models/plan_destination.model"
import { Plan } from "../../models/plan.model"
import { Destination } from "../../models/destination.model"
import AppError from "../../utils/app_error"
import catch_async from "../../utils/catch_async"
import RESDocument from "../factory/res_document"
import { User } from "../../models/user.model"
import { Op } from "sequelize"

// export const ratingDestination = catch_async(async (req, res, next) => {
//     const { star, description } = req.body

//     const count = await DestinationRating.count({ where: { destinationID: req.params.id, userID: res.locals.user.id } })
//     if (count === 1)
//         return next(new AppError('Không thể đánh giá địa điểm đã đánh giá', StatusCodes.BAD_REQUEST))

//     await sequelizeConnection.transaction(async (create) => {
//         await DestinationRating.create({ destinationID: req.params.id, userID: res.locals.user.id, star: star, description: description },
//             { transaction: create })
//         const sum = await DestinationRating.sum("star", { where: { destinationID: req.params.id }, transaction: create })
//         const count = await DestinationRating.count({ where: { destinationID: req.params.id }, transaction: create })
//         await Destination.update({ avgRating: count ? Math.round(sum * 10 / count) / 10 : 0, totalRating: count ? count : 0 }, { where: { id: req.params.id }, transaction: create })
//     })
//     res.resDocument = new RESDocument(StatusCodes.OK, 'Đánh giá địa điểm thành công', null)
//     next()
// })

// export const updateRating = catch_async(async (req, res, next) => {
//     const { star, description } = req.body

//     const count = await DestinationRating.count({ where: { destinationID: req.params.id, userID: res.locals.user.id } })
//     if (count !== 1)
//         return next(new AppError('Không tìm thấy đánh giá này', StatusCodes.NOT_FOUND))

//     await sequelizeConnection.transaction(async (update) => {
//         await DestinationRating.update({ star: star, description: description }, {
//             where: { destinationID: req.params.id, userID: res.locals.user.id },
//             transaction: update
//         })
//         const sum = await DestinationRating.sum("star", { where: { destinationID: req.params.id }, transaction: update })
//         const count = await DestinationRating.count({ where: { destinationID: req.params.id }, transaction: update })
//         await Destination.update({ avgRating: count ? Math.round(sum * 10 / count) / 10 : 0, totalRating: count ? count : 0 }, { where: { id: req.params.id }, transaction: update })
//     })
//     res.resDocument = new RESDocument(StatusCodes.OK, 'Chỉnh sửa đánh giá thành công', null)
//     next()
// })

// export const deleteRating = catch_async(async (req, res, next) => {
//     const count = await DestinationRating.count({ where: { destinationID: req.params.id, userID: res.locals.user.id } })
//     if (count !== 1)
//         return next(new AppError('Không tìm thấy đánh giá này', StatusCodes.NOT_FOUND))

//     await sequelizeConnection.transaction(async (update) => {
//         await DestinationRating.destroy({ where: { destinationID: req.params.id, userID: res.locals.user.id }, transaction: update })
//         const sum = await DestinationRating.sum("star", { where: { destinationID: req.params.id }, transaction: update })
//         const count = await DestinationRating.count({ where: { destinationID: req.params.id }, transaction: update })
//         await Destination.update({ avgRating: count ? Math.round(sum * 10 / count) / 10 : 0, totalRating: count ? count : 0 }, { where: { id: req.params.id }, transaction: update })
//     })
//     res.resDocument = new RESDocument(StatusCodes.OK, 'Đánh giá của bạn đã được xoá', null)
//     next()
// })

export const getAllRating = catch_async(async (req, res, next) => {
    const overview = await Destination.findOne({
        where: { id: req.params.id },
        attributes: ['avgRating', 'totalRating']
    })

    if (!overview)
        return next(new AppError('Không tìm thấy địa điểm này', StatusCodes.NOT_FOUND))

    const myRating = await PlanDestination.findAll({
        where: { destinationID: req.params.id, isPlan: false, rating: { [Op.ne]: null } },
        attributes: ['rating', 'description', 'updatedAt'],
        include: [
            {
                model: Plan, as: 'details', where: { travelerID: res.locals.user.id }, attributes: ['id', 'name'],
                include: [
                    { model: User, as: 'traveler', attributes: ['email', 'name', 'avatar'] }
                ]
            }
        ]
    })

    const rating = await PlanDestination.findAll({
        where: { destinationID: req.params.id, isPlan: false, rating: { [Op.ne]: null } },
        attributes: ['rating', 'description', 'updatedAt'],
        include: [
            {
                model: Plan, as: 'details', where: { travelerID: { [Op.ne]: res.locals.user.id } }, attributes: ['id', 'name'],
                include: [
                    { model: User, as: 'traveler', attributes: ['email', 'name', 'avatar'] }
                ]
            }
        ]
    })
    // const otherRating = await DestinationRating.findAll({
    //     where: { destinationID: req.params.id, userID: { [Op.ne]: res.locals.user.id } },
    //     include: [
    //         { model: User, as: 'ratingBy', attributes: ['name', 'avatar'] }
    //     ],
    //     attributes: ['star', 'description', 'updatedAt']
    // })

    // if (role === Roles.Traveler) {
    //     const myRating = await DestinationRating.findOne({
    //         where: { destinationID: req.params.id, userID: res.locals.user.id },
    //         include: [
    //             { model: User, as: 'ratingBy', attributes: ['name', 'avatar'] }
    //         ],
    //         attributes: ['star', 'description', 'updatedAt']
    //     })
    //     res.resDocument = new RESDocument(StatusCodes.OK, 'success', {
    //         rating: {
    //             'avgRating': rating.avgRating,
    //             'totalRating': rating.totalRating,
    //             'myRating': myRating,
    //             'otherRating': otherRating
    //         }
    //     })
    // } else {
    //     res.resDocument = new RESDocument(StatusCodes.OK, 'success', {
    //         rating: {
    //             'avgRating': rating.avgRating,
    //             'totalRating': rating.totalRating,
    //             'travelerRating': otherRating
    //         }
    //     })
    // }

    res.resDocument = new RESDocument(StatusCodes.OK, 'success', {
        overview: {
            'avgRating': overview.avgRating,
            'totalRating': overview.totalRating,
        },
        myRating, rating
    })
    next()
})