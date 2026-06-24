const { body, validationResult } = require("express-validator");

const ApiError = require("../utils/ApiError");

// ─── Register Validation Rules ────────────────────────────────────────────────

const registerValidation = [

    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required")
        .isLength({ min: 2 })
        .withMessage("Name must be at least 2 characters"),

    body("email")
        .trim()
        .isEmail()
        .withMessage("Invalid email address")
        .normalizeEmail(),

    body("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage(
            "Password must contain an uppercase letter, a lowercase letter, and a number"
        ),

    body("confirmPassword")
        .notEmpty()
        .withMessage("Confirm password is required")
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error("Passwords do not match");
            }
            return true;
        }),

    body("role")
        .optional()
        .isIn(["candidate", "recruiter", "admin"])
        .withMessage("Role must be candidate, recruiter, or admin"),

];

// ─── Login Validation Rules ───────────────────────────────────────────────────

const loginValidation = [

    body("email")
        .trim()
        .isEmail()
        .withMessage("Invalid email address"),

    body("password")
        .notEmpty()
        .withMessage("Password is required"),

];

// ─── Validate Handler ─────────────────────────────────────────────────────────
//
// Returns ALL field-level errors so the frontend can highlight each field
// individually. This is the standard used by large-scale production APIs
// (Stripe, GitHub, etc.) — a single first-error message forces the user to
// fix-and-resubmit repeatedly, which hurts UX.
//
// Shape returned to client:
//   { statusCode: 400, message: "Validation failed", errors: [{ field, message }] }

const validate = (req, res, next) => {

    const result = validationResult(req);

    if (!result.isEmpty()) {

        const formattedErrors = result.array().map((error) => ({
            field: error.path,
            message: error.msg,
        }));

        

        return next(
            new ApiError(400, "Validation failed", formattedErrors)
        );
    }

    next();
};

module.exports = {
    registerValidation,
    loginValidation,
    validate,
};
