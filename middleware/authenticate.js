const jwt = require("jsonwebtoken");
const prisma = require("../prisma/client");
const { sendError } = require("../utils/response");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, "Access denied. No token provided.", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        student: {
          include: {
            classSpace: true,
            courseRep: true,
          },
        },
        courseRep: {
          include: {
            classSpace: {
              include: {
                courses: true,
                _count: { select: { students: true } },
              },
            },
            student: true,
          },
        },
      },
    });

    if (!user) {
      return sendError(res, "User not found.", 401);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return sendError(res, "Token expired. Please log in again.", 401);
    }
    return sendError(res, "Invalid token.", 401);
  }
};

module.exports = authenticate;
