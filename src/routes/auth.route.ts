import { Router } from "express";
import { standardPipeline } from "../pipes";
import { signup, login, logout } from "../controllers/app/auth.controller";
import { addRoleMiddleware } from "../middlewares/field.middleware";
import { Roles } from "../utils/constant";
import { deserializeUser } from "../middlewares/deserialize_user";
import { requireUser } from "../middlewares/require_user";

const router = Router();
//Signup route
router.post('/signup', addRoleMiddleware(Roles.Traveler), standardPipeline(signup));

router.post('/signup/supplier', addRoleMiddleware(Roles.Supplier), standardPipeline(signup));

router.post('/login', standardPipeline(login));

router.use(deserializeUser, requireUser);
router.post('/logout', standardPipeline(logout));



export default router;