-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'COURSE_REP');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSpace" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "academicYear" TEXT NOT NULL,
    "classCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "courseRepId" INTEGER NOT NULL,

    CONSTRAINT "ClassSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseRep" (
    "id" SERIAL NOT NULL,
    "department" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "studentId" INTEGER,

    CONSTRAINT "CourseRep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "department" TEXT,
    "level" INTEGER,
    "userId" INTEGER NOT NULL,
    "classSpaceId" INTEGER,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lecturerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classSpaceId" INTEGER NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 100,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "courseId" INTEGER NOT NULL,
    "classSpaceId" INTEGER NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSpace_classCode_key" ON "ClassSpace"("classCode");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSpace_courseRepId_key" ON "ClassSpace"("courseRepId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseRep_userId_key" ON "CourseRep"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseRep_studentId_key" ON "CourseRep"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_classSpaceId_key" ON "Course"("code", "classSpaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_sessionId_key" ON "Attendance"("studentId", "sessionId");

-- AddForeignKey
ALTER TABLE "ClassSpace" ADD CONSTRAINT "ClassSpace_courseRepId_fkey" FOREIGN KEY ("courseRepId") REFERENCES "CourseRep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseRep" ADD CONSTRAINT "CourseRep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseRep" ADD CONSTRAINT "CourseRep_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classSpaceId_fkey" FOREIGN KEY ("classSpaceId") REFERENCES "ClassSpace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_classSpaceId_fkey" FOREIGN KEY ("classSpaceId") REFERENCES "ClassSpace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_classSpaceId_fkey" FOREIGN KEY ("classSpaceId") REFERENCES "ClassSpace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
