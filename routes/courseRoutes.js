const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} = require("../controllers/courseController");

router.get("/", authenticate, getCourses);
router.get("/:id", authenticate, getCourseById);
router.post("/", authenticate, authorize("COURSE_REP"), createCourse);
router.put("/:id", authenticate, authorize("COURSE_REP"), updateCourse);
router.delete("/:id", authenticate, authorize("COURSE_REP"), deleteCourse);

module.exports = router;
