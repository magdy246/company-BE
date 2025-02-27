import ApplicationModel from "../../DB/models/application.model.js";
import JobModel from "../../DB/models/jobs.model.js";
import CompanyModel from "../../DB/models/company.model.js";
import { asyncHandler, eventEmitter } from "../../utils/index.js";
import cloudinary from "../../utils/cloudinary/index.js";
import mongoose from "mongoose";
import main, { acceptanceEmailTemplate, rejectionEmailTemplate } from "../../service/sendEmail.js";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

//& Apply to Job (Job Application)
export const addApplication = asyncHandler(async (req, res, next) => {
    const { jobId } = req.body;
    const user = req.user;

    // Validate jobId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return next(new Error("Invalid job ID format", { cause: 400 }));
    }

    // Check if job exists and is open
    const job = await JobModel.findById(jobId);
    if (!job) {
        return next(new Error("Job not found", { cause: 404 }));
    }
    if (job.closed) {
        return next(new Error("This job is closed and no longer accepting applications", { cause: 400 }));
    }

    // Check if company exists and is active
    const company = await CompanyModel.findById(job.companyId);
    if (!company) {
        return next(new Error("Associated company not found", { cause: 404 }));
    }
    if (company.isDeleted || company.deletedAt) {
        return next(new Error("Cannot apply to a job from a deleted company", { cause: 403 }));
    }
    if (company.bannedAt) {
        return next(new Error("Cannot apply to a job from a banned company", { cause: 403 }));
    }

    // Check if user already applied
    const existingApplication = await ApplicationModel.findOne({ jobId, userId: user._id });
    if (existingApplication) {
        return next(new Error("You have already applied for this job", { cause: 400 }));
    }

    // Validate file upload (Ensure CV is uploaded as a PDF)
    if (!req.file || req.file.mimetype !== 'application/pdf') {
        return next(new Error("Please upload a valid CV in PDF format", { cause: 400 }));
    }

    // Upload CV to Cloudinary
    const { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "raw", // Allows uploading PDFs
        folder: "job-applications/cvs"
    });

    // Create the application
    const newApplication = await ApplicationModel.create({
        jobId,
        userId: user._id,
        userCV: { secure_url, public_id }
    });

    // Emit socket event to notify HRs
    eventEmitter.emit("newApplication", {
        jobId,
        companyId: job.companyId,
        applicationId: newApplication._id,
        userId: user._id,
        timestamp: new Date()
    });

    return res.status(201).json({
        msg: "Application submitted successfully",
        application: newApplication
    });
});
//& Delete Application
export const deleteApplication = asyncHandler(async (req, res, next) => {
    const { applicationId } = req.params; // Application ID from URL
    const user = req.user;

    // Validate applicationId
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
        return next(new Error("Invalid application ID format", { cause: 400 }));
    }

    // Find the application
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
        return next(new Error("Application not found", { cause: 404 }));
    }

    // Check if user owns the application
    if (application.userId.toString() !== user._id.toString()) {
        return next(new Error("You can only delete your own application", { cause: 403 }));
    }

    // Delete CV from Cloudinary
    if (application.userCV.public_id) {
        await cloudinary.uploader.destroy(application.userCV.public_id, { resource_type: 'raw' });
    }

    // Delete the application
    const deletedApplication = await ApplicationModel.findByIdAndDelete(applicationId);
    if (!deletedApplication) {
        return next(new Error("Failed to delete application", { cause: 500 }));
    }

    return res.status(200).json({
        msg: "Application deleted successfully"
    });
});

//& Accept or Reject Application
export const updateApplicationStatus = asyncHandler(async (req, res, next) => {
    const { applicationId } = req.params; // Application ID from URL
    const { status } = req.body; // "accepted" or "rejected"
    const user = req.user;

    // Validate applicationId
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
        return next(new Error("Invalid application ID format", { cause: 400 }));
    }

    // Validate status
    if (!["accepted", "rejected"].includes(status)) {
        return next(new Error("Status must be 'accepted' or 'rejected'", { cause: 400 }));
    }

    // Find the application
    const application = await ApplicationModel.findById(applicationId).populate('userId', 'firstName lastName email');
    if (!application) {
        return next(new Error("Application not found", { cause: 404 }));
    }

    // Find the job and company
    const job = await JobModel.findById(application.jobId);
    if (!job) {
        return next(new Error("Associated job not found", { cause: 404 }));
    }

    const company = await CompanyModel.findById(job.companyId);
    if (!company) {
        return next(new Error("Associated company not found", { cause: 404 }));
    }

    // Check if user is an HR for the company
    const isHR = company.HRs.some(hr => hr.toString() === user._id.toString());
    if (!isHR) {
        return next(new Error("Only an HR related to the company can update application status", { cause: 403 }));
    }

    // Check if company is deleted or banned
    if (company.isDeleted || company.deletedAt) {
        return next(new Error("Cannot update applications for a deleted company", { cause: 403 }));
    }
    if (company.bannedAt) {
        return next(new Error("Cannot update applications for a banned company", { cause: 403 }));
    }

    // Update application status
    application.status = status;
    const updatedApplication = await application.save();

    // Prepare email details
    const userName = `${application.userId.firstName} ${application.userId.lastName}`;
    const emailTemplate = status === "accepted"
        ? acceptanceEmailTemplate(userName, job.jobTitle, company.companyName)
        : rejectionEmailTemplate(userName, job.jobTitle, company.companyName);

    // Send email
    const emailSent = await main(application.userId.email, `${status === "accepted" ? "Application Accepted" : "Application Rejected"} - ${job.jobTitle}`, emailTemplate);
    if (!emailSent) {
        console.error(`Failed to send ${status} email to ${application.userId.email}`);
    }

    return res.status(200).json({
        msg: `Application ${status} successfully`,
        application: updatedApplication
    });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//& Get Applications for Company on Specific Day and Generate Excel
export const getCompanyApplicationsExcel = asyncHandler(async (req, res, next) => {
    const { companyId } = req.params;
    const { date } = req.query; // Optional date query parameter (YYYY-MM-DD)

    // Validate companyId
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
        return next(new Error("Invalid company ID format", { cause: 400 }));
    }

    // Default to today if no date is provided
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0); // Set to start of day
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1); // Set to start of next day

    console.log(`Fetching applications for company ${companyId} on ${targetDate.toISOString()}`);

    // Find jobs for the company to get jobIds
    const jobs = await JobModel.find({ companyId: new mongoose.Types.ObjectId(companyId) }).select('_id');
    if (!jobs || jobs.length === 0) {
        return res.status(404).json({ msg: "No jobs found for this company" });
    }

    const jobIds = jobs.map(job => job._id);

    // Fetch applications for the jobs on the specified day
    const applications = await ApplicationModel.find({
        jobId: { $in: jobIds },
        createdAt: {
            $gte: targetDate,
            $lt: nextDay
        }
    }).populate({
        path: "userId",
        select: "firstName lastName email"
    }).populate({
        path: "jobId",
        select: "jobTitle jobDescription"
    }).lean();

    console.log("Found applications:", applications);

    if (!applications || applications.length === 0) {
        return res.status(404).json({ msg: "No applications found for this company on the specified date" });
    }

    // Create a new Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Applications");

    // Define column headers
    worksheet.columns = [
        { header: "Applicant Name", key: "applicantName", width: 30 },
        { header: "Email", key: "email", width: 30 },
        { header: "Job Title", key: "jobTitle", width: 30 },
        { header: "Job Description", key: "jobDescription", width: 50 },
        { header: "Status", key: "status", width: 15 },
        { header: "Applied At", key: "appliedAt", width: 20 }
    ];

    // Add rows with application data
    applications.forEach(app => {
        worksheet.addRow({
            applicantName: `${app.userId.firstName} ${app.userId.lastName}`,
            email: app.userId.email,
            jobTitle: app.jobId.jobTitle,
            jobDescription: app.jobId.jobDescription,
            status: app.status,
            appliedAt: new Date(app.createdAt).toLocaleString()
        });
    });

    // Style the header row
    worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFF" } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '4CAF50' } // Green header background
        };
        cell.alignment = { horizontal: 'center' };
    });

    // Ensure the downloads directory exists
    const downloadsDir = path.join(__dirname, '..', 'public', 'downloads');
    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
    }

    // Generate Excel file path
    const fileName = `company_applications_${companyId}_${targetDate.toISOString().split('T')[0]}.xlsx`;
    const filePath = path.join(downloadsDir, fileName);

    // Save the workbook to a file
    await workbook.xlsx.writeFile(filePath);

    // Send the file as a response
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('finish', () => {
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error("Error deleting file:", unlinkErr);
        });
    });

    fileStream.on('error', (err) => {
        console.error("Error streaming file:", err);
        return next(new Error("Failed to stream file", { cause: 500 }));
    });
});
