import { Router } from "express";
import { standardPipeline } from "../pipes";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";
import { requireStatus, restrictTo } from "../controllers/app/auth.controller";
import { Roles, Status } from "../utils/constant";
import { createPlan, deletePlan, duplicatePlan, getAllCreatedPlan, getAllPublicPlan, getOnePlan, updatePlan } from "../controllers/app/plan.controller";
import { createSmartPlan, saveSmartPlan } from "../controllers/app/plan_smart.controller";
import { checkinPlan, completePlan, saveDraftPlan } from "../controllers/app/plan_active.controller";
import { checkPlanStatus } from "../middlewares/plan.middleware";

const router = Router();

router.use(deserializeUser, requireUser, checkPlanStatus);


router.route('/')
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), createPlan))
    .get(standardPipeline(restrictTo(Roles.Traveler), getAllPublicPlan))

router.route('/duplicate/:id')
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), duplicatePlan))

router.route('/smart/:id')
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), saveSmartPlan))

router.route('/checkin/:id')
    .patch(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), checkinPlan))
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), completePlan))

router.route('/smart')
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), createSmartPlan))

router.route('/me')
    .get(standardPipeline(restrictTo(Roles.Traveler), getAllCreatedPlan))

router.route('/:id')
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), saveDraftPlan))
    .get(standardPipeline(restrictTo(Roles.Traveler), getOnePlan))
    .patch(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), updatePlan))
    .delete(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), deletePlan))


export default router;
