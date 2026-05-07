const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  getSessions,
  getSessionById,
  startSession,
  closeSession,
  deleteSession,
} = require("../controllers/sessionController");

router.get("/", authenticate, getSessions);
router.get("/:id", authenticate, getSessionById);
router.post("/", authenticate, startSession);
router.patch("/:id/close", authenticate, closeSession);
router.delete("/:id", authenticate, authorize("COURSE_REP"), deleteSession);

module.exports = router;
