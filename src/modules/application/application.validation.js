import joi from "joi";

export const addApplicationSchema = joi.object({
    jobId: joi.string().hex().length(24).required()
}).required();

export const deleteApplicationSchema = joi.object({
    applicationId: joi.string().hex().length(24).required()
}).required();

export const updateApplicationStatusSchema = joi.object({
    applicationId: joi.string().hex().length(24).required(),
    status: joi.string().valid("accepted", "rejected").required()
}).required();