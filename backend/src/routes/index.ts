import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dsaRouter from "./dsa";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dsaRouter);

export default router;
