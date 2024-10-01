import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    console.log(
      `🚀 ~ file: exception.filter.ts:13 ~ AllExceptionsFilter ~ exception:`,
      exception,
    );
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Default error message for server-side errors
    let message = 'An unexpected error occurred. Please try again later.';

    // Custom handling for Prisma errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': // Unique constraint failed
          const target = (exception.meta?.target as string[]) ?? [];
          const uniqueField = target.join(', ');
          message = `A record with this ${uniqueField} already exists.`;
          status = HttpStatus.CONFLICT; // 409 Conflict
          break;
        case 'P2003': // Foreign key constraint failed
          message = 'Foreign key constraint violation.';
          status = HttpStatus.BAD_REQUEST; // 400 Bad Request
          break;
        case 'P2025': // Record not found
          message =
            'The record you are trying to update or delete does not exist.';
          status = HttpStatus.NOT_FOUND; // 404 Not Found
          break;
        default:
          message = 'A database error occurred.';
          break;
      }
    } else if (exception.response) {
      message = exception?.response?.message
        ?.map((msg: string) => msg)
        .join(', ');
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}
