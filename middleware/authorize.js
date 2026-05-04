const { sendError } = require("../utils/response");

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Required role: ${roles.join(" or ")}`,
        403,
      );
    }
    next();
  };
};

module.exports = authorize;
