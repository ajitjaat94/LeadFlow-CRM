import { json } from "express";

function globelErrorHandler(err, req, res, next) {
  const statusCode = err.status || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || "internal Server Error",
    //Showing full error in development mode not shoing production error full
    error: process.env.NODE_ENV === "development" ? err : null
  });
}

export default globelErrorHandler;
