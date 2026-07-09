import { body } from "express-validator";

export const signupValidate = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('username is required')
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 cheracters long'),

    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format'),

    body('password')
        .notEmpty()
        .withMessage('password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 cheracters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)
        .withMessage('password must be include Uparcase , lowercase and number'),
];