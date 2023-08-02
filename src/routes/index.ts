import express from "express";
import user from "./user.route";
import auth from "./auth.route";
import destination from "./destination.route";
import catalog from "./catalog.route";
import personality from "./personalities.route";
import plan from "./plan.route";
import voucher from "./voucher.route";
import city from "./city.route";
import timeFrames from "./time_frame.route";
import { StatusCodes } from "http-status-codes";

const router = express.Router();

router.get("/", (_req, res) => res.status(StatusCodes.OK).send({ "status": "success", "message": "Welcome to Sketter" }));

router.use('/api/v1/auth', auth);
router.use('/api/v1/users', user);
router.use('/api/v1/destinations', destination);
router.use('/api/v1/catalogs', catalog);
router.use('/api/v1/cities', city);
router.use('/api/v1/time_frames', timeFrames);
router.use('/api/v1/personalities', personality);
router.use('/api/v1/plans', plan);
router.use('/api/v1/vouchers', voucher);

export default router;