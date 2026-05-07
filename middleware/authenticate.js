const jwt = require("jsonwebtoken");
const prisma = require("../prisma/client");
const { sendError } = require("../utils/response");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, "No token provided. Please login.", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        // ── Course Rep profile ──────────────────────────
        courseRep: {
          include: {
            classSpace: {
              include: {
                courses: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    lecturerName: true,
                  },
                },
                _count: {
                  select: { students: true, sessions: true, courses: true },
                },
              },
            },
            student: {
              select: { id: true },
            },
          },
        },

        // ── Student profile ─────────────────────────────
        student: {
          include: {
            classSpace: {
              include: {
                courses: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    lecturerName: true,
                  },
                },
                _count: {
                  select: { students: true, sessions: true, courses: true },
                },
              },
            },
            // 🔥 THIS IS THE KEY FIX — include assistantRep
            assistantRep: {
              include: {
                classSpace: {
                  include: {
                    courses: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                        lecturerName: true,
                      },
                    },
                    _count: {
                      select: { students: true, sessions: true, courses: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return sendError(res, "User not found. Please login again.", 401);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return sendError(res, "Invalid token. Please login again.", 401);
    }
    if (err.name === "TokenExpiredError") {
      return sendError(res, "Token expired. Please login again.", 401);
    }
    next(err);
  }
};

module.exports = authenticate;
