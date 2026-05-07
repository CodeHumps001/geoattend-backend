const prisma = require("../prisma/client");
const { sendSuccess, sendError } = require("../utils/response");

// ── GET all sessions in class space ───────────────────────
const getSessions = async (req, res, next) => {
  try {
    let classSpaceId;

    if (req.user.role === "COURSE_REP") {
      const courseRep = await prisma.courseRep.findUnique({
        where: { userId: req.user.id },
        include: { classSpace: { select: { id: true } } },
      });
      classSpaceId = courseRep?.classSpace?.id;
    } else if (req.user.role === "STUDENT") {
      // Could be assistant rep or regular student
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
        select: {
          classSpaceId: true,
          assistantRep: { select: { classSpaceId: true } },
        },
      });
      // Assistant rep uses their assigned class space
      classSpaceId =
        student?.assistantRep?.classSpaceId || student?.classSpaceId;
    }

    if (!classSpaceId) {
      return sendError(res, "No class space found.", 404);
    }

    const sessions = await prisma.session.findMany({
      where: { classSpaceId },
      include: {
        course: {
          select: { id: true, code: true, name: true, lecturerName: true },
        },
        attendance: {
          select: {
            id: true,
            status: true,
            studentId: true,
            markedAt: true,
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
    console.error("Error in getSessions:", err);
    next(err);
  }
};

// ── GET single session ────────────────────────────────────
const getSessionById = async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        course: {
          select: { id: true, code: true, name: true, lecturerName: true },
        },
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

    const totalStudents = session.classSpace?.students?.length || 0;

    return sendSuccess(res, "Session retrieved.", {
      session,
      stats: {
        totalStudents,
        present: presentCount,
        absent: totalStudents - presentCount,
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

// ── POST start session ────────────────────────────────────
const startSession = async (req, res, next) => {
  try {
    const { courseId, latitude, longitude, radiusMeters } = req.body;

    if (!courseId || latitude === undefined || longitude === undefined) {
      return sendError(
        res,
        "Course ID, latitude and longitude are required.",
        400,
      );
    }

    let classSpaceId = null;
    let starterStudentId = null; // Track who started (rep or assistant)

    if (req.user.role === "COURSE_REP") {
      // Get the course rep's class space and their student profile
      const courseRep = await prisma.courseRep.findUnique({
        where: { userId: req.user.id },
        include: {
          classSpace: { select: { id: true } },
          student: { select: { id: true } }, // course rep's student profile
        },
      });
      classSpaceId = courseRep?.classSpace?.id;
      starterStudentId = courseRep?.student?.id;
    } else if (req.user.role === "STUDENT") {
      // Check if this student is an assistant rep
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
        include: {
          assistantRep: { select: { classSpaceId: true } },
        },
      });

      if (!student?.assistantRep) {
        return sendError(
          res,
          "You don't have permission to start sessions.",
          403,
        );
      }

      classSpaceId = student.assistantRep.classSpaceId;
      starterStudentId = student.id; // assistant also gets auto-marked
    }

    if (!classSpaceId) {
      return sendError(res, "Class space not found.", 404);
    }

    // Verify the course belongs to this class space
    const course = await prisma.course.findFirst({
      where: { id: Number(courseId), classSpaceId },
    });

    if (!course) {
      return sendError(res, "Course not found in your class space.", 404);
    }

    // Check no other open session for this course
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

    // Create session + auto-mark starter as PRESENT in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the session
      const session = await tx.session.create({
        data: {
          courseId: Number(courseId),
          classSpaceId,
          latitude: Number(latitude),
          longitude: Number(longitude),
          radiusMeters: Number(radiusMeters) || 100,
          startTime: new Date(),
          isOpen: true,
        },
        include: {
          course: {
            select: { id: true, code: true, name: true, lecturerName: true },
          },
        },
      });

      // 2. Auto-mark the starter (rep or assistant) as PRESENT
      if (starterStudentId) {
        // Check not already marked (edge case)
        const alreadyMarked = await tx.attendance.findUnique({
          where: {
            studentId_sessionId: {
              studentId: starterStudentId,
              sessionId: session.id,
            },
          },
        });

        if (!alreadyMarked) {
          await tx.attendance.create({
            data: {
              studentId: starterStudentId,
              sessionId: session.id,
              latitude: Number(latitude),
              longitude: Number(longitude),
              status: "PRESENT",
            },
          });
        }
      }

      return session;
    });

    return sendSuccess(
      res,
      "Session started. Students can now mark attendance.",
      { session: result },
      201,
    );
  } catch (err) {
    console.error("Error in startSession:", err);
    next(err);
  }
};

// ── PATCH close session ───────────────────────────────────
const closeSession = async (req, res, next) => {
  try {
    const sessionId = Number(req.params.id);
    let classSpaceId = null;

    if (req.user.role === "COURSE_REP") {
      const courseRep = await prisma.courseRep.findUnique({
        where: { userId: req.user.id },
        include: { classSpace: { select: { id: true } } },
      });
      classSpaceId = courseRep?.classSpace?.id;
    } else if (req.user.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
        include: { assistantRep: { select: { classSpaceId: true } } },
      });

      if (!student?.assistantRep) {
        return sendError(
          res,
          "You don't have permission to close sessions.",
          403,
        );
      }
      classSpaceId = student.assistantRep.classSpaceId;
    }

    if (!classSpaceId) {
      return sendError(res, "Class space not found.", 404);
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return sendError(res, "Session not found.", 404);
    }

    if (session.classSpaceId !== classSpaceId) {
      return sendError(res, "You don't have access to this session.", 403);
    }

    if (!session.isOpen) {
      return sendError(res, "Session is already closed.", 400);
    }

    const closed = await prisma.session.update({
      where: { id: sessionId },
      data: { isOpen: false, endTime: new Date() },
      include: {
        course: {
          select: { id: true, code: true, name: true },
        },
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

// ── DELETE session ────────────────────────────────────────
const deleteSession = async (req, res, next) => {
  try {
    const sessionId = Number(req.params.id);
    let classSpaceId = null;

    if (req.user.role === "COURSE_REP") {
      const courseRep = await prisma.courseRep.findUnique({
        where: { userId: req.user.id },
        include: { classSpace: { select: { id: true } } },
      });
      classSpaceId = courseRep?.classSpace?.id;
    } else {
      return sendError(
        res,
        "Only the main course rep can delete sessions.",
        403,
      );
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return sendError(res, "Session not found.", 404);
    }

    if (session.classSpaceId !== classSpaceId) {
      return sendError(res, "You don't have access to this session.", 403);
    }

    // Delete attendance records first, then session
    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { sessionId } }),
      prisma.session.delete({ where: { id: sessionId } }),
    ]);

    return sendSuccess(res, "Session deleted.");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSessions,
  getSessionById,
  startSession,
  closeSession,
  deleteSession,
};
