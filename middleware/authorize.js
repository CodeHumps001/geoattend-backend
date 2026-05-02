// authorize is a function that RETURNS middleware
// This pattern is called a "middleware factory"
// It lets you pass arguments to middleware

// Usage: authorize("LECTURER") or authorize("ADMIN") or authorize("LECTURER", "ADMIN")

const AppError = require("../utils/AppError");

const authorize = (...roles) => {
  return (req, res, next) => {
    // authenticate middleware must run first — it sets req.user
    // if req.user doesn't exist something is wrong
    if (!req.user) {
      throw new AppError("Not authenticated", 401);
    }

    // Check if the user's role is in the allowed roles list
    // roles is an array like ["LECTURER", "ADMIN"]
    // req.user.role is the role from the JWT token
    if (!roles.includes(req.user.role)) {
      throw new AppError(
        `Access denied. Required role: ${roles.join(" or ")}`,
        403,
      );
    }

    // Role is allowed — proceed
    next();
  };
};

module.exports = authorize;
