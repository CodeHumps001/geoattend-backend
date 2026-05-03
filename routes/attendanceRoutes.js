// routes/attendanceRoutes.js
const router = require("express").Router();

const {
  startSession,
  markAttendance,
  getSessionAttendance,
  getAllSessions,
  getStudentSessions, // Add this
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

router.get("/session/:sessionId", authenticate, getSessionAttendance);
router.get("/session/all", authenticate, getAllSessions);
router.get("/student/:studentId/sessions", authenticate, getStudentSessions); // New route

module.exports = router;
