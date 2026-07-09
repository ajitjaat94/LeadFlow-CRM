import { validationResult } from "express-validator";

export const validatorMiddleware = (req, res, next) => {
    //collect error function validations 
    const error = validationResult(req)//check rule follow

    if (!error.isEmpty()) {
        return res.status(400).json({
            error: error.array()
        })
    }
    next();
}