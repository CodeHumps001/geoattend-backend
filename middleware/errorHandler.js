const { Prisma } = require("@prisma/client");

const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err.message);

  // Prisma unique constraint violation
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] || "field";
      return res.status(409).json({
        success: false,
        message: `${field} already exists.`,
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Record not found.",
      });
    }
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token." });
  }

  // Operational errors (thrown deliberately)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Unknown errors
  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong."
        : err.message,
  });
};

module.exports = errorHandler;
