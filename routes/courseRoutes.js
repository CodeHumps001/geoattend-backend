const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { createCourseSchema } = require("../utils/validators");
const {
  createCourse,
  getAllCourses,
  getCourseById,
  enrollStudent,
} = require("../controllers/courseController");

router.get("/", authenticate, getAllCourses);
router.get("/:id", authenticate, getCourseById);
router.post(
  "/",
  authenticate,
  authorize("LECTURER", "ADMIN"),
  validate(createCourseSchema),
  createCourse,
);
router.post("/enroll", authenticate, authorize("ADMIN"), enrollStudent);

module.exports = router;
