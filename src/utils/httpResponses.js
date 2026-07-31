const sendSuccess = (res, statusCode, payload = {}) => {
  return res.status(statusCode).json({
    success: true,
    ...payload,
  });
};

const sendError = (res, statusCode, message, extra = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...extra,
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
