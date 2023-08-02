import { Router } from "express";
import { standardPipeline } from "../pipes";
import { getAllTimeFrames } from "../controllers/app/time_frame.controller";

const router = Router();

router.get('/', standardPipeline(getAllTimeFrames));

export default router;