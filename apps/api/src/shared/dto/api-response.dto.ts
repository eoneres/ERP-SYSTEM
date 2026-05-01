export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
  timestamp: string;

  constructor(data: T, message?: string, meta?: PaginationMeta) {
    this.success = true;
    this.data = data;
    this.message = message;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
  }

  static ok<T>(data: T, message?: string): ApiResponse<T> {
    return new ApiResponse(data, message);
  }

  static paginated<T>(
    data: T,
    total: number,
    page: number,
    limit: number,
    message?: string,
  ): ApiResponse<T> {
    const totalPages = Math.ceil(total / limit);
    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
    return new ApiResponse(data, message, meta);
  }
}

export class ApiErrorResponse {
  success: false;
  error: string;
  message: string | string[];
  statusCode: number;
  timestamp: string;
  path?: string;

  constructor(error: string, message: string | string[], statusCode: number, path?: string) {
    this.success = false;
    this.error = error;
    this.message = message;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    this.path = path;
  }
}
