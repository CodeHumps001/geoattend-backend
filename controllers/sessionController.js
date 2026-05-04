const prisma = require("../prisma/client");
const { sendSuccess, sendError } = require("../utils/response");

// GET all sessions in class space
const getSessions = async (req, res, next) => {
  try {
    let classSpaceId;

    if (req.user.role === "COURSE_REP") {
      classSpaceId = req.user.courseRep?.classSpace?.id;
    } else {
      classSpaceId = req.user.student?.classSpaceId;
    }

    if (!classSpaceId) {
      return sendError(res, "No class space found.", 404);
    }

    const sessions = await prisma.session.findMany({
      where: { classSpaceId },
      include: {
        course: true,
        attendance: {
          include: {
            student: {
              include: {
                user: { select: { name: true, email: true, studentId: true } },
              },
            },
          },
        },
        _count: { select: { attendance: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return sendSuccess(res, "Sessions retrieved.", {
      sessions,
      count: sessions.length,
    });
  } catch (err) {
    next(err);
  }
};

// GET single session
const getSessionById = async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: Number(req.params.id) },
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

    const presentCount = session.attendance.filter(
      (a) => a.status === "PRESENT",
    ).length;

    const absentCount = session.classSpace.students.length - presentCount;

    return sendSuccess(res, "Session retrieved.", {
      session,
      stats: {
        totalStudents: session.classSpace.students.length,
        present: presentCount,
        absent: absentCount,
        attendanceRate:
          session.classSpace.students.length > 0
            ? (
                (presentCount / session.classSpace.students.length) *
                100
              ).toFixed(1)
            : "0",
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST start session (course rep only — live open/close model)
const startSession = async (req, res, next) => {
  try {
    const { courseId, latitude, longitude, radiusMeters } = req.body;

    if (!courseId || !latitude || !longitude) {
      return sendError(
        res,
        "Course ID, latitude and longitude are required.",
        400,
      );
    }

    const classSpaceId = req.user.courseRep?.classSpace?.id;

    if (!classSpaceId) {
      return sendError(res, "You don't have a class space.", 404);
    }

    // Check no other open session for same course
    const existingOpen = await prisma.session.findFirst({
      where: { courseId: Number(courseId), isOpen: true },
    });

    if (existingOpen) {
      return sendError(
        res,
        "There is already an open session for this course. Close it first.",
        409,
      );
    }

    const session = await prisma.session.create({
      data: {
        courseId: Number(courseId),
        classSpaceId,
        latitude: Number(latitude),
        longitude: Number(longitude),
        radiusMeters: Number(radiusMeters) || 100,
        startTime: new Date(),
        isOpen: true,
      },
      include: { course: true },
    });

    return sendSuccess(
      res,
      "Session started. Students can now mark attendance.",
      { session },
      201,
    );
  } catch (err) {
    next(err);
  }
};

// PATCH close session (course rep only)
const closeSession = async (req, res, next) => {
  try {
    const sessionId = Number(req.params.id);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return sendError(res, "Session not found.", 404);
    }

    if (!session.isOpen) {
      return sendError(res, "Session is already closed.", 400);
    }

    const closed = await prisma.session.update({
      where: { id: sessionId },
      data: { isOpen: false, endTime: new Date() },
      include: {
        course: true,
        attendance: true,
      },
    });

    const presentCount = closed.attendance.filter(
      (a) => a.status === "PRESENT",
    ).length;

    return sendSuccess(res, "Session closed.", {
      session: closed,
      summary: {
        present: presentCount,
        total: closed.attendance.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSessions,
  getSessionById,
  startSession,
  closeSession,
};
