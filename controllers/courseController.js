const prisma = require("../prisma/client");
const { sendSuccess, sendError } = require("../utils/response");

// GET all courses in class space
const getCourses = async (req, res, next) => {
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

    const courses = await prisma.course.findMany({
      where: { classSpaceId },
      include: {
        sessions: {
          include: { attendance: true },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return sendSuccess(res, "Courses retrieved.", {
      courses,
      count: courses.length,
    });
  } catch (err) {
    next(err);
  }
};

// GET single course
const getCourseById = async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        classSpace: {
          include: {
            students: {
              include: {
                user: { select: { name: true, email: true, studentId: true } },
              },
            },
          },
        },
        sessions: {
          include: {
            attendance: {
              include: {
                student: {
                  include: {
                    user: {
                      select: { name: true, email: true, studentId: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!course) {
      return sendError(res, "Course not found.", 404);
    }

    return sendSuccess(res, "Course retrieved.", { course });
  } catch (err) {
    next(err);
  }
};

// POST create course (course rep only)
const createCourse = async (req, res, next) => {
  try {
    const { code, name, lecturerName } = req.body;

    if (!code || !name) {
      return sendError(res, "Course code and name are required.", 400);
    }

    const classSpaceId = req.user.courseRep?.classSpace?.id;

    if (!classSpaceId) {
      return sendError(res, "You don't have a class space.", 404);
    }

    const course = await prisma.course.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        lecturerName: lecturerName?.trim() || null,
        classSpaceId,
      },
    });

    return sendSuccess(res, "Course created.", { course }, 201);
  } catch (err) {
    next(err);
  }
};

// PUT update course
const updateCourse = async (req, res, next) => {
  try {
    const { code, name, lecturerName } = req.body;
    const courseId = Number(req.params.id);

    const course = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...(code && { code: code.trim().toUpperCase() }),
        ...(name && { name: name.trim() }),
        ...(lecturerName !== undefined && {
          lecturerName: lecturerName?.trim() || null,
        }),
      },
    });

    return sendSuccess(res, "Course updated.", { course });
  } catch (err) {
    next(err);
  }
};

// DELETE course
const deleteCourse = async (req, res, next) => {
  try {
    await prisma.course.delete({
      where: { id: Number(req.params.id) },
    });

    return sendSuccess(res, "Course deleted.");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};
