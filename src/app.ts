import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors, { CorsOptions } from 'cors';
import express from 'express';
import fileUpload from 'express-fileupload';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import { StatusCodes } from 'http-status-codes';
// import morganProd from 'morgan';
import morganDev from 'morgan-body';
import path from 'path';
import xss from 'xss-clean';
import { ENVIRONMENT } from './config/default';
import globalErrorHandler from './controllers/error/error.controller';
import cookiesReader from './services/cookies.service';
import AppError from './utils/app_error';
import router from './routes';

const app = express();
process.env.TZ = "Asia/Ho_Chi_Minh";
// Hide X-Powered-By header
app.disable('x-powered-by');

// Compress requests
app.use(compression());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Production config
if (ENVIRONMENT === 'production') {
	const whitelistOrg = [
		'localhost',
		'localhost:3123',
		'localhost:3000',
		'sketter-smart-planner.herokuapp.com',
		'sketter-fe.pages.dev',
		'sketter-mobile',
		'http://localhost',
		'http://localhost:3123',
		'http://localhost:3000',
		'http://sketter-smart-planner.herokuapp.com',
		'https://localhost',
		'https://localhost:3123',
		'https://localhost:3000',
		'https://sketter-smart-planner.herokuapp.com',
		'https://sketter-fe.pages.dev'
	];
	// Only same origin and localhost
	const corsOptions: CorsOptions = {

		origin(origin, callback) {
			console.log(origin);

			if (whitelistOrg.indexOf(origin as string) !== -1 || origin == undefined)
				callback(null, true);
			else
				callback(
					new AppError('Not allowed by CORS', StatusCodes.FORBIDDEN)
				);
		}
	};
	app.use(cors(corsOptions));

	// Use helmetJS for security
	app.use(helmet());

	// Set limit-rate
	const limiter = rateLimit({
		max: 1000,
		windowMs: 60 * 60 * 1000,
		message: 'Too much request from this IP, please try after 1 hour!'
	});

	app.use('/api', limiter);
}

//-----------------

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cookiesReader);
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
// Data sanitization against XSS
app.use(xss());

/* 
  Preven parameter pollution, you can not have more than
	2 parameter on the same query. 
	E.g /api/v1/place?name="Water"&name="Mountain"
 */
app.use(
	hpp(
		// Whitelist, allow multiple params for specific request
		{
			whitelist: ['name', 'catalog', 'travelPersonalityTypes']
		}
	)
);

if (ENVIRONMENT === 'production' || ENVIRONMENT === 'test')
	morganDev(app);
// app.use(morganProd('common'));
else morganDev(app);

// App Route
app.use(router);

/* -------------ERROR HANDLERS MIDDLEWARE---------------*/
// If not handle by other router, implement 404 Router
app.all('*', (req, res, next) => {
	/* NOTE Express will assume anything inside next() as an error
	it will skip all middlewares in middleware statck, and Handling with
	global error handler */
	if (!res.headersSent) {
		next(
			new AppError(
				`Cannot find ${req.originalUrl} on server!`,
				StatusCodes.NOT_FOUND
			)
		);
	}

	res.end();
});

// Error Middleware Handler
app.use(globalErrorHandler);
/* -----------------------------------------------------*/

export default app;