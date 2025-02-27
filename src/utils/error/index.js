export const asyncHandler = (func) => {
    return (req, res, next) => {
        func(req, res, next).catch(err => {
            //! return res.status({ message: "server error", message: err.message, stack: err.stack, err })
            return next(err)
        })
    }
};

export const globalErrorHandler = (err, req, res, next) => {
    if (process.env.MODE == "DEV_MODE_ONLY") {
        const statusCode = err.status || 500;
        return res.status(statusCode).json({
            message: err.message || "Internal Server Error",
            stack: err.stack || null
        });
    } else {
        const statusCode = err.status || 500;
        return res.status(statusCode).json({
            message: err.message || "Internal Server Error",
        });
    }
}