import express from 'express';
import dotenv from "dotenv";
import path from "path";
import bootstrap from './src/app.controller.js';

dotenv.config({ path: path.resolve("config/.env") });

const app = express();
bootstrap(app, express);

export default app;