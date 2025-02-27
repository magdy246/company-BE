import connectionDB from "./DB/connectionDB.js";
import usersRouter from "./modules/users/users.controller.js";
import jobsRouter from "./modules/jobs/jobs.controller.js";
import companyRouter from "./modules/company/company.controller.js";
import { asyncHandler, globalErrorHandler } from "./utils/error/index.js";
import './service/cron.js';
import cors from "cors";
import { createHandler } from 'graphql-http/lib/use/http';
import { schema } from "./modules/graph.schema.js";
import expressPlayground from 'graphql-playground-middleware-express';
import applicationRouter from "./modules/application/application.controller.js";
import chatRouter from "./modules/chat/chat.controller.js";

const bootstrap = async (app, express) => {
    app.use(cors());

    app.use('/graphql', createHandler({ schema }));
    app.get('/playground', expressPlayground.default({ endpoint: '/graphql' }));

    app.use(express.json());

    await connectionDB(); // Ensure connection is awaited

    app.use("/users", usersRouter);
    app.use('/company', companyRouter);
    app.use('/jobs', jobsRouter);
    app.use('/applications', applicationRouter);
    app.use('/chat', chatRouter);
    app.get('/', (_, res) => res.send('Business Exam!'));

    app.use("*", asyncHandler(async (req, res, next) => {
        throw new Error("Not Found Page 404");
    }));

    app.use(globalErrorHandler);
}

export default bootstrap;