import { ERROR_CODES } from "@repo/config";

// ============================================================================
// STANDARDIZED ERROR CLASSES — All use 5-digit codes from @repo/config
// ============================================================================

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = ERROR_CODES.INTERNAL_ERROR
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, ERROR_CODES.NOT_FOUND);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, ERROR_CODES.INVALID_CREDENTIALS);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403, ERROR_CODES.FORBIDDEN);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, ERROR_CODES.CONFLICT);
  }
}

export class ValidationError extends AppError {
  constructor(
    public errors: Record<string, string> = {},
    message: string = "Validation failed"
  ) {
    super(message, 400, ERROR_CODES.INVALID_INPUT);
  }
}

export class SafetyGateError extends AppError {
  constructor(
    public gate: string,
    message: string = `Safety gate failed: ${gate}`
  ) {
    super(message, 403, ERROR_CODES.GEAR_NOT_SERVICEABLE);
  }
}

export class ConflictLoadError extends AppError {
  constructor(message: string) {
    super(message, 409, ERROR_CODES.INVALID_LOAD_STATUS);
  }
}

export class PaymentError extends AppError {
  constructor(message: string) {
    super(message, 402, ERROR_CODES.PAYMENT_FAILED);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded") {
    super(message, 429, ERROR_CODES.SERVICE_UNAVAILABLE);
  }
}
