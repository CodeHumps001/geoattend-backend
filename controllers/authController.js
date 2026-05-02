const prisma = require("../prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendSuccess } = require("../utils/response");
const AppError = require("../utils/AppError");

const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      throw new AppError("All fields are required", 400);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError("Email already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role },
    });

    if (role === "STUDENT") {
      const { studentCode, department, level } = req.body;
      if (!studentCode || !department || !level) {
        await prisma.user.delete({ where: { id: user.id } });
        throw new AppError(
          "studentCode, department and level are required for students",
          400,
        );
      }
      await prisma.student.create({
        data: {
          studentCode,
          department,
          level: Number(level),
          userId: user.id,
        },
      });
    }

    if (role === "LECTURER") {
      const { staffCode, department } = req.body;
      if (!staffCode || !department) {
        await prisma.user.delete({ where: { id: user.id } });
        throw new AppError(
          "staffCode and department are required for lecturers",
          400,
        );
      }
      await prisma.lecturer.create({
        data: { staffCode, department, userId: user.id },
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    return sendSuccess(
      res,
      "Registration successful",
      { user: userWithoutPassword },
      201,
    );
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid credentials", 401);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    const { password: _, ...userWithoutPassword } = user;
    return sendSuccess(res, "Login successful", {
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        student: true,
        lecturer: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return sendSuccess(res, "Profile retrieved successfully", { user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe };
