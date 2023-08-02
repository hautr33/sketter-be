import { Router } from "express";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";
import { standardPipeline } from "../pipes";
import { createCatalog, disableCatalog, getAllCatalog } from "../controllers/app/catalog.controller";
import { restrictTo } from "../controllers/app/auth.controller";
import { Roles } from "../utils/constant";

const router = Router();

router.use(deserializeUser, requireUser);


router
    .route('/:name')
    .patch(standardPipeline(restrictTo(Roles.Admin), disableCatalog))

router
    .route('/')
    .get(standardPipeline(getAllCatalog))
    .post(standardPipeline(restrictTo(Roles.Admin), createCatalog))



export default router;