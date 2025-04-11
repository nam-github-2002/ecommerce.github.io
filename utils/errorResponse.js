class ErrorResponse extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;

        // Ghi lại Stack Trace (dùng để debug)
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = ErrorResponse;
