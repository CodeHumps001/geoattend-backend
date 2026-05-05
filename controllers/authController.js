const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma/client");
const { sendSuccess, sendError } = require("../utils/response");
const { generateClassCode } = require("../utils/classCode");

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
};

// ── Register ──────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      studentId,
      role,
      department,
      level,
      academicYear,
      classCode,
    } = req.body;

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Validate required fields
    if (!name || !normalizedEmail || !password || !studentId || !role) {
      return sendError(
        res,
        "Name, email, password, student ID and role are required.",
        400,
      );
    }

    if (!["STUDENT", "COURSE_REP"].includes(role)) {
      return sendError(res, "Role must be STUDENT or COURSE_REP.", 400);
    }

    // Check duplicates with normalized email
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, { studentId }] },
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return sendError(res, "Email already registered.", 409);
      }
      return sendError(res, "Student ID already registered.", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (role === "COURSE_REP") {
      // Course rep needs department, level, academicYear to create class space
      if (!department || !level || !academicYear) {
        return sendError(
          res,
          "Department, level and academic year are required for course rep.",
          400,
        );
      }

      // Generate unique class code — retry if collision
      let code;
      let attempts = 0;
      do {
        code = generateClassCode(department, level, academicYear);
        const exists = await prisma.classSpace.findUnique({
          where: { classCode: code },
        });
        if (!exists) break;
        attempts++;
      } while (attempts < 10);

      // Create everything in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create user with normalized email
        const user = await tx.user.create({
          data: {
            name,
            email: normalizedEmail,
            studentId,
            password: hashedPassword,
            role: "COURSE_REP",
          },
        });

        // 2. Create course rep profile
        const rep = await tx.courseRep.create({
          data: { userId: user.id, department, level: Number(level) },
        });

        // 3. Create class space
        const classSpace = await tx.classSpace.create({
          data: {
            name: `${department} Level ${level} — ${academicYear}`,
            department,
            level: Number(level),
            academicYear,
            classCode: code,
            courseRepId: rep.id,
          },
        });

        // 4. Also create a student profile for the rep
        const student = await tx.student.create({
          data: {
            userId: user.id,
            department,
            level: Number(level),
            classSpaceId: classSpace.id,
          },
        });

        // 5. Link student profile back to course rep
        await tx.courseRep.update({
          where: { id: rep.id },
          data: { studentId: student.id },
        });

        return { user, rep, classSpace, student };
      });

      const token = generateToken(result.user);

      return sendSuccess(
        res,
        "Course rep account created successfully.",
        {
          token,
          user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            studentId: result.user.studentId,
            role: result.user.role,
            classCode: result.classSpace.classCode,
          },
        },
        201,
      );
    }

    if (role === "STUDENT") {
      if (!classCode) {
        return sendError(res, "Class code is required for students.", 400);
      }

      // Find the class space
      const classSpace = await prisma.classSpace.findUnique({
        where: { classCode },
      });

      if (!classSpace) {
        return sendError(
          res,
          "Invalid class code. Please check with your course rep.",
          404,
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create user with normalized email
        const user = await tx.user.create({
          data: {
            name,
            email: normalizedEmail,
            studentId,
            password: hashedPassword,
            role: "STUDENT",
          },
        });

        // 2. Create student profile and attach to class space
        const student = await tx.student.create({
          data: {
            userId: user.id,
            department: classSpace.department,
            level: classSpace.level,
            classSpaceId: classSpace.id,
          },
        });

        return { user, student };
      });

      const token = generateToken(result.user);

      return sendSuccess(
        res,
        "Student account created. Welcome to the class!",
        {
          token,
          user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            studentId: result.user.studentId,
            role: result.user.role,
            classSpace: {
              id: classSpace.id,
              name: classSpace.name,
              classCode: classSpace.classCode,
            },
          },
        },
        201,
      );
    }
  } catch (err) {
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "Email and password are required.", 400);
    }

    // Normalize email to lowercase for lookup
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        student: { include: { classSpace: true } },
        courseRep: { include: { classSpace: true } },
      },
    });

    if (!user) {
      return sendError(res, "Invalid email or password.", 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return sendError(res, "Invalid email or password.", 401);
    }

    const token = generateToken(user);

    return sendSuccess(res, "Login successful.", {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        role: user.role,
        student: user.student,
        courseRep: user.courseRep,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Me ────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        role: true,
        createdAt: true,
        student: {
          include: {
            classSpace: {
              include: {
                courseRep: {
                  include: { user: { select: { name: true, email: true } } },
                },
                _count: { select: { students: true, courses: true } },
              },
            },
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
          },
        },
      },
    });

    return sendSuccess(res, "User retrieved.", { user });
  } catch (err) {
    next(err);
  }
};

// ── Lookup class code (before joining) ───────────────────
const lookupClassCode = async (req, res, next) => {
  try {
    const { classCode } = req.params;

    const classSpace = await prisma.classSpace.findUnique({
      where: { classCode },
      include: {
        courseRep: {
          include: { user: { select: { name: true } } },
        },
        _count: { select: { students: true } },
      },
    });

    if (!classSpace) {
      return sendError(
        res,
        "Class not found. Check the code and try again.",
        404,
      );
    }

    return sendSuccess(res, "Class found.", {
      classSpace: {
        id: classSpace.id,
        name: classSpace.name,
        department: classSpace.department,
        level: classSpace.level,
        academicYear: classSpace.academicYear,
        classCode: classSpace.classCode,
        repName: classSpace.courseRep.user.name,
        memberCount: classSpace._count.students,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, lookupClassCode };
