import RESDocument from '../../controllers/factory/res_document';
import { UserAttributes } from '../../models/user.model';

declare global {
    namespace Express {
        interface Response {
            /**
             * Document đã xử lý xong, và sắp được trả về
             */
            resDocument?: RESDocument;

            /**
             * Chuỗi các tác vụ bất đồng bộ cần xử lý. Các tác vụ
             * này không kết thúc khi res đã được trả về cho người
             * dùng.
             */
            backgroundTasks: Promise<void>[];
        }

        interface Request {
            /**
             * Người dùng đang đăng nhập (jwt cookie)
             */
            user?: UserAttributes;
            processingData?: any;
        }
    }

    export interface JWTPayload {
        id: string;
        iat: number;
        exp: number;
    }
}