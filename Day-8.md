## Day 8 — Security, Error Handling & API Polish

### Custom Error Class

```js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
// Usage
throw new AppError("Student not found", 404);
```

### Central Error Handler

- One place handles ALL errors passed to next(err)
- Handles AppError, Prisma errors, JWT errors, Zod errors, unknown errors
- Never leaks stack traces to client in production
- Prisma P2002 = duplicate field, P2025 = not found, P2003 = bad foreign key

### Security Packages

```bash
npm install helmet cors express-rate-limit morgan
```

**Helmet** — sets secure HTTP headers automatically

**CORS** — allows frontend on different URL to call your API

```js
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
```

**Rate Limiting** — prevents brute force and abuse

```js
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);
```

**Morgan** — professional HTTP request logging

```js
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));
```

### API Versioning

- Add version to URL: `/api/v1/students` not `/api/students`
- When breaking changes are needed create `/api/v2/`
- Old clients keep using v1, new clients use v2

### Health Check Route

```js
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});
```

### Environment-Based Behaviour

- Development → show full error with stack trace for debugging
- Production → show only vague message, never expose internals
- Always check `process.env.NODE_ENV` to decide what to show
