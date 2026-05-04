const prisma = require("../prisma/client");
const { sendSuccess, sendError } = require("../utils/response");

// GET my class space (course rep)
const getMyClassSpace = async (req, res, next) => {
  try {
    const classSpace = await prisma.classSpace.findUnique({
      where: { courseRepId: req.user.courseRep.id },
      include: {
        courses: {
          include: {
            sessions: {
              include: { attendance: true },
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        students: {
          include: {
            user: { select: { name: true, email: true, studentId: true } },
            attendance: {
              include: { session: { include: { course: true } } },
              orderBy: { markedAt: "desc" },
              take: 5,
            },
          },
          orderBy: { id: "asc" },
        },
        _count: { select: { students: true, courses: true, sessions: true } },
      },
    });

    if (!classSpace) {
      return sendError(res, "Class space not found.", 404);
    }

    return sendSuccess(res, "Class space retrieved.", { classSpace });
  } catch (err) {
    next(err);
  }
};

// GET class space for students
const getStudentClassSpace = async (req, res, next) => {
  try {
    const student = req.user.student;

    if (!student?.classSpaceId) {
      return sendError(res, "You are not part of a class yet.", 404);
    }

    const classSpace = await prisma.classSpace.findUnique({
      where: { id: student.classSpaceId },
      include: {
        courseRep: {
          include: {
            user: { select: { name: true, email: true, studentId: true } },
          },
        },
        courses: {
          include: {
            sessions: {
              include: { attendance: true },
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { students: true, courses: true } },
      },
    });

    return sendSuccess(res, "Class space retrieved.", { classSpace });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyClassSpace, getStudentClassSpace };
