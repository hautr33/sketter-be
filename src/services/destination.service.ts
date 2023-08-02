import sequelizeConnection from "../db/sequelize.db"
import _ from "lodash"
import { MAPBOX_TOKEN } from "../config/default"
import { StatusCodes } from "http-status-codes"
import AppError from "../utils/app_error"
import { Destination } from "../models/destination.model"
import { Distance } from "../models/distance.model"
import axios from "axios"

/**
 * This method is getDestinationDistanceService that calculate distance and duration between two destination
 *
 * @param {*} fromID ID of from destination
 * @param {*} toID ID of to destination
 * @param {*} profile vehicle profile: driving | walking | cycling
 * @author HauTr
 * @version 0.0.1
 *
 */
export const getDestinationDistanceService = async (fromID: string, toID: string, profile: string) => {
    profile = ['driving', 'walking', 'cycling'].includes(profile) ? profile : 'driving'
    if (fromID === toID)
        throw new AppError('Địa điểm bắt đầu và địa địa điểm đến phải khác nhau', StatusCodes.BAD_GATEWAY)


    const from = await Destination.findOne({ where: { id: fromID }, attributes: ['longitude', 'latitude'] })
    const to = await Destination.findOne({ where: { id: toID }, attributes: ['longitude', 'latitude'] })
    if (!from || !to)
        throw new AppError('Địa điểm không hợp lệ', StatusCodes.BAD_GATEWAY)

    const distance = await sequelizeConnection.transaction(async (getDistance) => {
        const result = await Distance.findOne({
            where: {
                profile: profile,
                fromDestination: fromID,
                toDestination: toID
            },
            attributes: ['profile', 'distance', 'duration', 'distanceText', 'durationText']
        })

        if (!result) {
            const response = await axios.get(
                `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}`,
                {
                    params: {
                        alternatives: true,
                        geometries: 'geojson',
                        overview: 'simplified',
                        access_token: MAPBOX_TOKEN
                    }
                }
            );
            const newDistance = new Distance()
            newDistance.fromDestination = fromID
            newDistance.toDestination = toID
            newDistance.profile = profile
            newDistance.distance = Math.ceil(response.data.routes[0].distance)
            newDistance.duration = Math.ceil(response.data.routes[0].duration)
            newDistance.distanceText = newDistance.distance / 1000 > 1 ? Math.ceil(newDistance.distance / 100) / 10 + 'km' : newDistance.distance + 'm'
            let min = Math.ceil((newDistance.duration) / 60)
            const hour = Math.floor(min / 60)
            min -= hour * 60
            const hourText = hour > 0 ? hour + 'h' : ''
            const minText = hour > 0 && min < 10 && min > 0 ? '0' + min + 'p' : (min > 0 ? min + 'p' : '')
            newDistance.durationText = hourText + minText
            await newDistance.save({ transaction: getDistance })
            const result = await Distance.findOne({
                where: {
                    profile: profile,
                    fromDestination: fromID,
                    toDestination: toID
                },
                attributes: ['profile', 'distance', 'duration', 'distanceText', 'durationText'],
                transaction: getDistance
            })
            return result
        } else {
            await Distance.increment({ count: 1 }, { where: { profile: profile, fromDestination: fromID, toDestination: toID } })
            return result
        }
    })
    return distance
}
