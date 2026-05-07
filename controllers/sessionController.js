// controllers/sessionController.js
const prisma = require("../prisma/client");
const { sendSuccess, sendError } = require("../utils/response");

// GET all sessions in class space
const getSessions = async (req, res, next) => {
  try {
    let classSpaceId;

    if (req.user.role === "COURSE_REP") {
      const courseRep = await prisma.courseRep.findUnique({
        where: { userId: req.user.id },
        include: {
          classSpace: {
            select: { id: true },
          },
        },
      });
      classSpaceId = courseRep?.classSpace?.id;
    } else {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
        select: { classSpaceId: true },
      });
      classSpaceId = student?.classSpaceId;
    }

    if (!classSpaceId) {
      return sendError(res, "No class space found.", 404);
    }

    const sessions = await prisma.session.findMany({
      where: { classSpaceId },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            lecturerName: true,
          },
        },
        attendance: {
          select: {
            id: true,
            status: true,
            studentId: true,
            markedAt: true,
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
    console.error("Error in getSessions:", err);
    next(err);
  }
};

// GET single session
const getSessionById = async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            lecturerName: true,
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

    return sendSuccess(res, "Session retrieved.", { session });
  } catch (err) {
    next(err);
  }
};

// POST start session
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

    // ── Check if main rep or assistant rep ──
    let classSpaceId = null;

    if (req.user.role === "COURSE_REP") {
      classSpaceId = req.user.courseRep?.classSpace?.id;
    } else if (req.user.role === "STUDENT") {
      // Check if this student is an assistant rep
      const assistantRep = req.user.student?.assistantRep;
      if (!assistantRep) {
        return sendError(
          res,
          "You don't have permission to start sessions.",
          403,
        );
      }
      classSpaceId = assistantRep.classSpaceId;
    }

    if (!classSpaceId) {
      return sendError(res, "Class space not found.", 404);
    }

    // Check the course belongs to this class space
    const course = await prisma.course.findFirst({
      where: { id: Number(courseId), classSpaceId },
    });

    if (!course) {
      return sendError(res, "Course not found in your class space.", 404);
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

    // 🔥 AUTO-MARK THE COURSE REP AS PRESENT
    const attendance = await prisma.attendance.create({
      data: {
        studentId: repStudentId,
        sessionId: session.id,
        latitude: Number(latitude),
        longitude: Number(longitude),
        status: "PRESENT",
      },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true, studentId: true } },
          },
        },
      },
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

// PATCH close session
const closeSession = async (req, res, next) => {
  try {
    const sessionId = Number(req.params.id);

    // Same check — allow both rep and assistant
    let classSpaceId = null;

    if (req.user.role === "COURSE_REP") {
      classSpaceId = req.user.courseRep?.classSpace?.id;
    } else if (req.user.role === "STUDENT") {
      const assistantRep = req.user.student?.assistantRep;
      if (!assistantRep) {
        return sendError(
          res,
          "You don't have permission to close sessions.",
          403,
        );
      }
      classSpaceId = assistantRep.classSpaceId;
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return sendError(res, "Session not found.", 404);
    }

    // Verify session belongs to their class
    if (session.classSpaceId !== classSpaceId) {
      return sendError(res, "You don't have access to this session.", 403);
    }

    if (!session.isOpen) {
      return sendError(res, "Session is already closed.", 400);
    }

    const closed = await prisma.session.update({
      where: { id: sessionId },
      data: { isOpen: false, endTime: new Date() },
      include: { course: true, attendance: true },
    });

    const presentCount = closed.attendance.filter(
      (a) => a.status === "PRESENT",
    ).length;

    return sendSuccess(res, "Session closed.", {
      session: closed,
      summary: { present: presentCount, total: closed.attendance.length },
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
