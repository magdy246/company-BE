import { Router } from "express";
import { addJob, deleteJob, getAllJobsWithFilters, getApplicationsForJob, getJobsForCompany, updateJob } from "./jobs.service.js";
import { validation } from "../../middleware/validation.js";
import { addJobSchema, deleteJobSchema, getAllJobsWithFiltersSchema, getApplicationsForJobSchema, getJobsForCompanySchema, updateJobSchema } from "./jobs.validation.js";
import { authentication } from "../../middleware/auth.js";

const jobsRouter = Router();

jobsRouter.post('/add-job',
    authentication,
    validation(addJobSchema),
    addJob
);

jobsRouter.put('/update-job/:jobId',
    authentication,
    validation(updateJobSchema),
    updateJob
);

jobsRouter.delete('/delete-job/:jobId',
    authentication,
    validation(deleteJobSchema),
    deleteJob
);

jobsRouter.get('/company/:companyId/jobs/:jobId?',
    authentication,
    validation(getJobsForCompanySchema),
    getJobsForCompany
);

jobsRouter.get('/jobs',
    authentication,
    validation(getAllJobsWithFiltersSchema),
    getAllJobsWithFilters
);

jobsRouter.get('/applications/:jobId',
    authentication,
    validation(getApplicationsForJobSchema),
    getApplicationsForJob
);


export default jobsRouter;