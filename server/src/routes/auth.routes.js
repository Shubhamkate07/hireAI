const express = require("express");

const authController =
    require("../controllers/auth.controller");

const authMiddleware =
    require("../middleware/auth.middleware");

const authLimiter =
    require("../middleware/rateLimit.middleware");

const {
    registerValidation,
    loginValidation,
    validate,
} = require("../middleware/validation.middleware");

const router = express.Router();

router.use(authLimiter);

router.post(
    "/register",
    registerValidation,
    validate,
    authController.register
);

router.post(
    "/login",
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