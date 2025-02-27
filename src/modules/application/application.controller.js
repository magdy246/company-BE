import { Router } from "express";
import { addApplication, deleteApplication, getCompanyApplicationsExcel, updateApplicationStatus } from "./application.service.js";
import { validation } from "../../middleware/validation.js";
import { addApplicationSchema, deleteApplicationSchema, updateApplicationStatusSchema } from "./application.validation.js";
import { authentication, authorization, roles } from "../../middleware/auth.js";
import { fileTypes, multerOnline } from "../../middleware/multer.js";

const applicationRouter = Router();

applicationRouter.post('/apply',
    authentication,
    authorization([roles.user]),
    multerOnline([...fileTypes.document]).single('cv'),
    validation(addApplicationSchema),
    addApplication
);

applicationRouter.delete('/delete/:applicationId',
    authentication,
    validation(deleteApplicationSchema),
    deleteApplication
);

applicationRouter.put('/status/:applicationId',
    authentication,
    validation(updateApplicationStatusSchema),
    updateApplicationStatus
);

applicationRouter.get('/company/:companyId/day',
    authentication,
    authorization([roles.admin]),
    getCompanyApplicationsExcel
);

export default applicationRouter;