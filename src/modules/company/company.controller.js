import { Router } from "express";
import { addCompany, addHR, approveCompany, banUnbanCompany, deleteCompanyCoverPic, deleteCompanyLogo, getCompanyWithJobs, searchCompanyByName, softDeleteCompany, updateCompany, uploadCompanyCoverPic, uploadCompanyLogo } from "./company.service.js";
import { validation } from "../../middleware/validation.js";
import { addCompanySchema, addHRSchema, banUnbanCampanySchema, searchCompanyByNameSchema, softDeleteCompanySchema, updateCompanySchema } from "./company.validation.js";
import { authentication, authorization, roles } from "../../middleware/auth.js";
import { fileTypes, multerOnline } from "../../middleware/multer.js";

const companyRouter = Router();

companyRouter.post('/add-company',
    authentication,
    multerOnline([...fileTypes.document]).single('legalAttachment'), // Already correct
    validation(addCompanySchema),
    addCompany
);

companyRouter.put('/update-company/:companyId',
    authentication,
    validation(updateCompanySchema),
    updateCompany
);

companyRouter.post('/add-hr',
    authentication,
    validation(addHRSchema),
    addHR
);

companyRouter.delete('/soft-delete-company/:companyId',
    authentication,
    validation(softDeleteCompanySchema),
    softDeleteCompany
);

companyRouter.get('/search',
    authentication,
    validation(searchCompanyByNameSchema),
    searchCompanyByName
);

companyRouter.post('/upload-logo/:companyId',
    authentication,
    multerOnline([...fileTypes.image]).single('logo'),
    uploadCompanyLogo
);

companyRouter.post('/upload-cover-pic/:companyId',
    authentication,
    multerOnline([...fileTypes.image]).single('coverPic'),
    uploadCompanyCoverPic
);

companyRouter.delete('/delete-logo/:companyId',
    authentication,
    validation(softDeleteCompanySchema),
    deleteCompanyLogo
);

companyRouter.delete('/delete-cover-pic/:companyId',
    authentication,
    validation(softDeleteCompanySchema),
    deleteCompanyCoverPic
);

companyRouter.get('/get-with-jobs/:companyId',
    authentication,
    validation(softDeleteCompanySchema),
    getCompanyWithJobs
);

companyRouter.put('/ban-unban/:companyId',
    authentication,
    validation(banUnbanCampanySchema),
    authorization([roles.admin]),
    banUnbanCompany
);

companyRouter.put('/approve/:companyId',
    authentication,
    authorization([roles.admin]),
    validation(softDeleteCompanySchema),
    approveCompany
);

export default companyRouter;