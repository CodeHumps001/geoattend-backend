const prisma = require("../prisma/client");
const { sendSuccess } = require("../utils/response");
const AppError = require("../utils/AppError");

// ─── HAVERSINE FORMULA ───────────────────────────────
// This function calculates the real-world distance in metres
// between two GPS coordinates.
//
// The Earth is a sphere so you can't just subtract coordinates —
// you need trigonometry. The Haversine formula is the standard
// way to do this calculation accurately.
//
// lat1, lon1 = first location (session/classroom)
// lat2, lon2 = second location (student's phone)
// returns distance in metres

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in metres
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in metres
}

// ─── START SESSION ───────────────────────────────────
// Lecturer starts a class session
// In production this GPS comes from the lecturer's phone automatically
// For now we pass it manually in Postman for testing

const startSession = async (req, res, next) => {
  try {
    const { courseId, startTime, endTime, latitude, longitude, radiusMeters } =
      req.body;

    if (!courseId || !startTime || !endTime || !latitude || !longitude) {
      throw new AppError(
        "courseId, startTime, endTime, latitude and longitude are required",
        400,
      );
    }

    // Check course exists
    const course = await prisma.course.findUnique({
      where: { id: Number(courseId) },
    });
    if (!course) {
      throw new AppError("Course not found", 404);
    }

    const session = await prisma.session.create({
      data: {
        courseId: Number(courseId),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        latitude: Number(latitude),
        longitude: Number(longitude),
        // use provided radius or default to 100 metres
        radiusMeters: radiusMeters ? Number(radiusMeters) : 100,
      },
    });

    return sendSuccess(res, "Session started successfully", { session }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── MARK ATTENDANCE ─────────────────────────────────
// Student marks their attendance for a session
// Their GPS coordinates are checked against the session location

const markAttendance = async (req, res, next) => {
  try {
    const { studentId, sessionId, latitude, longitude } = req.body;

    if (!studentId || !sessionId || !latitude || !longitude) {
      throw new AppError(
        "studentId, sessionId, latitude and longitude are required",
        400,
      );
    }

    // Check session exists
    const session = await prisma.session.findUnique({
      where: { id: Number(sessionId) },
    });
    if (!session) {
      throw new AppError("Session not found", 404);
    }

    // Check student exists
    const student = await prisma.student.findUnique({
      where: { id: Number(studentId) },
    });
    if (!student) {
      throw new AppError("Student not found", 404);
    }

    // Check if attendance already marked for this session
    const existing = await prisma.attendance.findFirst({
      where: {
        studentId: Number(studentId),
        sessionId: Number(sessionId),
      },
    });
    if (existing) {
      throw new AppError("Attendance already marked for this session", 409);
    }

    // Calculate distance between student and classroom
    const distance = getDistanceInMeters(
      session.latitude,
      session.longitude,
      Number(latitude),
      Number(longitude),
    );

    // If student is within the allowed radius → PRESENT
    // If student is too far away → ABSENT
    const status = distance <= session.radiusMeters ? "PRESENT" : "ABSENT";

    const attendance = await prisma.attendance.create({
      data: {
        studentId: Number(studentId),
        sessionId: Number(sessionId),
        latitude: Number(latitude),
        longitude: Number(longitude),
        status,
      },
    });

    const message =
      status === "PRESENT"
        ? "✅ Attendance marked — you are present"
        : "❌ You are too far from the classroom";

    return sendSuccess(
      res,
      message,
      {
        status,
        distanceFromClass: `${Math.round(distance)} metres`,
        allowedRadius: `${session.radiusMeters} metres`,
        attendance,
      },
      201,
    );
  } catch (err) {
    next(err);
  }
};

// ─── GET SESSION ATTENDANCE ──────────────────────────
// View all attendance records for a specific session

const getSessionAttendance = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { id: Number(sessionId) },
    });
    if (!session) {
      throw new AppError("Session not found", 404);
    }

    const records = await prisma.attendance.findMany({
      where: { sessionId: Number(sessionId) },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    return sendSuccess(res, "Attendance retrieved successfully", {
      sessionId: Number(sessionId),
      count: records.length,
      records,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { startSession, markAttendance, getSessionAttendance };
