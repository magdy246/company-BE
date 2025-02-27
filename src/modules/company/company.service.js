import CompanyModel from "../../DB/models/company.model.js";
import UsersModel from "../../DB/models/users.model.js";
import { roles } from "../../middleware/auth.js";
import cloudinary from "../../utils/cloudinary/index.js";
import { asyncHandler } from "../../utils/index.js";
import mongoose from "mongoose";

//& Add Company
export const addCompany = asyncHandler(async (req, res, next) => {
    const { companyName, description, industry, address, numberOfEmployees, companyEmail } = req.body;
    const user = req.user;

    const emailExists = await CompanyModel.findOne({ companyEmail });
    if (emailExists) {
        return next(new Error("Company email already exists", { cause: 400 }));
    }

    const nameExists = await CompanyModel.findOne({ companyName });
    if (nameExists) {
        return next(new Error("Company name already exists", { cause: 400 }));
    }

    if (!req.file || req.file.mimetype !== 'application/pdf') {
        return next(new Error("Please upload a valid legal attachment in PDF format", { cause: 400 }));
    }

    const { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "raw",
        folder: "company-legal-docs"
    });

    // Create new company
    const newCompany = await CompanyModel.create({
        companyName,
        description,
        industry,
        address,
        numberOfEmployees,
        companyEmail,
        CreatedBy: user._id,
        legalAttachment: { secure_url, public_id }
    });

    // Update user's isOwner field
    await UsersModel.findByIdAndUpdate(user._id, {
        $set: { isOwner: true, isHR: false } // Set as owner, clear HR
    });

    return res.status(201).json({
        msg: "Company added successfully",
        company: newCompany
    });
});

//& Update Company Data
export const updateCompany = asyncHandler(async (req, res, next) => {
    const { companyId } = req.params; // Company ID from URL
    const { companyName, description, industry, address, numberOfEmployees, companyEmail } = req.body;
    const user = req.user; // From authentication middleware

    // Find the company
    const company = await CompanyModel.findById(companyId);
    if (!company) {
        return next(new Error("Company not found", { cause: 404 }));
    }

    // Check if user is the owner
    if (company.CreatedBy.toString() !== user._id.toString()) {
        return next(new Error("Only the company owner can update this company", { cause: 403 }));
    }

    // Check if company is deleted or banned
    if (company.deletedAt) {
        return next(new Error("Cannot update a deleted company", { cause: 403 }));
    }
    if (company.bannedAt) {
        return next(new Error("Cannot update a banned company", { cause: 403 }));
    }

    // Check for uniqueness if companyName or companyEmail is being updated
    if (companyName && companyName !== company.companyName) {
        const nameExists = await CompanyModel.findOne({ companyName });
        if (nameExists) {
            return next(new Error("Company name already exists", { cause: 400 }));
        }
    }
    if (companyEmail && companyEmail !== company.companyEmail) {
        const emailExists = await CompanyModel.findOne({ companyEmail });
        if (emailExists) {
            return next(new Error("Company email already exists", { cause: 400 }));
        }
    }

    // Prepare update object with allowed fields
    const updateData = {};
    if (companyName) updateData.companyName = companyName;
    if (description) updateData.description = description;
    if (industry) updateData.industry = industry;
    if (address) updateData.address = address;
    if (numberOfEmployees) updateData.numberOfEmployees = numberOfEmployees;
    if (companyEmail) updateData.companyEmail = companyEmail;

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
        return next(new Error("No valid fields provided for update", { cause: 400 }));
    }

    // Update the company
    const updatedCompany = await CompanyModel.findByIdAndUpdate(
        companyId,
        { $set: updateData },
        { new: true, runValidators: true } // Return updated document, run schema validators
    );

    if (!updatedCompany) {
        return next(new Error("Failed to update company", { cause: 500 }));
    }

    return res.status(200).json({
        msg: "Company updated successfully",
        company: updatedCompany
    });
});

//& Add HR to Company
export const addHR = asyncHandler(async (req, res, next) => {
    const { companyId, hrId } = req.body; // HR ID from request body
    const user = req.user; // From authentication middleware

    // Validate companyId and hrId format
    if (!mongoose.Types.ObjectId.isValid(companyId) || !mongoose.Types.ObjectId.isValid(hrId)) {
        return next(new Error("Invalid company ID or HR ID format", { cause: 400 }));
    }

    // Find the company
    const company = await CompanyModel.findById(companyId);
    if (!company) {
        return next(new Error("Company not found", { cause: 404 }));
    }

    // Check if user is the owner
    if (company.CreatedBy.toString() !== user._id.toString()) {
        return next(new Error("Only the company owner can add HRs", { cause: 403 }));
    }

    // Check if company is deleted or banned
    if (company.deletedAt) {
        return next(new Error("Cannot update a deleted company", { cause: 403 }));
    }
    if (company.bannedAt) {
        return next(new Error("Cannot update a banned company", { cause: 403 }));
    }

    // Validate HR user exists
    const hrUser = await UsersModel.findById(hrId);
    if (!hrUser) {
        return next(new Error("HR user not found", { cause: 404 }));
    }

    // Check if HR is already in the array
    if (company.HRs.some(hr => hr.toString() === hrId)) {
        return next(new Error("This user is already an HR for this company", { cause: 400 }));
    }

    // Add HR to the company
    const updatedCompany = await CompanyModel.findByIdAndUpdate(
        companyId,
        { $push: { HRs: hrId } },
        { new: true }
    );

    // Update HR user's isHR field
    await UsersModel.findByIdAndUpdate(hrId, {
        $set: { isHR: true, isOwner: false } // Set as HR, clear owner
    });

    if (!updatedCompany) {
        return next(new Error("Failed to add HR", { cause: 500 }));
    }

    return res.status(200).json({
        msg: "HR added successfully",
        company: updatedCompany
    });
});

//& Soft Delete Company
export const softDeleteCompany = asyncHandler(async (req, res, next) => {
    const { companyId } = req.params; // Company ID from URL
    const user = req.user; // From authentication middleware

    // Validate companyId format
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return next(new Error("Invalid company ID format", { cause: 400 }));
    }

    // Find the company
    const company = await CompanyModel.findById(companyId);
    if (!company) {
        return next(new Error("Company not found", { cause: 404 }));
    }

    // Check if user is the owner or an admin
    const isOwner = company.CreatedBy.toString() === user._id.toString();
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin) {
        return next(new Error("Only the company owner or an admin can delete this company", { cause: 403 }));
    }

    // Check if already deleted
    if (company.isDeleted || company.deletedAt) {
        return next(new Error("Company is already deleted", { cause: 400 }));
    }

    // Soft delete by setting isDeleted to true and deletedAt to current date
    const updatedCompany = await CompanyModel.findByIdAndUpdate(
        companyId,
        {
            $set: {
                isDeleted: true,
                deletedAt: new Date()
            }
        },
        { new: true }
    );

    if (!updatedCompany) {
        return next(new Error("Failed to delete company", { cause: 500 }));
    }

    return res.status(200).json({
        msg: "Company soft deleted successfully"
    });
});

//& Search for Company by Name
export const searchCompanyByName = asyncHandler(async (req, res, next) => {
    const { name } = req.query; // Get name from query parameter

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return next(new Error("Company name must be a string with at least 2 characters", { cause: 400 }));
    }

    // Perform case-insensitive search for companies that are not deleted
    const companies = await CompanyModel.find({
        companyName: { $regex: new RegExp(name.trim(), 'i') }, // Case-insensitive partial match
    }).select('companyName description industry address companyEmail isDeleted HRs numberOfEmployees'); // Select only relevant fields

    if (companies.length === 0) {
        return next(new Error("No companies found matching the name", { cause: 404 }));
    }

    return res.status(200).json({
        msg: "Companies found successfully",
        companies: companies
    });
});

//& Upload Company Logo
export const uploadCompanyLogo = asyncHandler(async (req, res, next) => {
    const { companyId } = req.params;
    const user = req.user;

    const company = await CompanyModel.findById(companyId);
    if (!company) {
        return next(new Error("Company not found", { cause: 404 }));
    }

    if (company.CreatedBy.toString() !== user._id.toString()) {
        return next(new Error("Only the company owner can upload the logo", { cause: 403 }));
    }

    if (company.deletedAt || company.isDeleted) {
        return next(new Error("Cannot update a deleted company", { cause: 403 }));
    }
    if (company.bannedAt) {
        return next(new Error("Cannot update a banned company", { cause: 403 }));
    }

    //  Check req.file instead of req.files
    if (!req.file) {
        return next(new Error("Please upload a company logo", { cause: 400 }));
    }

    // Delete existing logo if it exists
    if (company.Logo?.public_id) {
        await cloudinary.uploader.destroy(company.Logo.public_id);
    }

    // Upload the new logo to Cloudinary
    const { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path);

    // Update company document with the new logo
    const updatedCompany = await CompanyModel.findByIdAndUpdate(
        companyId,
        { Logo: { secure_url, public_id } },
        { new: true }
    );

    return res.status(200).json({
        msg: "Company logo uploaded successfully",
        logo: updatedCompany.Logo
    });
});

//& Upload Company Cover Pic
export const uploadCompanyCoverPic = asyncHandler(async (req, res, next) => {
    const { companyId } = req.params;
    const user = req.user;

    const company = await CompanyModel.findById(companyId);
    if (!company) {
        return next(new Error("Company not found", { cause: 404 }));
    }

    if (company.CreatedBy.toString() !== user._id.toString()) {
        return next(new Error("Only the company owner can upload the cover picture", { cause: 403 }));
    }

    if (company.deletedAt || company.isDeleted) {
        return next(new Error("Cannot update a deleted company", { cause: 403 }));
    }
    if (company.bannedAt) {
        return next(new Error("Cannot update a banned company", { cause: 403 }));
    }

    // Check req.file instead of req.files
    if (!req.file) {
        return next(new Error("Please upload a cover picture", { cause: 400 }));
    }

    // Delete existing cover pic if it exists
    if (company.coverPic?.public_id) {
        await cloudinary.uploader.destroy(company.coverPic.public_id);
    }

    // Upload the new cover picture to Cloudinary
    const { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path, { folder: "social-app" });

    // Update the company document with the new cover picture
    const updatedCompany = await CompanyModel.findByIdAndUpdate(
        companyId,
        { coverPic: { secure_url, public_id } },
        { new: true }
    );

    return res.status(200).json({
        msg: "Company cover picture uploaded successfully",
        coverPic: updatedCompany.coverPic
    });
});

//& Delete Company Logo
export const deleteCompanyLogo = asyncHandler(async (req, res, next) => {
    const { companyId } = req.params;
    const user = req.user;

    const company = await CompanyModel.findById(companyId);
    if (!company) {
        return next(new Error("Company not found", { cause: 404 }));
    }

    if (company.CreatedBy.toString() !== user._id.toString()) {
        return next(new Error("Only the company owner can delete the logo", { cause: 403 }));
    }

    if (company.deletedAt || company.isDeleted) {
        return next(new Error("Cannot update a deleted company", { cause: 403 }));
    }
    if (company.bannedAt) {
        return next(new Error("Cannot update a banned company", { cause: 403 }));
    }

    if (!company.Logo?.public_id) {
        return next(new Error("No logo to delete", { cause: 400 }));
    }

    await cloudinary.uploader.destroy(company.Logo.public_id);
    const updatedCompany = await CompanyModel.findByIdAndUpdate(
        companyId,
        { $set: { "Logo.secure_url": null, "Logo.public_id": null } },
        { new: true }
    );

    return res.status(200).json({
        msg: "Company logo deleted successfully"
    });
});

//& Delete Company Cover Pic
export const deleteCompanyCoverPic = asyncHandler(async (req, res, next) => {
    const { companyId } = req.params;
    const user = req.user;

    const company = await CompanyModel.findById(companyId);
    if (!company) {
        return next(new Error("Company not found", { cause: 404 }));
    }

    if (company.CreatedBy.toString() !== user._id.toString()) {
        return next(new Error("Only the company owner can delete the cover picture", { cause: 403 }));
    }

    if (company.deletedAt || company.isDeleted) {
        return next(new Error("Cannot update a deleted company", { cause: 403 }));
    }
    if (company.bannedAt) {
        return next(new Error("Cannot update a banned company", { cause: 403 }));
    }

    if (!company.coverPic?.public_id) {
        return next(new Error("No cover picture to delete", { cause: 400 }));
    }

    await cloudinary.uploader.destroy(company.coverPic.public_id);
    const updatedCompany = await CompanyModel.findByIdAndUpdate(
        companyId,
        { $set: { "coverPic.secure_url": null, "coverPic.public_id": null } },
        { new: true }
    );

    return res.status(200).json({
        msg: "Company cover picture deleted successfully"
    });
});

//& Get Company with Related Jobs
export const getCompanyWithJobs = asyncHandler(async (req, res, next) => {
    const { companyId } = req.params; // Company ID from URL

    // Validate companyId
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return next(new Error("Invalid company ID format", { cause: 400 }));
    }

    // Find the company and populate jobs
    const company = await CompanyModel.findById(companyId)
        .populate('jobs') // Populate the virtual 'jobs' field
        .select('-__v'); // Exclude version key

    if (!company) {
        return next(new Error("Company not found", { cause: 404 }));
    }

    // Check if company is deleted (optional, depending on requirements)
    if (company.isDeleted || company.deletedAt) {
        return next(new Error("Company is deleted", { cause: 404 }));
    }

    return res.status(200).json({
        msg: "Company and related jobs retrieved successfully",
        company: company
    });
});

//& Ban or Unban User
export const banUnbanCompany = asyncHandler(async (req, res, next) => {
    const { companyId } = req.params;
    const user = req.user;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return next(new Error("Invalid company ID format", { cause: 400 }));
    }

    // Check if the requester is an admin
    if (user.role !== roles.admin) {
        return next(new Error("Only admins can ban or unban users", { cause: 403 }));
    }

    const targetUser = await CompanyModel.findById(companyId);
    if (!targetUser) {
        return next(new Error("company not found", { cause: 404 }));
    }

    // Check if company is deleted
    if (targetUser.isDeleted || targetUser.deletedAt) {
        return next(new Error("Cannot ban or unban a deleted company", { cause: 403 }));
    }

    // Toggle ban status
    let updatedCompany;
    if (targetUser.bannedAt) {
        // Unban: Set bannedAt to null
        updatedCompany = await CompanyModel.findByIdAndUpdate(
            companyId,
            { $set: { bannedAt: null } },
            { new: true }
        );
        return res.status(200).json({
            msg: "User unbanned successfully",
            company: {
                id: updatedCompany._id,
                email: updatedCompany.email,
                bannedAt: updatedCompany.bannedAt
            }
        });
    } else {
        // Ban: Set bannedAt to current date
        updatedCompany = await CompanyModel.findByIdAndUpdate(
            companyId,
            { $set: { bannedAt: new Date() } },
            { new: true }
        );
        return res.status(200).json({
            msg: "Company banned successfully",
            user: {
                id: updatedCompany._id,
                email: updatedCompany.email,
                bannedAt: updatedCompany.bannedAt
            }
        });
    }
});

//& Approve Company
export const approveCompany = asyncHandler(async (req, res, next) => {
    const { companyId } = req.params; // Company ID from URL
    const user = req.user; // From authentication middleware

    // Validate companyId
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return next(new Error("Invalid company ID format", { cause: 400 }));
    }

    // Check if the requester is an admin
    if (user.role !== roles.admin) {
        return next(new Error("Only admins can approve companies", { cause: 403 }));
    }

    // Find the company
    const company = await CompanyModel.findById(companyId);
    if (!company) {
        return next(new Error("Company not found", { cause: 404 }));
    }

    // Check if company is deleted or banned
    if (company.isDeleted || company.deletedAt) {
        return next(new Error("Cannot approve a deleted company", { cause: 403 }));
    }
    if (company.bannedAt) {
        return next(new Error("Cannot approve a banned company", { cause: 403 }));
    }

    // Check if already approved
    if (company.approvedByAdmin) {
        return next(new Error("Company is already approved", { cause: 400 }));
    }

    // Approve the company
    const updatedCompany = await CompanyModel.findByIdAndUpdate(
        companyId,
        { $set: { approvedByAdmin: true } },
        { new: true }
    );

    if (!updatedCompany) {
        return next(new Error("Failed to approve company", { cause: 500 }));
    }

    return res.status(200).json({
        msg: "Company approved successfully",
        company: {
            id: updatedCompany._id,
            companyName: updatedCompany.companyName,
            companyEmail: updatedCompany.companyEmail,
            approvedByAdmin: updatedCompany.approvedByAdmin
        }
    });
});