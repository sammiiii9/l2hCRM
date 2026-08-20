import { NextResponse } from "next/server";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  errors?: Record<string, string[]> | string;
}

export function successResponse<T>(data: T, message?: string, meta?: ApiResponse["meta"], status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      message,
      data,
      meta,
    },
    { status }
  );
}

export function errorResponse(message: string, status = 400, errors?: Record<string, string[]> | string) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      message,
      errors,
    },
    { status }
  );
}

export function unauthorizedResponse(message = "Authentication required to access this resource.") {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message = "You do not have permission to perform this action.") {
  return errorResponse(message, 403);
}

export function notFoundResponse(message = "The requested resource was not found.") {
  return errorResponse(message, 404);
}
