import { Router } from "express";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";
import { standardPipeline } from "../pipes";
import { requireStatus, restrictTo } from "../controllers/app/auth.controller";
import { Roles, Status } from "../utils/constant";
import { createDestination, deactivateDestination, deleteOneDestination, getAllDestination, getOneDestination, searchDestination, updateDestination } from "../controllers/app/destination.controller";
import { getAllRating } from "../controllers/app/destination_rating.controller";
import { bookmarkDestination, getBookmarkDestination } from "../controllers/app/destination_bookmark.controller";
import { getDistance } from "../controllers/app/distance.controller";

const router = Router();

router.use(deserializeUser, requireUser);

router
    .route('/')
    .get(standardPipeline(restrictTo(Roles.Manager, Roles.Supplier, Roles.Traveler), getAllDestination))
    .post(standardPipeline(restrictTo(Roles.Manager, Roles.Supplier), requireStatus(Status.verified), createDestination));

router.route('/search')
    .get(standardPipeline(restrictTo(Roles.Traveler, Roles.Supplier, Roles.Manager), searchDestination))

router.route('/distance')
    .post(standardPipeline(restrictTo(Roles.Traveler), getDistance))

router.route('/bookmark')
    .get(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), getBookmarkDestination))

router.route('/:id/bookmark')
    .post(standardPipeline(restrictTo(Roles.Traveler), requireStatus(Status.verified), bookmarkDestination))

router.route('/:id/deactivate')
    .patch(standardPipeline(restrictTo(Roles.Manager), requireStatus(Status.verified), deactivateDestination))

router.route('/:id/rating')
    .get(standardPipeline(restrictTo(Roles.Traveler, Roles.Supplier, Roles.Manager), requireStatus(Status.verified), getAllRating))

router
    .route('/:id')
    .get(standardPipeline(restrictTo(Roles.Manager, Roles.Supplier, Roles.Traveler), getOneDestination))
    .patch(standardPipeline(restrictTo(Roles.Manager, Roles.Supplier), requireStatus(Status.verified), updateDestination))
    .delete(standardPipeline(restrictTo(Roles.Manager, Roles.Supplier), requireStatus(Status.verified), deleteOneDestination))

export default router;