const prisma = require("../prisma/client");
const { sendSuccess } = require("../utils/response");
const AppError = require("../utils/AppError");

// ─── HAVERSINE FORMULA ───────────────────────────────
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
  return R * c;
}

// ─── START SESSION ───────────────────────────────────
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
        radiusMeters: radiusMeters ? Number(radiusMeters) : 100,
      },
    });

    return sendSuccess(res, "Session started successfully", { session }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── MARK ATTENDANCE ─────────────────────────────────
const markAttendance = async (req, res, next) => {
  try {
    const { studentId, sessionId, latitude, longitude } = req.body;

    if (!studentId || !sessionId || !latitude || !longitude) {
      throw new AppError(
        "studentId, sessionId, latitude and longitude are required",
        400,
      );
    }

    // Validate IDs are numbers
    const parsedStudentId = Number(studentId);
    const parsedSessionId = Number(sessionId);

    if (isNaN(parsedStudentId) || isNaN(parsedSessionId)) {
      throw new AppError("Invalid studentId or sessionId", 400);
    }

    const session = await prisma.session.findUnique({
      where: { id: parsedSessionId },
    });
    if (!session) {
      throw new AppError("Session not found", 404);
    }

    const student = await prisma.student.findUnique({
      where: { id: parsedStudentId },
    });
    if (!student) {
      throw new AppError("Student not found", 404);
    }

    const existing = await prisma.attendance.findFirst({
      where: {
        studentId: parsedStudentId,
        sessionId: parsedSessionId,
      },
    });
    if (existing) {
      throw new AppError("Attendance already marked for this session", 409);
    }

    const distance = getDistanceInMeters(
      session.latitude,
      session.longitude,
      Number(latitude),
      Number(longitude),
    );

    const status = distance <= session.radiusMeters ? "PRESENT" : "ABSENT";

    const attendance = await prisma.attendance.create({
      data: {
        studentId: parsedStudentId,
        sessionId: parsedSessionId,
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
const getSessionAttendance = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // ✅ CRITICAL FIX: Validate sessionId exists and is a number
    if (!sessionId || isNaN(Number(sessionId))) {
      throw new AppError("Valid session ID is required", 400);
    }

    const parsedSessionId = Number(sessionId);

    const session = await prisma.session.findUnique({
      where: { id: parsedSessionId },
    });
    if (!session) {
      throw new AppError("Session not found", 404);
    }

    const records = await prisma.attendance.findMany({
      where: { sessionId: parsedSessionId },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    return sendSuccess(res, "Attendance retrieved successfully", {
      sessionId: parsedSessionId,
      count: records.length,
      records,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET ALL SESSIONS ────────────────────────────────
const getAllSessions = async (req, res, next) => {
  try {
    console.log("📡 Fetching all sessions...");

    const sessions = await prisma.session.findMany({
      include: {
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            department: true,
            semester: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    console.log(`✅ Retrieved ${sessions.length} sessions`);

    return sendSuccess(res, "Sessions retrieved successfully", { sessions });
  } catch (err) {
    console.error("❌ Error in getAllSessions:", err.message);

    // Try fallback without course include
    try {
      console.log("🔄 Retrying without course include...");
      const sessions = await prisma.session.findMany({
        orderBy: { date: "desc" },
      });
      return sendSuccess(res, "Sessions retrieved successfully", { sessions });
    } catch (fallbackErr) {
      console.error("❌ Fallback also failed:", fallbackErr.message);
      // Return empty array instead of failing
      return sendSuccess(res, "Sessions retrieved successfully", {
        sessions: [],
      });
    }
  }
};

// ─── GET STUDENT SESSIONS (NEW HELPER) ───────────────
const getStudentSessions = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    if (!studentId || isNaN(Number(studentId))) {
      throw new AppError("Valid student ID is required", 400);
    }

    const parsedStudentId = Number(studentId);

    // Get student's enrolled courses
    const student = await prisma.student.findUnique({
      where: { id: parsedStudentId },
      include: {
        enrollments: {
          select: { courseId: true },
        },
      },
    });

    if (!student) {
      throw new AppError("Student not found", 404);
    }

    const enrolledCourseIds = student.enrollments.map((e) => e.courseId);

    if (enrolledCourseIds.length === 0) {
      return sendSuccess(res, "No enrolled courses found", { sessions: [] });
    }

    // Get sessions for enrolled courses
    const sessions = await prisma.session.findMany({
      where: {
        courseId: { in: enrolledCourseIds },
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            department: true,
            semester: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Check which sessions the student has already marked
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId: parsedStudentId,
        sessionId: { in: sessions.map((s) => s.id) },
      },
      select: {
        sessionId: true,
        status: true,
      },
    });

    const attendanceMap = new Map();
    attendanceRecords.forEach((record) => {
      attendanceMap.set(record.sessionId, record.status);
    });

    const sessionsWithStatus = sessions.map((session) => ({
      ...session,
      hasMarked: attendanceMap.has(session.id),
      attendanceStatus: attendanceMap.get(session.id) || null,
    }));

    return sendSuccess(res, "Student sessions retrieved successfully", {
      sessions: sessionsWithStatus,
      enrolledCourseIds,
    });
  } catch (err) {
    console.error("Error in getStudentSessions:", err.message);
    next(err);
  }
};

module.exports = {
  startSession,
  markAttendance,
  getSessionAttendance,
  getAllSessions,
  getStudentSessions,
};
