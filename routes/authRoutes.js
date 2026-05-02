const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../utils/validators");
const { register, login, getMe } = require("../controllers/authController");

// validate middleware runs BEFORE the controller
// If body is invalid → returns 400 immediately, controller never runs
// If body is valid → controller runs with clean data
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", authenticate, getMe);

module.exports = router;
