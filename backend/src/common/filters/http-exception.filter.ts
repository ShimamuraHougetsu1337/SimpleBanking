import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AsyncContextService } from '../context/async-context.service';

interface ExceptionResponseBody {
  message?: string | string[];
  error?: string;
  retryAfter?: number;
}

/**
 * Global exception filter that maps all exceptions to the standardized
 * error response format defined in API_SPEC.md:
 *
 * {
 *   statusCode: number,
 *   error: string,
 *   message: string,
 *   details?: { field: string; message: string }[]
 * }
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly asyncContextService: AsyncContextService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const requestId = this.asyncContextService.getRequestId();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message: string = 'An unexpected error occurred';
    let details: { field: string; message: string }[] | undefined;
    let retryAfter: number | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as
        ExceptionResponseBody | string;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        // class-validator errors come back as an array of strings in `message`
        if (Array.isArray(exceptionResponse.message)) {
          details = exceptionResponse.message.map((msg) => ({
            field: 'input',
            message: msg,
          }));
          message = 'Validation failed';
        } else {
          message = exceptionResponse.message ?? message;
        }
        errorCode = exceptionResponse.error ?? this.statusToErrorCode(status);
        retryAfter = exceptionResponse.retryAfter;
      }
    } else {
      // Log unexpected server-side errors
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      error: errorCode,
      message,
      ...(requestId ? { requestId } : {}),
      ...(details ? { details } : {}),
      ...(retryAfter !== undefined ? { retryAfter } : {}),
    });
  }

  /** Maps an HTTP status code to the standard error code string from API_SPEC.md. */
  private statusToErrorCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] ?? 'INTERNAL_SERVER_ERROR';
  }
}
