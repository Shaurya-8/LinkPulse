export class AppError extends Error {
    statusCode;
    isOperational;
    code;
    constructor(message, statusCode = 500, code = "INTERNAL_SERVER_ERROR", isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;
        Object.setPrototypeOf(this, new.target.prototype);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
export class ValidationAppError extends AppError {
    errors;
    constructor(errors) {
        super("Validation failed", 422, "VALIDATION_ERROR");
        this.errors = errors;
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized") {
        super(message, 401, 'UNAUTHORIZED');
    }
}
export class ForbiddenError extends AppError {
    constructor(message = "Forbidden") {
        super(message, 403, 'FORBIDDEN');
    }
}
export class NotFoundError extends AppError {
    constructor(resource = "Resource") {
        super(`${resource} not found`, 404, "NOT_FOUND");
    }
}
export class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT');
    }
}
export class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
    }
}
export class BadRequestError extends AppError {
    constructor(message = "Bad request") {
        super(message, 400, "BAD_REQUEST");
    }
}
export class UrlValidationError extends BadRequestError {
    constructor(message) {
        super(message);
        this.name = "UrlValidationError";
    }
}
export class SubscriptionError extends BadRequestError {
    constructor(message) {
        super(message);
        this.name = "SubscriptionError";
    }
}
export class LimitExceededError extends BadRequestError {
    constructor(message) {
        super(message);
        this.name = "LimitExceededError";
    }
}
//# sourceMappingURL=AppError.js.map