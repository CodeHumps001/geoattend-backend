const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  getSessions,
  getSessionById,
  startSession,
  closeSession,
} = require("../controllers/sessionController");

router.get("/", authenticate, authorize("COURSE_REP"), getSessions);
router.get("/:id", authenticate, authorize("COURSE_REP"), getSessionById);
router.post("/", authenticate, authorize("COURSE_REP"), startSession);
router.patch("/:id/close", authenticate, authorize("COURSE_REP"), closeSession);

module.exports = router;
