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

// ✅ IMPORTANT: Put specific routes BEFORE dynamic routes
// This goes FIRST - before /session/:sessionId
router.get("/session/all", authenticate, getAllSessions);

// This goes AFTER - dynamic route with parameter
router.get("/session/:sessionId", authenticate, getSessionAttendance);

router.get("/student/:studentId/sessions", authenticate, getStudentSessions);

module.exports = router;
