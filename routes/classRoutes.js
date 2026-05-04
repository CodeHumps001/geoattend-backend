const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  getMyClassSpace,
  getStudentClassSpace,
} = require("../controllers/classController");

router.get("/me", authenticate, authorize("COURSE_REP"), getMyClassSpace);
router.get(
  "/student",
  authenticate,
  authorize("STUDENT"),
  getStudentClassSpace,
);

module.exports = router;
