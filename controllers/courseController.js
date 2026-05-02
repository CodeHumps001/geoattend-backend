const prisma = require("../prisma/client");
const { sendSuccess } = require("../utils/response");
const AppError = require("../utils/AppError");

// ─── CREATE COURSE ───────────────────────────────────
const createCourse = async (req, res, next) => {
  try {
    const { code, name, department, semester, lecturerId } = req.body;

    if (!code || !name || !department || !semester || !lecturerId) {
      throw new AppError("All fields are required", 400);
    }

    // Check if course code already exists
    const existing = await prisma.course.findUnique({ where: { code } });
    if (existing) {
      throw new AppError(`Course with code ${code} already exists`, 409);
    }

    const course = await prisma.course.create({
      data: {
        code,
        name,
        department,
        semester,
        lecturerId: Number(lecturerId),
      },
    });

    return sendSuccess(res, "Course created successfully", { course }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET ALL COURSES ─────────────────────────────────
const getAllCourses = async (req, res, next) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        // include the lecturer and their user info
        lecturer: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    return sendSuccess(res, "Courses retrieved successfully", {
      count: courses.length,
      courses,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET COURSE BY ID ────────────────────────────────
const getCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const course = await prisma.course.findUnique({
      where: { id: Number(id) },
      include: {
        lecturer: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        // include all enrolled students
        enrollments: {
          include: {
            student: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new AppError(`Course with id ${id} not found`, 404);
    }

    return sendSuccess(res, "Course retrieved successfully", { course });
  } catch (err) {
    next(err);
  }
};

// ─── ENROLL STUDENT ──────────────────────────────────
const enrollStudent = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      throw new AppError("studentId and courseId are required", 400);
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: Number(studentId) },
    });
    if (!student) {
      throw new AppError("Student not found", 404);
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: Number(courseId) },
    });
    if (!course) {
      throw new AppError("Course not found", 404);
    }

    // Check if already enrolled
    // findFirst is used here because we're checking two fields together
    const existing = await prisma.enrollment.findFirst({
      where: {
        studentId: Number(studentId),
        courseId: Number(courseId),
      },
    });

    if (existing) {
      throw new AppError("Student is already enrolled in this course", 409);
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: Number(studentId),
        courseId: Number(courseId),
      },
    });

    return sendSuccess(
      res,
      "Student enrolled successfully",
      { enrollment },
      201,
    );
  } catch (err) {
    next(err);
  }
};

module.exports = { createCourse, getAllCourses, getCourseById, enrollStudent };
