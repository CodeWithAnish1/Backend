const asyncHandler = (fn) => async (req, res, next) => {
    try {
        return await fn(req, res, next);
    } catch (err) {
        console.error("CAUGHT ERROR in asyncHandler:", err);
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
    }
};

export { asyncHandler };
