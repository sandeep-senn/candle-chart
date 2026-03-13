import jwt from "jsonwebtoken";

// Bypass Auth for testing
export const protect = (req, res, next) => {
  req.user = { id: 1 }; // Default to first user
  return next();
};
