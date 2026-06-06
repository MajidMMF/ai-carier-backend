export const errorHandler = (err, _req, res, _next) => {
    const statusCode = err.statusCode || 500;
    console.error(err);
    res.status(statusCode).json({
        message: err.message || "Internal Server Error",
        status: err.status || "error",
    });
};
