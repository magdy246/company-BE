import { asyncHandler } from "../utils/index.js";

export const validation = (Schema) => {
    return asyncHandler(async (req, res, next) => {
        const validationResult = { ...req.body, ...req.query, ...req.params }
        const validationError = Schema.validate(validationResult, { abortEarly: false })
        if (validationError?.error) {
            return res.status(400).json({ error: validationError.error.details });
        }
        next()
    })
};