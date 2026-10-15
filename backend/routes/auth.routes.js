import { Router } from "express";
import { getProviders, googleCallback, startGoogleLogin } from "../controllers/oauth.controller.js";

const router = Router();

router.get("/providers", getProviders);
router.get("/google", startGoogleLogin);
router.get("/google/callback", googleCallback);

export default router;
