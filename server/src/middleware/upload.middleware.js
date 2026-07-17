/**
 * ============================================================
 * upload.middleware.js — Multer configuration for resume uploads
 * ============================================================
 *
 * WHAT THIS DOES
 * ──────────────
 * Configures multer to accept a single resume file per request.
 * Three things are configured:
 *
 *   1. storage   — WHERE and HOW to save the file (disk, with a unique name)
 *   2. fileFilter — WHAT file types are allowed (PDF, DOC, DOCX)
 *   3. limits    — HOW LARGE a file can be (5 MB max)
 *
 * SECURITY NOTES
 * ──────────────
 * • The unique filename (Date.now() prefix) prevents two risks:
 *     a) Filename collisions: two users uploading "resume.pdf" would
 *        otherwise overwrite each other's files.
 *     b) Directory traversal: we never use the raw originalname as the
 *        full path, only append it after a safe timestamp prefix.
 *
 * • fileFilter checks the MIME type sent by the browser.
 *   This is not 100% foolproof (MIME types can be spoofed), but combined
 *   with the file extension in the filename it is solid for most cases.
 *   A production system would also use a library like `file-type` to
 *   read the actual magic bytes of the file content.
 *
 * • The `limits.fileSize` guard is enforced by multer BEFORE any of your
 *   controller code runs — a 10 GB upload attempt is rejected early,
 *   protecting the server from memory/disk exhaustion.
 *
 * MULTER ERROR TYPES
 * ──────────────────
 * Multer throws two kinds of errors:
 *   • MulterError  — built-in errors like LIMIT_FILE_SIZE (file too large)
 *   • Plain Error  — thrown from fileFilter for wrong file type
 * Both are caught by the global error handler in app.js.
 * ============================================================
 */
const path   = require('path');
const multer = require('multer');

// ─── 1. Storage: where and how to save ───────────────────────────────────────
const storage = multer.diskStorage({

    // The folder where files land on disk
    destination: (req, file, cb) => {
        cb(null, 'uploads/resumes/');
    },

    // Give every file a unique name so uploads never overwrite each other.
    // Format: <timestamp>-<original filename>
    // e.g. "1721228400000-shubham_resume.pdf"
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },

});

// ─── 2. File filter: only allow documents ────────────────────────────────────
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        // null = no error, true = accept this file
        cb(null, true);
    } else {
        // Reject the file with a descriptive error.
        // multer will pass this error to the next error-handling middleware.
        cb(new Error('Only PDF and DOC/DOCX files are allowed'), false);
    }
};

// ─── 3. Assemble the multer instance ─────────────────────────────────────────
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB in bytes
    },
});

module.exports = upload;
