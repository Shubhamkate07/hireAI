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

// ─── Create Job Validation Rules ─────────────────────────────────────────────

const JOB_TYPES = [
    "full-time",
    "part-time",
    "contract",
    "internship",
];

const createJobValidation = [

    body("title")
        .trim()
        .notEmpty()
        .withMessage("Title is required")
        .isLength({ min: 5, max: 150 })
        .withMessage("Title must be between 5 and 150 characters"),

    body("description")
        .trim()
        .notEmpty()
        .withMessage("Description is required")
        .isLength({ min: 20 })
        .withMessage("Description must be at least 20 characters"),

    body("company")
        .trim()
        .notEmpty()
        .withMessage("Company is required"),

    body("location")
        .optional()
        .trim(),

    body("salary_min")
        .optional({ nullable: true })
        .isInt({ min: 0 })
        .withMessage("salary_min must be a non-negative integer"),

    body("salary_max")
        .optional({ nullable: true })
        .isInt({ min: 0 })
        .withMessage("salary_max must be a non-negative integer")
        .custom((value, { req }) => {
            const min = req.body.salary_min;
            if (min !== undefined && min !== null && value < min) {
                throw new Error("salary_max must be greater than or equal to salary_min");
            }
            return true;
        }),

    body("job_type")
        .notEmpty()
        .withMessage("job_type is required")
        .isIn(JOB_TYPES)
        .withMessage(`job_type must be one of: ${JOB_TYPES.join(", ")}`),

];

module.exports = {
    registerValidation,
    loginValidation,
    createJobValidation,
    validate,
};
