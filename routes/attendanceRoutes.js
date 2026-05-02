const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const {
  startSessionSchema,
  markAttendanceSchema,
} = require("../utils/validators");
const {
  startSession,
  markAttendance,
  getSessionAttendance,
} = require("../controllers/attendanceController");

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

module.exports = router;
