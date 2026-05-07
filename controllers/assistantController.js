const prisma = require("../prisma/client");
const { sendSuccess, sendError } = require("../utils/response");

// GET — all assistants for a class space
const getAssistants = async (req, res, next) => {
  try {
    const classSpaceId = req.user.courseRep?.classSpace?.id;

    if (!classSpaceId) {
      return sendError(res, "Class space not found.", 404);
    }

    const assistants = await prisma.assistantRep.findMany({
      where: { classSpaceId },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, email: true, studentId: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return sendSuccess(res, "Assistants retrieved.", { assistants });
  } catch (err) {
    next(err);
  }
};

// POST — promote a student to assistant rep
const promoteAssistant = async (req, res, next) => {
  try {
    const { studentId } = req.body;
    const classSpaceId = req.user.courseRep?.classSpace?.id;

    if (!classSpaceId) {
      return sendError(res, "Class space not found.", 404);
    }

    if (!studentId) {
      return sendError(res, "Student ID is required.", 400);
    }

    // Max 2 assistants
    const currentCount = await prisma.assistantRep.count({
      where: { classSpaceId },
    });

    if (currentCount >= 2) {
      return sendError(
        res,
        "Maximum of 2 assistant reps allowed. Remove one before adding another.",
        400,
      );
    }

    // Check student is in this class
    const student = await prisma.student.findFirst({
      where: { id: Number(studentId), classSpaceId },
      include: {
        user: { select: { name: true, email: true, studentId: true } },
      },
    });

    if (!student) {
      return sendError(res, "Student not found in this class.", 404);
    }

    // Check student is not the main rep
    const isMainRep = await prisma.courseRep.findFirst({
      where: { studentId: Number(studentId) },
    });

    if (isMainRep) {
      return sendError(
        res,
        "This student is already the main course rep.",
        400,
      );
    }

    // Check not already an assistant
    const alreadyAssistant = await prisma.assistantRep.findUnique({
      where: {
        studentId_classSpaceId: {
          studentId: Number(studentId),
          classSpaceId,
        },
      },
    });

    if (alreadyAssistant) {
      return sendError(res, "This student is already an assistant rep.", 400);
    }

    const assistant = await prisma.assistantRep.create({
      data: {
        studentId: Number(studentId),
        classSpaceId,
      },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true, studentId: true } },
          },
        },
      },
    });

    return sendSuccess(
      res,
      `${student.user.name} is now an assistant rep. They can start and close sessions.`,
      { assistant },
      201,
    );
  } catch (err) {
    next(err);
  }
};

// DELETE — remove assistant rep
const removeAssistant = async (req, res, next) => {
  try {
    const { assistantId } = req.params;
    const classSpaceId = req.user.courseRep?.classSpace?.id;

    if (!classSpaceId) {
      return sendError(res, "Class space not found.", 404);
    }

    const assistant = await prisma.assistantRep.findFirst({
      where: {
        id: Number(assistantId),
        classSpaceId,
      },
      include: {
        student: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!assistant) {
      return sendError(res, "Assistant not found.", 404);
    }

    await prisma.assistantRep.delete({
      where: { id: Number(assistantId) },
    });

    return sendSuccess(
      res,
      `${assistant.student.user.name} has been removed as assistant rep.`,
    );
  } catch (err) {
    next(err);
  }
};

module.exports = { getAssistants, promoteAssistant, removeAssistant };
