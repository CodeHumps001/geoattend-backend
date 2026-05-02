const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  getAllStudents,
  getStudentById,
  getStudentsByDepartment,
  deleteStudent,
  getAttendancePercentage,
} = require("../controllers/studentController");

// authenticate — must be logged in
// authorize — only these roles can access

// Any logged in user can view students
router.get("/", authenticate, getAllStudents);
router.get("/department/:department", authenticate, getStudentsByDepartment);
router.get("/:id", authenticate, getStudentById);
router.get("/:id/attendance/:courseId", authenticate, getAttendancePercentage);

// Only admins can delete students
router.delete("/:id", authenticate, authorize("ADMIN"), deleteStudent);

module.exports = router;
