// AppError is a custom error class that extends JavaScript's
// built-in Error class.
//
// The key difference from a normal Error is that AppError
// carries a statusCode — so your error handler always knows
// what HTTP status to send back without guessing.
//
// How to use it:
// throw new AppError("Student not found", 404);
// throw new AppError("Email already exists", 409);
// throw new AppError("Invalid credentials", 401);

class AppError extends Error {
  constructor(message, statusCode) {
    // super() calls the parent Error constructor
    // This sets this.message correctly
    super(message);

    this.statusCode = statusCode;

    // isOperational = true means this is an expected error
    // that we created deliberately (not found, bad input etc.)
    // isOperational = false means something truly unexpected
    // broke — a bug in our code or a database crash
    this.isOperational = true;

    // Captures where in the code this error was created
    // Keeps the stack trace clean — doesn't include AppError itself
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
