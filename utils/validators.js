const { z } = require("zod");

// ─── AUTH VALIDATORS ──────────────────────────────────

const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(2, "Name must be at least 2 characters"),

  email: z
    .string({ required_error: "Email is required" })
    .email("Please provide a valid email address"),

  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),

  role: z.enum(["STUDENT", "LECTURER", "ADMIN"], {
    errorMap: () => ({ message: "Role must be STUDENT, LECTURER, or ADMIN" }),
  }),

  // Student fields — optional at schema level
  // We validate these conditionally in the controller
  studentCode: z.string().optional(),
  department: z.string().optional(),
  level: z.number().optional(),

  // Lecturer fields — optional at schema level
  staffCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Please provide a valid email address"),

  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

// ─── STUDENT VALIDATORS ───────────────────────────────

const createCourseSchema = z.object({
  code: z
    .string({ required_error: "Course code is required" })
    .min(2, "Course code must be at least 2 characters"),

  name: z
    .string({ required_error: "Course name is required" })
    .min(3, "Course name must be at least 3 characters"),

  department: z.string({ required_error: "Department is required" }),

  semester: z.string({ required_error: "Semester is required" }),

  lecturerId: z
    .number({ required_error: "Lecturer ID is required" })
    .int("Lecturer ID must be a whole number")
    .positive("Lecturer ID must be positive"),
});

// ─── ATTENDANCE VALIDATORS ────────────────────────────

const startSessionSchema = z.object({
  courseId: z
    .number({ required_error: "Course ID is required" })
    .int()
    .positive(),

  startTime: z.string({ required_error: "Start time is required" }),

  endTime: z.string({ required_error: "End time is required" }),

  latitude: z
    .number({ required_error: "Latitude is required" })
    .min(-90)
    .max(90, "Latitude must be between -90 and 90"),

  longitude: z
    .number({ required_error: "Longitude is required" })
    .min(-180)
    .max(180, "Longitude must be between -180 and 180"),

  radiusMeters: z.number().int().positive().optional(),
});

const markAttendanceSchema = z.object({
  studentId: z.number().int().positive(),
  sessionId: z.number().int().positive(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

module.exports = {
  registerSchema,
  loginSchema,
  createCourseSchema,
  startSessionSchema,
  markAttendanceSchema,
};
