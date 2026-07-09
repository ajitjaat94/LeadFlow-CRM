import { signup, login } from "../../controllers/auth/auth.controller.js";
import { signupValidate } from "../../validations/auth/signup.validation.js";
import { loginValidation } from "../../validations/auth/login.validation.js";
import { validatorMiddleware } from "../../middlewares/validation.middleware.js";
import express from "express";
const router = express.Router();

//Signup
router.post("/signup", signupValidate, validatorMiddleware, signup);

//Login
router.post("/login", loginValidation, validatorMiddleware, login);

export const authRoutes = router;