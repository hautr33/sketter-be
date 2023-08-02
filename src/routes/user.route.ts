import { Router } from "express";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";
import { getMe, updateMe, updatePassword, sendVerifyEmail, verifyEmail, forgotPassword, resetPassword, } from "../controllers/app/user.controller";
import { standardPipeline } from "../pipes";
import { restrictTo } from "../controllers/app/auth.controller";
import { Roles } from "../utils/constant";
import { getAllSupplier } from "../controllers/app/user_supplier_manager.controller";
import { createUser, deactivateUser, getAllUser, getOneUser, resetNewPassword, updateUser } from "../controllers/app/user_admin.controller";

const router = Router();

router.post('/forgot_password', standardPipeline(forgotPassword));

router.patch('/reset_password/:token', standardPipeline(resetPassword));

router.use(deserializeUser, requireUser);

router
    .route('/me')
    .get(standardPipeline(restrictTo(Roles.Traveler, Roles.Supplier, Roles.Manager, Roles.Admin), getMe))
    .patch(standardPipeline(restrictTo(Roles.Traveler, Roles.Supplier), updateMe))

router.route('/me/verify')
    .post(standardPipeline(restrictTo(Roles.Traveler), sendVerifyEmail))
    .patch(standardPipeline(restrictTo(Roles.Traveler), verifyEmail))

router.patch('/update_password', standardPipeline(restrictTo(Roles.Traveler, Roles.Supplier), updatePassword));

router.route('/renewPassword')
    .post(standardPipeline(restrictTo(Roles.Admin), resetNewPassword))

router.get('/supplier', standardPipeline(restrictTo(Roles.Manager), getAllSupplier));

router
    .route('/')
    .get(standardPipeline(restrictTo(Roles.Admin), getAllUser))
    .post(standardPipeline(restrictTo(Roles.Admin), createUser));

router
    .route('/:id')
    .get(standardPipeline(restrictTo(Roles.Admin), getOneUser))
    .patch(standardPipeline(restrictTo(Roles.Admin), updateUser))
    .delete(standardPipeline(restrictTo(Roles.Admin), deactivateUser))

export default router;