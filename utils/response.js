// These are helper functions that format every response
// the same way across your entire API.
// Instead of writing res.json({ count, students }) differently
// every time, you call sendSuccess() or sendError() and
// the shape is always consistent.

const sendSuccess = (res, message, data = null, statusCode = 200) => {
  const response = {
    success: true,
    message,
  };

  // Only include data field if data was actually provided
  // This keeps responses clean — no null fields
  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

const sendError = (res, message, statusCode = 400, error = null) => {
  const response = {
    success: false,
    message,
  };

  // Only include error details if provided
  if (error !== null) {
    response.error = error;
  }

  return res.status(statusCode).json(response);
};

module.exports = { sendSuccess, sendError };
