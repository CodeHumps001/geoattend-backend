const prisma = require("../prisma/client");
const { sendSuccess } = require("../utils/response");
const AppError = require("../utils/AppError");

const getAllStudents = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    // Build the where clause dynamically
    // If search is provided, filter by name or email
    const where = search
      ? {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : {};

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { name: true, email: true, role: true } },
        },
        orderBy: { id: "asc" },
      }),
      prisma.student.count({ where }),
    ]);

    return sendSuccess(res, "Students retrieved successfully", {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      students,
    });
  } catch (err) {
    next(err);
  }
};
const getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({
      where: { id: Number(id) },
      include: {
        user: { select: { name: true, email: true } },
        enrollments: { include: { course: true } },
        attendance: { include: { session: true } },
      },
    });

    if (!student) {
      throw new AppError(`Student with id ${id} not found`, 404);
    }

    return sendSuccess(res, "Student retrieved successfully", { student });
  } catch (err) {
    next(err);
  }
};

const getStudentsByDepartment = async (req, res, next) => {
  try {
    const { department } = req.params;
    const students = await prisma.student.findMany({
      where: {
        department: { equals: department, mode: "insensitive" },
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (students.length === 0) {
      throw new AppError(`No students found in ${department} department`, 404);
    }

    return sendSuccess(res, "Students retrieved successfully", {
      count: students.length,
      students,
    });
  } catch (err) {
    next(err);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({
      where: { id: Number(id) },
      include: { user: true },
    });

    if (!student) {
      throw new AppError(`Student with id ${id} not found`, 404);
    }

    await prisma.student.delete({ where: { id: Number(id) } });
    await prisma.user.delete({ where: { id: student.userId } });

    return sendSuccess(res, `Student ${student.user.name} has been removed`);
  } catch (err) {
    next(err);
  }
};

const getAttendancePercentage = async (req, res, next) => {
  try {
    const { id, courseId } = req.params;

    const totalSessions = await prisma.session.count({
      where: { courseId: Number(courseId) },
    });

    if (totalSessions === 0) {
      throw new AppError("No sessions found for this course yet", 404);
    }

    const attended = await prisma.attendance.count({
      where: {
        studentId: Number(id),
        session: { courseId: Number(courseId) },
        status: "PRESENT",
      },
    });

    const percentage = ((attended / totalSessions) * 100).toFixed(1);

    return sendSuccess(res, "Attendance percentage retrieved", {
      studentId: Number(id),
      courseId: Number(courseId),
      totalSessions,
      attended,
      percentage: `${percentage}%`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  getStudentsByDepartment,
  deleteStudent,
  getAttendancePercentage,
};
