// routes/attendanceRoutes.js
const router = require("express").Router();

const {
  startSession,
  markAttendance,
  getSessionAttendance,
  getAllSessions,
  getStudentSessions,
} = require("../controllers/attendanceController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const {
  markAttendanceSchema,
  startSessionSchema,
} = require("../utils/validators");

// ─── PUBLIC / SPECIFIC ROUTES (no parameters) ─────────
// These must come BEFORE parameterized routes
router.get("/session/all", authenticate, getAllSessions);

// ─── PARAMETERIZED ROUTES (with :id) ─────────────────
router.get("/session/:sessionId", authenticate, getSessionAttendance);
router.get("/student/:studentId/sessions", authenticate, getStudentSessions);

// ─── POST ROUTES ─────────────────────────────────────
router.post(
  "/session",
  authenticate,
  authorize("LECTURER", "ADMIN"),
  validate(startSessionSchema),
  startSession,
);

router.post(
  "/mark",
  authenticate,
  authorize("STUDENT"),
  validate(markAttendanceSchema),
  markAttendance,
);

module.exports = router;
