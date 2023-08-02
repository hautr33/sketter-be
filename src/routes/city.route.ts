import { Router } from "express";
import { standardPipeline } from "../pipes";
import { getAllCities } from "../controllers/app/city.controller";

const router = Router();

router.get('/', standardPipeline(getAllCities));

export default router;