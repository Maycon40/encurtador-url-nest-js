import {
  ExceptionFilter,
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { Response } from 'express';

@Catch()
export class SnakeCaseExceptionFilter implements ExceptionFilter {
  @SentryExceptionCaptured()
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const error =
      exception instanceof HttpException
        ? exception.name
        : 'InternalServerError';

    let message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).message || exception.message
        : exceptionResponse || 'Internal server error';

    if (Array.isArray(message)) {
      message = message.length > 0 ? message[0] : error;
    }

    const action =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).action || exception.action
        : exceptionResponse || 'Try again in a few minutes or contact support.';

    const responseBody = {
      status_code: status,
      message,
      action,
      error,
    };

    if (status >= 500) {
      console.log('Internal Server Error', {
        ...responseBody,
        cause:
          exception?.cause || (exceptionResponse as any)?.cause || exception,
      });
    }

    response.status(status).json(responseBody);
  }
}
