const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  getMyLecturerProfile,
  getAllLecturers,
} = require("../controllers/lecturerController");

router.get("/me", authenticate, authorize("LECTURER"), getMyLecturerProfile);
router.get("/", authenticate, authorize("ADMIN"), getAllLecturers);

module.exports = router;
