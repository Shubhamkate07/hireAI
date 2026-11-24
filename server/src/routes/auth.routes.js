const express = require("express");

const authController =
    require("../controllers/auth.controller");

const authMiddleware =
    require("../middleware/auth.middleware");

const { authLimiter } =
    require("../middleware/rateLimit.middleware");

const {
    registerValidation,
    loginValidation,
    validate,
} = require("../middleware/validation.middleware");

const router = express.Router();

// authLimiter (10 req / 15 min) protects ONLY the credential endpoints from
// brute-force. It must NOT wrap /me, /refresh-token or /logout: those run on
// every page load / every 15 min, so a normal user would hit 429 and be logged out.
router.post(
    "/register",
    authLimiter,
    registerValidation,
    validate,
    authController.register
);

router.post(
    "/login",
    authLimiter,
    loginValidation,
    validate,
    authController.login
);

router.post(
    "/refresh-token",
    authController.refreshToken
);

router.post(
    "/logout",
    authController.logout
);

router.get(
    "/me",
    authMiddleware,
    authController.getMe
);

module.exports = router;