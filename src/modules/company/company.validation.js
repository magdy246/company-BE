import joi from "joi";

export const addCompanySchema = joi.object({
    companyName: joi.string().min(2).max(100).required(),
    description: joi.string().min(10).max(1000).required(),
    industry: joi.string().min(2).max(50).required(),
    address: joi.string().min(5).max(200).required(),
    numberOfEmployees: joi.string().valid("1-10", "11-20", "21-50", "51-100", "101-500", "501-1000", "1001+").required(),
    companyEmail: joi.string().email().required()
}).required();

export const updateCompanySchema = joi.object({
    companyId: joi.string().hex().length(24).required(),
    companyName: joi.string().min(2).max(100).optional(),
    description: joi.string().min(10).max(1000).optional(),
    industry: joi.string().min(2).max(50).optional(),
    address: joi.string().min(5).max(200).optional(),
    numberOfEmployees: joi.string().valid("1-10", "11-20", "21-50", "51-100", "101-500", "501-1000", "1001+").optional(),
    companyEmail: joi.string().email().optional()
}).or('companyName', 'description', 'industry', 'address', 'numberOfEmployees', 'companyEmail');

export const addHRSchema = joi.object({
    companyId: joi.string().hex().length(24).required(),
    hrId: joi.string().hex().length(24).required()
}).required();

export const softDeleteCompanySchema = joi.object({
    companyId: joi.string().hex().length(24).required()
}).required();

export const searchCompanyByNameSchema = joi.object({
    name: joi.string().min(2).max(100).trim().required()
}).required();

export const banUnbanCampanySchema = joi.object({
    companyId: joi.string().hex().length(24).required()
}).required();