import logger from '../config/logger.js';
import { errorResponse } from '../utils/responseHandler.js';

const errorHandler = (err, req, res, next) => {
  logger.error(`${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  logger.error(err.stack);

  if (err.name === 'ValidationError') {
    return errorResponse(res, 400, 'Validation Error', err.errors);
  }

  if (err.code === 11000) {
    return errorResponse(res, 409, 'Duplicate Key Error', err.keyValue);
  }

  // Fallback
  return errorResponse(res, err.statusCode || 500, err.message || 'Internal Server Error', null);
};

export default errorHandler;
