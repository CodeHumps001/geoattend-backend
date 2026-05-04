const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const classRoutes = require("./routes/classRoutes");
const courseRoutes = require("./routes/courseRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");

const app = express();

// ── Security ──────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  }),
);

// ── Rate limiting ─────────────────────────────────────────
app.use(
  "/api/v1/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
      success: false,
      message: "Too many requests. Try again in 15 minutes.",
    },
  }),
);

// ── Body parsing ──────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ── Health check ──────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Klassrep API is running.",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/class", classRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/sessions", sessionRoutes);
app.use("/api/v1/attendance", attendanceRoutes);

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res
    .status(404)
    .json({ success: false, message: `Route ${req.path} not found.` });
});

// ── Error handler ─────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
