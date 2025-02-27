import joi from "joi";

export const addJobSchema = joi.object({
    jobTitle: joi.string().min(2).max(100).required(),
    jobLocation: joi.string().valid("onsite", "remotely", "hybrid").required(),
    workingTime: joi.string().valid("part-time", "full-time").required(),
    seniorityLevel: joi.string().valid("fresh", "Junior", "Mid-Level", "Senior", "Team-Lead", "CTO").required(),
    jobDescription: joi.string().min(10).max(1000).required(),
    technicalSkills: joi.array().items(joi.string()).min(1).required(),
    softSkills: joi.array().items(joi.string()).min(1).required(),
    companyId: joi.string().hex().length(24).required() // MongoDB ObjectId
}).required();

export const updateJobSchema = joi.object({
    jobId: joi.string().hex().length(24).required(), // Validate jobId from params
    jobTitle: joi.string().min(2).max(100).optional(),
    jobLocation: joi.string().valid("onsite", "remotely", "hybrid").optional(),
    workingTime: joi.string().valid("part-time", "full-time").optional(),
    seniorityLevel: joi.string().valid("fresh", "Junior", "Mid-Level", "Senior", "Team-Lead", "CTO").optional(),
    jobDescription: joi.string().min(10).max(1000).optional(),
    technicalSkills: joi.array().items(joi.string()).min(1).optional(),
    softSkills: joi.array().items(joi.string()).min(1).optional(),
    closed: joi.boolean().optional()
}).or('jobTitle', 'jobLocation', 'workingTime', 'seniorityLevel', 'jobDescription', 'technicalSkills', 'softSkills', 'closed');

export const deleteJobSchema = joi.object({
    jobId: joi.string().hex().length(24).required()
}).required();

export const getJobsForCompanySchema = joi.object({
    companyId: joi.string().hex().length(24).required(),
    jobId: joi.string().hex().length(24).optional(),
    skip: joi.number().integer().min(0).default(0).optional(),
    limit: joi.number().integer().min(1).max(100).default(10).optional(),
    sort: joi.string().optional(),
    companyName: joi.string().min(2).max(100).trim().optional()
});

export const getAllJobsWithFiltersSchema = joi.object({
    skip: joi.string().regex(/^\d+$/).default("0").optional(),
    limit: joi.string().regex(/^\d+$/).default("10").optional(),
    sort: joi.string().optional(),
    workingTime: joi.string().valid("part-time", "full-time").optional(),
    jobLocation: joi.string().valid("onsite", "remotely", "hybrid").optional(),
    seniorityLevel: joi.string().valid("fresh", "Junior", "Mid-Level", "Senior", "Team-Lead", "CTO").optional(),
    jobTitle: joi.string().min(2).max(100).trim().optional(),
    technicalSkills: joi.string().optional()
});

export const getApplicationsForJobSchema = joi.object({
    jobId: joi.string().hex().length(24).required(),
    skip: joi.string().regex(/^\d+$/).default("0").optional(),
    limit: joi.string().regex(/^\d+$/).default("10").optional(),
    sort: joi.string().optional()
});