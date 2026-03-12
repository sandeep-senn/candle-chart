import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (error) {
      console.error("Token failed:", error);
      return res.status(401).json({ message: "Not authorized - Token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized - No token" });
  }
};
