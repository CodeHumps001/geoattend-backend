const prisma = require("../prisma/client");
const { sendSuccess, sendError } = require("../utils/response");
const { getDistanceMetres } = require("../utils/haversine");

// POST mark attendance (student)
const markAttendance = async (req, res, next) => {
  try {
    const { sessionId, latitude, longitude } = req.body;

    if (!sessionId || !latitude || !longitude) {
      return sendError(
        res,
        "Session ID, latitude and longitude are required.",
        400,
      );
    }

    // Get student profile — course rep uses their student profile
    const studentProfile = req.user.student;

    if (!studentProfile) {
      return sendError(res, "Student profile not found.", 404);
    }

    // Get session
    const session = await prisma.session.findUnique({
      where: { id: Number(sessionId) },
    });

    if (!session) {
      return sendError(res, "Session not found.", 404);
    }

    if (!session.isOpen) {
      return sendError(
        res,
        "This session is closed. Attendance can no longer be marked.",
        400,
      );
    }

    // Check student belongs to this class space
    if (studentProfile.classSpaceId !== session.classSpaceId) {
      return sendError(res, "You are not a member of this class.", 403);
    }

    // Check already marked
    const alreadyMarked = await prisma.attendance.findUnique({
      where: {
        studentId_sessionId: {
          studentId: studentProfile.id,
          sessionId: Number(sessionId),
        },
      },
    });

    if (alreadyMarked) {
      return sendError(
        res,
        "You have already marked attendance for this session.",
        409,
      );
    }

    // GPS distance check
    const distance = getDistanceMetres(
      session.latitude,
      session.longitude,
      Number(latitude),
      Number(longitude),
    );

    const isWithinRadius = distance <= session.radiusMeters;
    const status = isWithinRadius ? "PRESENT" : "ABSENT";

    const attendance = await prisma.attendance.create({
      data: {
        studentId: studentProfile.id,
        sessionId: Number(sessionId),
        latitude: Number(latitude),
        longitude: Number(longitude),
        status,
      },
    });

    return sendSuccess(
      res,
      isWithinRadius
        ? `✅ Marked PRESENT — you are ${Math.round(distance)}m from class.`
        : `❌ Marked ABSENT — you are ${Math.round(distance)}m from class. Allowed radius is ${session.radiusMeters}m.`,
      {
        attendance,
        status,
        distance: `${Math.round(distance)}m`,
        allowedRadius: `${session.radiusMeters}m`,
        withinRadius: isWithinRadius,
      },
    );
  } catch (err) {
    next(err);
  }
};

// GET student's own attendance history
const getMyAttendance = async (req, res, next) => {
  try {
    const studentProfile = req.user.student;

    if (!studentProfile) {
      return sendError(res, "Student profile not found.", 404);
    }

    const attendance = await prisma.attendance.findMany({
      where: { studentId: studentProfile.id },
      include: {
        session: {
          include: { course: true },
        },
      },
      orderBy: { markedAt: "desc" },
    });

    // Calculate per-course stats
    const courseStats = {};
    attendance.forEach((record) => {
      const courseId = record.session.courseId;
      const courseName = record.session.course.name;
      const courseCode = record.session.course.code;

      if (!courseStats[courseId]) {
        courseStats[courseId] = {
          courseId,
          courseName,
          courseCode,
          total: 0,
          present: 0,
          absent: 0,
        };
      }
      courseStats[courseId].total++;
      if (record.status === "PRESENT") courseStats[courseId].present++;
      else courseStats[courseId].absent++;
    });

    const stats = Object.values(courseStats).map((s) => ({
      ...s,
      percentage:
        s.total > 0 ? `${((s.present / s.total) * 100).toFixed(1)}%` : "0%",
    }));

    return sendSuccess(res, "Attendance history retrieved.", {
      attendance,
      stats,
      totalRecords: attendance.length,
      totalPresent: attendance.filter((a) => a.status === "PRESENT").length,
    });
  } catch (err) {
    next(err);
  }
};

// GET attendance for a specific session (course rep)
const getSessionAttendance = async (req, res, next) => {
  try {
    const sessionId = Number(req.params.sessionId);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        course: true,
        classSpace: {
          include: {
            students: {
              include: {
                user: { select: { name: true, email: true, studentId: true } },
              },
            },
          },
        },
        attendance: {
          include: {
            student: {
              include: {
                user: { select: { name: true, email: true, studentId: true } },
              },
            },
          },
          orderBy: { markedAt: "asc" },
        },
      },
    });

    if (!session) {
      return sendError(res, "Session not found.", 404);
    }

    const markedIds = new Set(session.attendance.map((a) => a.studentId));
    const totalStudents = session.classSpace.students.length;
    const presentCount = session.attendance.filter(
      (a) => a.status === "PRESENT",
    ).length;

    return sendSuccess(res, "Session attendance retrieved.", {
      session,
      records: session.attendance,
      stats: {
        totalStudents,
        present: presentCount,
        absent: totalStudents - presentCount,
        notMarked: totalStudents - session.attendance.length,
        attendanceRate:
          totalStudents > 0
            ? `${((presentCount / totalStudents) * 100).toFixed(1)}%`
            : "0%",
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET student attendance per course
const getStudentCourseAttendance = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.params;

    const records = await prisma.attendance.findMany({
      where: {
        studentId: Number(studentId),
        session: { courseId: Number(courseId) },
      },
      include: {
        session: { include: { course: true } },
      },
      orderBy: { markedAt: "desc" },
    });

    const totalSessions = await prisma.session.count({
      where: { courseId: Number(courseId) },
    });

    const presentCount = records.filter((r) => r.status === "PRESENT").length;

    return sendSuccess(res, "Student course attendance retrieved.", {
      records,
      stats: {
        totalSessions,
        sessionsMarked: records.length,
        present: presentCount,
        absent: records.length - presentCount,
        percentage:
          totalSessions > 0
            ? `${((presentCount / totalSessions) * 100).toFixed(1)}%`
            : "0%",
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  markAttendance,
  getMyAttendance,
  getSessionAttendance,
  getStudentCourseAttendance,
};
