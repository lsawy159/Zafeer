import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectLifecycleRouter from "./projectLifecycle";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(projectLifecycleRouter);

export default router;
