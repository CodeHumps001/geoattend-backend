const prisma = require("../prisma/client");
const { sendSuccess, sendError } = require("../utils/response");

const getMyLecturerProfile = async (req, res, next) => {
  try {
    const lecturer = await prisma.lecturer.findUnique({
      where: { userId: req.user.id },
      include: {
        user: { select: { name: true, email: true, role: true } },
        courses: {
          include: {
            enrollments: {
              include: {
                student: {
                  include: { user: { select: { name: true } } },
                },
              },
            },
            sessions: {
              include: { attendance: true },
              orderBy: { date: "desc" },
              take: 5,
            },
          },
        },
      },
    });

    if (!lecturer) {
      return sendError(res, "Lecturer profile not found", 404);
    }

    return sendSuccess(res, "Lecturer profile retrieved", { lecturer });
  } catch (err) {
    next(err);
  }
};

const getAllLecturers = async (req, res, next) => {
  try {
    const lecturers = await prisma.lecturer.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        courses: true,
      },
    });
    return sendSuccess(res, "Lecturers retrieved", { lecturers });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyLecturerProfile, getAllLecturers };
