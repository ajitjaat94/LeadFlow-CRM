import { signup, login } from "../../controllers/auth/auth.controller.js";
import express from "express";
const router = express.Router();
//Signup
router.post("/signup", signup);

//Login
router.post("/login", login);

export const authRoutes = router;