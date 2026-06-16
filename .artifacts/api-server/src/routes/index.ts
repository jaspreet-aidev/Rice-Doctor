import { Router, type IRouter } from "express";
import healthRouter from "./health";
import diseaseRouter from "./disease";

const router: IRouter = Router();

router.use(healthRouter);
router.use(diseaseRouter);

export default router;
