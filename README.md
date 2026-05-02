## Day 5 — PostgreSQL, Prisma ORM & Real Database Integration

### Why Databases Matter

- In-memory arrays reset on every server restart
- PostgreSQL stores data on disk — survives restarts permanently
- Relational databases store data in tables that reference each other
- Foreign keys enforce relationships — can't add attendance for non-existent student
- Constraints prevent bad data — unique emails, single attendance per session

### Key Database Concepts

- **Primary Key** — unique identifier for every row, usually `id`
- **Foreign Key** — a column that references the primary key of another table
- **Migration** — turning your schema definition into real database tables
- **Junction Table** — sits between two tables to create many-to-many relationships
- **Composite Unique** — combination of two columns must be unique together

### Prisma ORM

- ORM = Object Relational Mapper — write JavaScript instead of SQL
- Three parts: Schema (define models), Migrate (create tables), Client (query data)

**Installation**

```bash
npm install prisma@5.16.0 --save-dev
npm install @prisma/client@5.16.0
npx prisma init
npx prisma migrate dev --name init
npx prisma studio  # visual database browser
```

**Prisma Client setup**

```js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
module.exports = prisma;
```

**Five core operations**

```js
prisma.model.findMany(); // get all
prisma.model.findMany({ where: {} }); // get filtered
prisma.model.findUnique({ where: { id } }); // get one
prisma.model.create({ data: {} }); // create
prisma.model.update({ where: {}, data: {} }); // update
prisma.model.delete({ where: { id } }); // delete
```

**Including related data**

```js
prisma.student.findUnique({
  where: { id: 1 },
  include: {
    user: true,
    enrollments: { include: { course: true } },
  },
});
```

**Selecting specific fields**

```js
prisma.student.findMany({
  include: {
    user: { select: { name: true, email: true } }, // never return password
  },
});
```

### GeoAttend Database Design

- 7 tables: User, Student, Lecturer, Course, Enrollment, Session, Attendance
- Single User table for all roles — role field determines access level
- Student and Lecturer are profile extensions of User
- Enrollment is a junction table linking Students to Courses
- Session captures GPS location when lecturer starts a class
- Attendance captures student GPS and calculates PRESENT/ABSENT via Haversine formula

### Registration Flow

- Single endpoint handles all roles
- Always creates User record first
- STUDENT role → also creates Student profile linked to User
- LECTURER role → also creates Lecturer profile linked to User
- ADMIN role → just the User record

### Password Security

```js
// Hashing — never store plain text
const hashed = await bcrypt.hash(password, 10);

// Comparing — on login
const isMatch = await bcrypt.compare(inputPassword, hashedPassword);

// Never return password in responses
const { password: _, ...userWithoutPassword } = user;
```

### GPS Attendance Logic

- Session stores lecturer GPS coordinates and allowed radius (default 100m)
- Student submits their GPS when marking attendance
- Haversine formula calculates real distance between two coordinates
- Within radius → PRESENT, outside radius → ABSENT
- In production GPS comes from phone automatically — no manual entry

### Important Rules

- Always use async/await with try/catch for all Prisma queries
- Always use Number() when converting req.params — URL params are strings
- Delete child records before parent records — foreign key constraint order
- Specific routes must come before dynamic routes in route files
- One PrismaClient instance shared across the entire app
- Node.js v22 LTS required — v24 has Prisma compatibility issues
