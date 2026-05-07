const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const {
  getAssistants,
  promoteAssistant,
  removeAssistant,
} = require("../controllers/assistantController");

// Only main course rep can manage assistants
router.get("/", authenticate, authorize("COURSE_REP"), getAssistants);
router.post(
  "/promote",
  authenticate,
  authorize("COURSE_REP"),
  promoteAssistant,
);
router.delete(
  "/:assistantId",
  authenticate,
  authorize("COURSE_REP"),
  removeAssistant,
);

module.exports = router;
