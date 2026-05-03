require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { sendError } = require("./utils/response");
const AppError = require("./utils/AppError");

const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const courseRoutes = require("./routes/courseRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");

const app = express();

// ── Security Headers ─────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────
const corsOptions = {
  origin:
    process.env.NODE_ENV === "development"
      ? "http://localhost:5173"
      : process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));

// ── Rate Limiting ────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// ── Request Logging ──────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ── Body Parser ──────────────────────────────────────
app.use(express.json());

// ── Routes ───────────────────────────────────────────
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/students", studentRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/attendance", attendanceRoutes);

// ── Health Check ─────────────────────────────────────
// Simple route to confirm the server is running
// Used by deployment platforms to check if your app is alive
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "GeoAttend API is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── 404 Handler ──────────────────────────────────────
app.use((req, res) => {
  sendError(res, `Route ${req.method} ${req.url} not found`, 404);
});

// ── Global Error Handler ─────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);

  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode);
  }

  if (err.code === "P2002") {
    const field = err.meta?.target?.[0] || "Field";
    return sendError(res, `${field} already exists`, 409);
  }

  if (err.code === "P2025") {
    return sendError(res, "Record not found", 404);
  }

  if (err.code === "P2003") {
    return sendError(res, "Related record not found", 404);
  }

  if (err.name === "JsonWebTokenError") {
    return sendError(res, "Invalid token", 401);
  }

  if (err.name === "TokenExpiredError") {
    return sendError(res, "Token has expired. Please login again.", 401);
  }

  if (err.name === "ZodError") {
    const errors = {};
    err.errors.forEach((e) => {
      errors[e.path[0]] = e.message;
    });
    return sendError(res, "Validation failed", 400, errors);
  }

  if (process.env.NODE_ENV === "development") {
    return res.status(500).json({
      success: false,
      message: err.message,
      stack: err.stack,
    });
  }

  return sendError(res, "Something went wrong. Please try again later.", 500);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(
    `GeoAttend API running on port ${PORT} in ${process.env.NODE_ENV} mode`,
  );
});
