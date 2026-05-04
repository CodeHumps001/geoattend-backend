const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const {
  markAttendance,
  getMyAttendance,
  getSessionAttendance,
  getStudentCourseAttendance,
} = require("../controllers/attendanceController");

router.post("/mark", authenticate, markAttendance);
router.get("/me", authenticate, getMyAttendance);
router.get("/session/:sessionId", authenticate, getSessionAttendance);
router.get(
  "/student/:studentId/course/:courseId",
  authenticate,
  getStudentCourseAttendance,
);

module.exports = router;
