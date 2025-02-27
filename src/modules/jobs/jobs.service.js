import JobModel from "../../DB/models/jobs.model.js";
import CompanyModel from "../../DB/models/company.model.js";
import { asyncHandler } from "../../utils/index.js";
import mongoose from "mongoose";

//& Add Job
export const addJob = asyncHandler(async (req, res, next) => {
    const { jobTitle, jobLocation, workingTime, seniorityLevel, jobDescription, technicalSkills, softSkills, companyId } = req.body;
    const user = req.user; // From authentication middleware

    // Validate companyId
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return next(new Error("Invalid company ID format", { cause: 400 }));
    }

    // Find the company
    const company = await CompanyModel.findById(companyId);
    if (!company) {
        return next(new Error("Company not found", { cause: 404 }));
    }

    // Check if user is the owner or an HR
    const isOwner = company.CreatedBy.toString() === user._id.toString();
    const isHR = company.HRs.some(hr => hr.toString() === user._id.toString());
    if (!isOwner && !isHR) {
        return next(new Error("Only the company owner or an HR can add a job", { cause: 403 }));
    }

    // Check if company is deleted or banned
    if (company.isDeleted || company.deletedAt) {
        return next(new Error("Cannot add a job to a deleted company", { cause: 403 }));
    }
    if (company.bannedAt) {
        return next(new Error("Cannot add a job to a banned company", { cause: 403 }));
    }

    // Create new job
    const newJob = await JobModel.create({
        jobTitle,
        jobLocation,
        workingTime,
        seniorityLevel,
        jobDescription,
        technicalSkills,
        softSkills,
        addedBy: user._id, // HR or owner who added the job
        companyId
    });

    return res.status(201).json({
        msg: "Job added successfully",
        job: newJob
    });
});

//& Update Job
export const updateJob = asyncHandler(async (req, res, next) => {
    const { jobId } = req.params; // Job ID from URL
    const { jobTitle, jobLocation, workingTime, seniorityLevel, jobDescription, technicalSkills, softSkills, closed } = req.body;
    const user = req.user; // From authentication middleware

    // Validate jobId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return next(new Error("Invalid job ID format", { cause: 400 }));
    }

    // Find the job
    const job = await JobModel.findById(jobId);
    if (!job) {
        return next(new Error("Job not found", { cause: 404 }));
    }

    // Find the associated company
    const company = await CompanyModel.findById(job.companyId);
    if (!company) {
        return next(new Error("Associated company not found", { cause: 404 }));
    }

    // Check if user is the company owner
    if (company.CreatedBy.toString() !== user._id.toString()) {
        return next(new Error("Only the company owner can update this job", { cause: 403 }));
    }

    // Check if company is deleted or banned
    if (company.isDeleted || company.deletedAt) {
        return next(new Error("Cannot update a job for a deleted company", { cause: 403 }));
    }
    if (company.bannedAt) {
        return next(new Error("Cannot update a job for a banned company", { cause: 403 }));
    }

    // Prepare update object with allowed fields
    const updateData = {};
    if (jobTitle) updateData.jobTitle = jobTitle;
    if (jobLocation) updateData.jobLocation = jobLocation;
    if (workingTime) updateData.workingTime = workingTime;
    if (seniorityLevel) updateData.seniorityLevel = seniorityLevel;
    if (jobDescription) updateData.jobDescription = jobDescription;
    if (technicalSkills) updateData.technicalSkills = technicalSkills;
    if (softSkills) updateData.softSkills = softSkills;
    if (typeof closed === "boolean") updateData.closed = closed; // Ensure closed is a boolean

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
        return next(new Error("No valid fields provided for update", { cause: 400 }));
    }

    // Update the job
    const updatedJob = await JobModel.findByIdAndUpdate(
        jobId,
        {
            $set: {
                ...updateData,
                updatedBy: user._id // Set the updater as the owner
            }
        },
        { new: true, runValidators: true } // Return updated document, run schema validators
    );

    if (!updatedJob) {
        return next(new Error("Failed to update job", { cause: 500 }));
    }

    return res.status(200).json({
        msg: "Job updated successfully",
        job: updatedJob
    });
});

//& Delete Job
export const deleteJob = asyncHandler(async (req, res, next) => {
    const { jobId } = req.params; // Job ID from URL
    const user = req.user; // From authentication middleware

    // Validate jobId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return next(new Error("Invalid job ID format", { cause: 400 }));
    }

    // Find the job
    const job = await JobModel.findById(jobId);
    if (!job) {
        return next(new Error("Job not found", { cause: 404 }));
    }

    // Find the associated company
    const company = await CompanyModel.findById(job.companyId);
    if (!company) {
        return next(new Error("Associated company not found", { cause: 404 }));
    }

    // Check if user is an HR for the company
    const isHR = company.HRs.some(hr => hr.toString() === user._id.toString());
    if (!isHR) {
        return next(new Error("Only an HR related to the company can delete this job", { cause: 403 }));
    }

    // Check if company is deleted or banned
    if (company.isDeleted || company.deletedAt) {
        return next(new Error("Cannot delete a job from a deleted company", { cause: 403 }));
    }
    if (company.bannedAt) {
        return next(new Error("Cannot delete a job from a banned company", { cause: 403 }));
    }

    // Delete the job
    const deletedJob = await JobModel.findByIdAndDelete(jobId);
    if (!deletedJob) {
        return next(new Error("Failed to delete job", { cause: 500 }));
    }

    return res.status(200).json({
        msg: "Job deleted successfully"
    });
});

//& Get Jobs for a Company
export const getJobsForCompany = asyncHandler(async (req, res, next) => {
    const { companyId, jobId } = req.params;
    const { skip = "0", limit = "10", sort = 'createdAt', companyName } = req.query;

    // Validate companyId
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return next(new Error("Invalid company ID format", { cause: 400 }));
    }

    // Construct company query
    let companyQuery = { _id: companyId, isDeleted: false };
    if (companyName) {
        companyQuery.companyName = { $regex: new RegExp(companyName.trim(), 'i') };
    }

    const company = await CompanyModel.findOne(companyQuery);
    if (!company) {
        return next(new Error("Company not found or does not match the name", { cause: 404 }));
    }

    let jobQuery = { companyId: company._id };
    if (jobId) {
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return next(new Error("Invalid job ID format", { cause: 400 }));
        }
        jobQuery._id = jobId;
    }

    // Get total count of jobs
    const totalCount = await JobModel.countDocuments(jobQuery);

    // Fetch jobs with pagination and sorting
    const jobs = await JobModel.find(jobQuery)
        .skip(Number(skip))
        .limit(Number(limit))
        .sort(sort)
        .select('-__v');

    if (!jobs.length) {
        return res.status(200).json({
            msg: jobId ? "Job not found" : "No jobs found for this company",
            totalCount: 0,
            skip: Number(skip),
            limit: Number(limit),
            jobs: []
        });
    }

    return res.status(200).json({
        msg: jobId ? "Job retrieved successfully" : "Jobs retrieved successfully",
        totalCount,
        skip: Number(skip),
        limit: Number(limit),
        jobs
    });
});

//& Get All Jobs with Filters
export const getAllJobsWithFilters = asyncHandler(async (req, res, next) => {
    const { skip = "0", limit = "10", sort = 'createdAt', workingTime, jobLocation, seniorityLevel, jobTitle, technicalSkills } = req.query;

    // Build job query
    let jobQuery = {};

    // Apply filters if provided
    if (workingTime) {
        jobQuery.workingTime = workingTime;
    }
    if (jobLocation) {
        jobQuery.jobLocation = jobLocation;
    }
    if (seniorityLevel) {
        jobQuery.seniorityLevel = seniorityLevel;
    }
    if (jobTitle) {
        jobQuery.jobTitle = { $regex: new RegExp(jobTitle.trim(), 'i') }; // Case-insensitive partial match
    }
    if (technicalSkills) {
        const skillsArray = technicalSkills.split(',').map(skill => skill.trim()); // Convert comma-separated string to array
        jobQuery.technicalSkills = { $all: skillsArray }; // Match all specified skills
    }

    // Get total count of jobs
    const totalCount = await JobModel.countDocuments(jobQuery);

    // Fetch jobs with pagination and sorting
    const jobs = await JobModel.find(jobQuery)
        .skip(Number(skip))
        .limit(Number(limit))
        .sort(sort)
        .select('-__v'); // Exclude version key

    return res.status(200).json({
        msg: "Jobs retrieved successfully",
        totalCount,
        skip: Number(skip),
        limit: Number(limit),
        jobs
    });
});

//& Get All Applications for a Specific Job
export const getApplicationsForJob = asyncHandler(async (req, res, next) => {
    const { jobId } = req.params; // Job ID from URL
    const { skip = "0", limit = "10", sort = 'createdAt' } = req.query; // Pagination params
    const user = req.user; // From authentication middleware

    // Validate jobId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return next(new Error("Invalid job ID format", { cause: 400 }));
    }

    // Find the job
    const job = await JobModel.findById(jobId);
    if (!job) {
        return next(new Error("Job not found", { cause: 404 }));
    }

    // Find the associated company
    const company = await CompanyModel.findById(job.companyId);
    if (!company) {
        return next(new Error("Associated company not found", { cause: 404 }));
    }

    // Check if user is the company owner or an HR
    const isOwner = company.CreatedBy.toString() === user._id.toString();
    const isHR = company.HRs.some(hr => hr.toString() === user._id.toString());
    if (!isOwner && !isHR) {
        return next(new Error("Only the company owner or an HR can view applications", { cause: 403 }));
    }

    // Check if company is deleted or banned
    if (company.isDeleted || company.deletedAt) {
        return next(new Error("Cannot view applications for a job from a deleted company", { cause: 403 }));
    }
    if (company.bannedAt) {
        return next(new Error("Cannot view applications for a job from a banned company", { cause: 403 }));
    }

    // Fetch job with applications and populate user data
    const populatedJob = await JobModel.findById(jobId)
        .populate({
            path: 'applications',
            populate: {
                path: 'userId', // Populate userId with user data
                select: 'firstName lastName email mobileNumber gender DOB profilePic' // Select user fields
            }
        })
        .select('-__v');

    if (!populatedJob) {
        return next(new Error("Job not found", { cause: 404 }));
    }

    // Extract applications with pagination
    const applications = populatedJob.applications || [];
    const totalCount = applications.length;

    // Apply pagination and sorting
    const paginatedApplications = applications
        .sort((a, b) => sort === 'createdAt' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt)
        .slice(Number(skip), Number(skip) + Number(limit));

    if (totalCount === 0) {
        return res.status(200).json({
            msg: "No applications found for this job",
            totalCount: 0,
            skip: Number(skip),
            limit: Number(limit),
            applications: []
        });
    }

    return res.status(200).json({
        msg: "Applications retrieved successfully",
        totalCount,
        skip: Number(skip),
        limit: Number(limit),
        applications: paginatedApplications
    });
});