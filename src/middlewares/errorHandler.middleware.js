const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  if (!statusCode) {
    statusCode = 500;
  }

  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
  });
};

export default errorHandler;

/* 
  Parameters: (err, req, res, next)

    1. `err`: The error object passed from Express when an error is thrown.
    2. `req, res`: The request and response objects.
    3. `next`: The next middleware function in the stack.

  Logic:
  1. It first checks if `err` contains a statusCode. If not provided, it defaults to 500 (Internal Server Error).
  2. It then sends a JSON response with the appropriate status code (statusCode) and includes the error message (message) from the err object.
*/
