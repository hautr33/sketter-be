export const validateDestination = (lowestPrice: any, highestPrice: any, openingTime: any, closingTime: any, catalogs: any, personalityTypes: any, recommendedTimes: any) => {
    const regex = /^([0-1][0-9]|[2][0-3]):([0-5][0-9])$/g

    if (Number(lowestPrice) >= Number(highestPrice))
        return 'Giá thấp nhất và giá cao nhất không hợp lệ'

    if (!openingTime.match(regex) || !closingTime.match(regex) || openingTime >= closingTime)
        return 'Giờ mở cửa và giờ đóng cửa không hợp lệ'

    if (!catalogs || catalogs.length == 0)
        return 'Loại hình địa điểm không được trống'

    if (!personalityTypes || personalityTypes.length == 0)
        return 'Loại hình địa điểm không được trống'

    if (!recommendedTimes || recommendedTimes.length == 0)
        return 'Khung thời gian đề xuất không được trống'

    for (let i = 0; i < recommendedTimes.length; i++) {
        if (!recommendedTimes[i].start.match(regex) || !recommendedTimes[i].end.match(regex) || recommendedTimes[i].start >= recommendedTimes[i].end) {
            return `Khung thời gian đề xuất ${i + 1} không hợp lệ (HH:MM)`
        }
        for (let j = i + 1; j < recommendedTimes.length; j++) {
            if (recommendedTimes[i].start <= recommendedTimes[j].start
                && recommendedTimes[j].start <= recommendedTimes[i].end
                || recommendedTimes[i].start <= recommendedTimes[j].end
                && recommendedTimes[j].end <= recommendedTimes[i].end) {
                return `Khung thời gian đề xuất ${i + 1} và ${j + 1} bị xung đột`
            }
        }
    }
    return null;
}