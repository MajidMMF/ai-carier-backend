import { Request, Response, NextFunction, RequestHandler } from "express";

interface CustomError extends Error {
    statusCode?: number;
    status?: string;
    isOperational?: boolean;
}

const TryCatch = (handler: RequestHandler): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(handler(req, res, next)).catch((err: CustomError) => {
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