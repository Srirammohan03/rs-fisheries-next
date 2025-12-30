export class ApiResponse<T, M = null> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  meta?: M;

  constructor(
    statusCode: number,
    data: T | null,
    message = "Success",
    meta?: M
  ) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }
}
