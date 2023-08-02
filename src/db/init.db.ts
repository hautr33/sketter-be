import sequelizeConnection from './sequelize.db'
// import { ENVIRONMENT } from '../config/default'
import logger from '../utils/logger'
import { City } from '../models/city.model';
import { TimeFrame } from '../models/time_frame.model';
import { Role } from '../models/role.model';
import { Personalities } from '../models/personalities.model';
import { Catalog } from '../models/catalog.model';

/**
 * DB Connection related actions
 */

// const isDev = ENVIRONMENT === 'development'

export default {
    connect(): Promise<void> {
        return sequelizeConnection.sync({ alter: true, logging: false })
            .then(async () => {
                logger.info('DB connection successful')

                //Init city
                const city = [
                    [1, 'Đà Lạt']
                ]
                for (let i = 0; i < city.length; i++) {
                    await City.upsert({ id: city[i][0] as number, name: city[i][1] as string })
                }

                //Init timeframe
                for (let i = 1; i <= 12; i++) {
                    const id = i
                    const from = (i - 1) * 2 >= 10 ? (i - 1) * 2 + ':00' : '0' + (i - 1) * 2 + ':00'
                    const to = i * 2 >= 10 ? i * 2 + ':00' : '0' + i * 2 + ':00'
                    await TimeFrame.upsert({ id: id, from: from, to: to })
                }

                //Init role
                const role = [
                    [1, 'Admin', 'Quản trị viên'],
                    [2, 'Manager', 'Quản lý'],
                    [3, 'Supplier', 'Đối tác'],
                    [4, 'Traveler', 'Khách du lịch'],
                ]
                for (let i = 0; i < role.length; i++) {
                    await Role.upsert({ id: role[i][0] as number, name: role[i][1] as string, description: role[i][2] as string })
                }

                //Init personality
                const personalities = [
                    "Có nhu cầu vui chơi, giải trí cao",
                    "Đam mê với ẩm thực",
                    "Đam mê với lịch sử, văn hóa",
                    "Giá rẻ là trên hết",
                    "Tìm kiếm sự thư giãn",
                    "Thích khám phá",
                    "Ưa mạo hiểm",
                    "Yêu thiên nhiên"
                ]
                for (let i = 0; i < personalities.length; i++) {
                    await Personalities.upsert({ name: personalities[i] })
                }

                //Init catalog
                const catalogs = [
                    ["🍽 Ẩm thực"],
                    ["🏠 Lưu trú"],
                    ["🎭 Văn hóa"],
                    ["📷 Khám phá"],
                    ["☕ Quán nước", "🍽 Ẩm thực"],
                    ["🌻 Vườn hoa", "📷 Khám phá"],
                    ["🍜 Quán ăn", "🍽 Ẩm thực"],
                    ["🍟 Ăn vặt", "🍽 Ẩm thực"],
                    ["🎠 Địa điểm du lịch", "📷 Khám phá"],
                    ["🏕 Cắm trại", "🏠 Lưu trú"],
                    ["🏝 Khu nghỉ dưỡng", "🏠 Lưu trú"],
                    ["🏡 Homestay", "🏠 Lưu trú"],
                    ["🏨 Khách sạn", "🏠 Lưu trú"],
                    ["👨‍🌾 Nông trại", "📷 Khám phá"],
                    ["📖 Lịch sử", "🎭 Văn hóa"],
                    ["📸 Địa điểm ngắm cảnh", "📷 Khám phá"],
                    ["🔆 Bản xứ", "🎭 Văn hóa"],
                    ["🕌 Tín ngưỡng", "🎭 Văn hóa"]
                ]
                for (let i = 0; i < catalogs.length; i++) {
                    await Catalog.upsert({ name: catalogs[i][0], parent: catalogs[i][1] ?? null })
                }
            })
            .catch((e) => {
                logger.error('Could not establish db connection\n', e);
                process.exit(1);
            });
    }
}