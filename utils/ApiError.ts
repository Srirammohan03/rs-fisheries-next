export class ApiError extends Error {
  statusCode: number;
  errors: string[];
  success: boolean;

  constructor(
    statusCode: number,
    message = "Something went wrong",
    errors: string[] = []
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.success = false;

    Error.captureStackTrace(this, this.constructor);
  }
}
