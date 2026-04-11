/**
 * Standard API response handler
 * Ensures consistent response format across all API routes
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  statusCode?: number;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

/**
 * Create a successful API response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status: statusCode }
  );
}

/**
 * Create an error API response
 */
export function errorResponse(
  error: string | ApiError,
  statusCode?: number
): NextResponse<ApiResponse> {
  if (typeof error === 'string') {
    return NextResponse.json(
      {
        success: false,
        error,
        code: 'INTERNAL_ERROR',
      },
      { status: statusCode || 500 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: error.message,
      code: error.code,
    },
    { status: error.statusCode || statusCode || 500 }
  );
}

/**
 * Common API errors
 */
export const ApiErrors = {
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
    statusCode: 401,
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'Access denied',
    statusCode: 403,
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
    statusCode: 404,
  },
  BAD_REQUEST: {
    code: 'BAD_REQUEST',
    message: 'Invalid request data',
    statusCode: 400,
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    statusCode: 400,
  },
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    statusCode: 500,
  },
  RATE_LIMIT: {
    code: 'RATE_LIMIT',
    message: 'Too many requests',
    statusCode: 429,
  },
};

/**
 * Wrap an API handler with error handling
 */
export async function withErrorHandling<T>(
  handler: () => Promise<T>
): Promise<NextResponse<ApiResponse<T>>> {
  try {
    const data = await handler();
    return successResponse(data);
  } catch (error) {
    logger.error('API error handled by withErrorHandling', error, 'API_RESPONSE');

    if (error instanceof Error) {
      return errorResponse(error.message, 500);
    }

    return errorResponse(ApiErrors.INTERNAL_ERROR);
  }
}
