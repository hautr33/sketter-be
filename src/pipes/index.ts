import { RequestHandler } from 'express';
import {
	executeBackgrounds,
	respondJSON,
	setUpPipeline
} from '../middlewares/global.middleware';
// import { redisGet, redisSave } from '../middlewares/redis.middleware';

/**
 * This pipeline is the standard pipeline, where
 * the beginning could be authentication, authorization checker.
 * The end could be respondJSON middleware above.
 *
 * Đường dây middleware chuẩn. Đầu pipeline có thể là
 * các authorization checker middleware. Cuối pipeline
 * có thể là respondJSON Middleware phía trên
 *
 * @param  {...any} middlewares
 */
export function standardPipeline(
	...middlewares: RequestHandler[]
): RequestHandler[] {
	return [setUpPipeline, ...middlewares, respondJSON, executeBackgrounds];
}

// export function redisPipeline(isGeneral: boolean) {
// 	return (...middlewares: RequestHandler[]): RequestHandler[] => [
// 		setUpPipeline,
// 		redisGet(isGeneral),
// 		...middlewares,
// 		redisSave(isGeneral),
// 		respondJSON,
// 		executeBackgrounds
// 	];
// }