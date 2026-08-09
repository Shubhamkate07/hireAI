const express= require('express');
const cors= require('cors');
const helmet= require('helmet');
const morgan= require('morgan');
const multer = require('multer'); // needed only for instanceof check in error handler
const config = require('./config/env.config');
const authRoutes            = require('./routes/auth.routes');
const userRoutes            = require('./routes/user.routes');
const jobRoutes             = require('./routes/job.routes');
const applicationRoutes     = require('./routes/application.routes');     // /api/jobs/:jobId/apply|applications
const myApplicationRoutes   = require('./routes/my.application.routes');  // /api/applications/my
const assessmentRoutes      = require('./routes/assessment.routes');       // /api/assessments
const recruiterRoutes       = require('./routes/recruiter.routes');        // /api/recruiter
const notificationRoutes    = require('./routes/notification.routes');     // /api/notifications
const sseRoutes             = require('./routes/sse.routes');               // /api/sse
const analyticsRoutes       = require('./routes/analytics.routes');         // /api/analytics

const cookieParser = require("cookie-parser");

const loggerMiddleware =
   require(
      "./middleware/logger.middleware"
   );



const app= express();

// ── Production hardening (Task 3) ─────────────────────────────────────────────
// trust proxy: tells Express the real client IP is in X-Forwarded-For header
//   put there by Nginx. Without this, req.ip shows the Nginx container IP.
//   Required for: rate limiting by IP, secure cookie behaviour, logging.
// x-powered-by: Express advertises itself by default. Disabling it removes
//   a free hint to attackers about your stack — minor but zero-cost hardening.
if (config.isProd) {
    app.set('trust proxy', 1);
    app.disable('x-powered-by');
}

// ── CORS ─────────────────────────────────────────────────────────────────────
// corsOrigins comes from CORS_ORIGINS env var (comma-separated) or defaults
// to localhost:5173 in development. In production, set:
//   CORS_ORIGINS=https://yourdomain.com
// WHY this must change between environments:
//   Allowing localhost in production lets any local machine call your API.
//   The origin header is set by the browser — it IS enforceable for browser
//   clients, but not for curl/Postman (which don't send CORS preflight).
//   Together with httpOnly cookies and CSRF mitigation, strict CORS origin
//   prevents CSRF from malicious browser origins.
app.use(
    cors({
        origin: config.corsOrigins,
        credentials: true
    })
);app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.use(loggerMiddleware);

app.use('/api/auth', authRoutes);

app.use(
   "/api/users",
   userRoutes
);

app.use('/api/jobs', jobRoutes);

// POST   /api/jobs/:jobId/apply         — candidate applies
// GET    /api/jobs/:jobId/applications  — recruiter views applicants
app.use('/api/jobs', applicationRoutes);

// GET /api/applications/my — candidate views their own applications
app.use('/api/applications', myApplicationRoutes);

// POST /api/assessments              — create assessment (recruiter/admin)
// GET  /api/assessments/:id          — fetch assessment + questions (role-aware)
// POST /api/assessments/:id/submit   — candidate submits answers, server scores
app.use('/api/assessments', assessmentRoutes);

// GET   /api/recruiter/jobs                             — recruiter's jobs + application count
// GET   /api/recruiter/jobs/:jobId/applications         — applicants for a job
// PATCH /api/recruiter/applications/:id/status          — move candidate through pipeline
app.use('/api/recruiter', recruiterRoutes);

// GET   /api/notifications           — current user's notifications
// PATCH /api/notifications/read-all  — mark all read
// PATCH /api/notifications/:id/read  — mark one read
app.use('/api/notifications', notificationRoutes);

// GET /api/sse/connect — persistent SSE stream (auth required)
// IMPORTANT: Nginx needs proxy_buffering off for this location.
// See nginx.conf notes in docs/.
app.use('/api/sse', sseRoutes);

// GET /api/analytics/... — analytics dashboard endpoints
app.use('/api/analytics', analyticsRoutes);


// server health check api
app.get('/api/health',(req,res)=>{
    res.status(200).json({
        status:"ok",
        timestamp:Date.now()
    })
});

// test api of global error handler
// app.get("/test", (req,res,next)=>{

//     const err = new Error("User not found");
//     err.status = 404;

//     next(err);
// });


// unknown route 
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.use((err, req, res, next) => {

    // ── Multer-specific errors ────────────────────────────────────────────────
    // multer.MulterError is thrown for built-in violations like LIMIT_FILE_SIZE.
    // Plain Error instances from fileFilter (wrong file type) are caught by the
    // second branch. Both become 400 Bad Request — never 500.
    if (err instanceof multer.MulterError) {
        // e.g. LIMIT_FILE_SIZE → "File too large"
        return res.status(400).json({
            success: false,
            statusCode: 400,
            message: err.message,
            errors: []
        });
    }

    // fileFilter throws a plain Error('Only PDF and DOC/DOCX files are allowed')
    // We detect it by checking whether the error is file-type related.
    if (err.message === 'Only PDF and DOC/DOCX files are allowed') {
        return res.status(400).json({
            success: false,
            statusCode: 400,
            message: err.message,
            errors: []
        });
    }

    // ── All other errors (ApiError, DB errors, etc.) ──────────────────────────
    const statusCode = err.statusCode || 500;
    const message    = err.message    || 'Internal Server Error';

    return res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        errors: err.errors || []
    });

});

module.exports = app;