import dotenv from 'dotenv';
import fs from "fs";
import logger from '../utils/logger';

if (fs.existsSync(".env")) {
	logger.debug("Using .env file to supply config environment variables");
	dotenv.config({ path: ".env" });
} else {
	logger.debug("Using .env.example file to supply config environment variables");
	dotenv.config({ path: ".env.example" });  // you can delete this after you create your own .env file!
}

export const ENVIRONMENT = process.env.NODE_ENV ?? 'development' as string;
const prod = ENVIRONMENT === "production"; // Anything else is treated as 'dev'
let POSTGRES_URI = prod ? process.env["POSTGRES_URI"] : process.env["POSTGRES_URI_LOCAL"];
if (!POSTGRES_URI) {
	if (prod) {
		logger.error("No postgres connection string. Set POSTGRES_URI environment variable.");
	} else {
		logger.error("No postgres connection string. Set POSTGRES_URI_LOCAL environment variable.");
	}
	process.exit(1);
}

export const PORT = process.env.PORT ?? '3001';
export const DB_URL = POSTGRES_URI as string;

export const JWT_SECRET = process.env.JWT_SECRET as string;
export const JWT_PUBLIC = process.env.JWT_PUBLIC as string;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN as string;
export const JWT_COOKIES_EXPIRES_IN = process.env.JWT_COOKIES_EXPIRES_IN as string;

export const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS as string;
export const API_KEY = process.env.API_KEY as string;
export const AUTH_DOMAIN = process.env.AUTH_DOMAIN as string;
export const PROJECT_ID = process.env.PROJECT_ID as string;
export const STORAGE_BUCKET = process.env.STORAGE_BUCKET as string;
export const MESSAGING_SENDER_ID = process.env.MESSAGING_SENDER_ID as string;
export const APP_ID = process.env.APP_ID as string;

export const USER_IMG_URL = process.env.USER_IMG_URL as string;
export const DESTINATION_IMG_URL = process.env.DESTINATION_IMG_URL as string;


export const EMAIL_USERNAME = process.env.EMAIL_USERNAME as string;
export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD as string;
export const EMAIL_SERVICE = process.env.EMAIL_SERVICE as string;
export const FORGOT_PASSWORD_URL = process.env.FORGOT_PASSWORD_URL as string;

export const PAGE_LIMIT = Number(process.env.PAGE_LIMIT ?? 10);

export const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

export const REDIS_CONNECT_HOST = process.env.REDIS_CONNECT_HOST ?? 'redis';
export const REDIS_CONNECT_PORT = process.env.REDIS_CONNECT_PORT ?? '6379';
export const REDIS_TIMEOUT_SECONDS = parseInt(process.env.REDIS_TIMEOUT_SECONDS as string, 10) ?? 3600;

export const VNP_TMN_CODE = process.env.VNP_TMN_CODE as string
export const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET as string
export const VNP_URL = process.env.VNP_URL as string
export const VNP_RETURN_URL = process.env.VNP_RETURN_URL as string

export const DATABASE_UNITTEST = process.env.DATABASE_UNITTEST as string;
export const DATABASE_UNITTEST_USERNAME = process.env.DATABASE_UNITTEST_USERNAME as string;
export const DATABASE_UNITTEST_PASSWORD = process.env.DATABASE_UNITTEST_PASSWORD as string;
export const S3_KEY = process.env.S3_KEY as string;
export const S3_SECRET = process.env.S3_SECRET as string;
export const BUCKET_NAME = process.env.BUCKET_NAME as string;
export const BUCKET_REGION = process.env.BUCKET_REGION as string