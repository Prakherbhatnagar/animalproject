import { errorResponse } from './../utils/responseHandler.js';

const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      // Validate req.body, req.query, or req.params depending on schema logic
      schema.parse(req.body);
      next();
    } catch (error) {
      // Zod throws an error object with a .errors array
      return errorResponse(res, 400, 'Validation Error', error.errors);
    }
  };
};

export default validateRequest;
