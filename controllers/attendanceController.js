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

    const session = await prisma.session.findUnique({
      where: { id: Number(sessionId) },
    });
    if (!session) {
      throw new AppError("Session not found", 404);
    }

    const student = await prisma.student.findUnique({
      where: { id: Number(studentId) },
    });
    if (!student) {
      throw new AppError("Student not found", 404);
    }

    const existing = await prisma.attendance.findFirst({
      where: {
        studentId: Number(studentId),
        sessionId: Number(sessionId),
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

// ─── GET ALL SESSIONS - FIXED ────────────────────────
const getAllSessions = async (req, res, next) => {
  try {
    const sessions = await prisma.session.findMany({
      include: {
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            department: true,
            semester: true,
            lecturerId: true,
          },
        },
        attendance: {
          select: {
            id: true,
            studentId: true,
            status: true,
            markedAt: true,
          },
        },
      },
      orderBy: { startTime: "desc" }, // Fixed: using startTime instead of date
    });

    console.log(`✅ Retrieved ${sessions.length} sessions`);

    return sendSuccess(res, "Sessions retrieved successfully", { sessions });
  } catch (err) {
    console.error("❌ Error in getAllSessions:", err.message);
    console.error(err.stack);
    next(err);
  }
};

// ─── GET SESSIONS FOR A STUDENT'S ENROLLED COURSES ───
const getStudentSessions = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Get student's enrolled courses
    const student = await prisma.student.findUnique({
      where: { id: Number(studentId) },
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
        attendance: {
          where: { studentId: Number(studentId) },
          select: { id: true, status: true },
        },
      },
      orderBy: { startTime: "desc" },
    });

    return sendSuccess(res, "Student sessions retrieved successfully", {
      sessions,
      enrolledCourseIds,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startSession,
  markAttendance,
  getSessionAttendance,
  getAllSessions,
  getStudentSessions, // New helper function
};
