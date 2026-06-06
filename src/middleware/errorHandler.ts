import { NextFunction, Request, Response } from "express";

interface AppError extends Error {
    statusCode?: number;
    status?: string;
}

export const errorHandler = (
    err: AppError,
    _req: Request,
    res: Response,
    _next: NextFunction,
) => {
    const statusCode = err.statusCode || 500;

    console.error(err);

    res.status(statusCode).json({
        message: err.message || "Internal Server Error",
        status: err.status || "error",
    });
};
