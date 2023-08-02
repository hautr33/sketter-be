import { Router } from "express";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";
import { standardPipeline } from "../pipes";
import { getAllPersonalities } from "../controllers/app/personalities.controller";

const router = Router();

router.use(deserializeUser, requireUser);
router.get('/', standardPipeline(getAllPersonalities));

export default router;