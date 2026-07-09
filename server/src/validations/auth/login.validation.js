import { body } from "express-validator";
export const loginValidation = [
    body('email')
        .notEmpty()
        .withMessage('Email is requred')
        .isEmail()
        .withMessage('Invalid Email'),

    body('password')
        .notEmpty()
        .withMessage('Password is requred')
]