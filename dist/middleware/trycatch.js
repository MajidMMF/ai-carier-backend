const TryCatch = (handler) => {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch((err) => {
            err.statusCode = err.statusCode || 500;
            err.status = err.status || "error";
            if (process.env.NODE_ENV === "development") {
                console.error(err);
            }
            next(err);
        });
    };
};
export default TryCatch;
