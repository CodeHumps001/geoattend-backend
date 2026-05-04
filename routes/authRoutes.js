const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  lookupClassCode,
} = require("../controllers/authController");
const authenticate = require("../middleware/authenticate");

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getMe);
router.get("/class/:classCode", lookupClassCode); // public — no auth needed
