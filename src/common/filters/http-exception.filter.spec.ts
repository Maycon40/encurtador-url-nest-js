import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';

import { SnakeCaseExceptionFilter } from './http-exception.filter';

describe('SnakeCaseExceptionFilter', () => {
  let filter: SnakeCaseExceptionFilter;
  let mockResponse: Partial<Response>;
  let mockArgumentsHost: Partial<ArgumentsHost>;

  beforeEach(() => {
    filter = new SnakeCaseExceptionFilter();

    // 1. Simula o encadeamento res.status().json() do Express
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // 2. Simula o contexto HTTP do NestJS (host.switchToHttp().getResponse())
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
      }),
    };
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('HttpExceptions', () => {
    it('should format a standard NestJS HttpException with message string', () => {
      const exception = new NotFoundException('Recurso não encontrado');

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status_code: 404,
        message: 'Recurso não encontrado',
        error: 'NotFoundException',
      });
    });

    it('should format a NestJS exception with object response (e.g. BadRequestException)', () => {
      const exception = new BadRequestException({
        message: 'A URL original é obrigatória.',
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status_code: 400,
        message: 'A URL original é obrigatória.',
        error: 'BadRequestException',
      });
    });

    it('should fallback to exception.message if exceptionResponse object has no message property', () => {
      // Cenário onde o getResponse() devolve um objeto sem a propriedade 'message'
      const customException = new HttpException(
        { detail: 'Custom error object' },
        HttpStatus.FORBIDDEN,
      );

      filter.catch(customException, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status_code: 403,
        message: customException.message,
        error: 'HttpException',
      });
    });
  });

  describe('Non-HttpExceptions (Unhandled Errors)', () => {
    it('should handle generic Error instance as 500 Internal Server Error', () => {
      const genericError = new Error('Falha de conexão com o banco');

      filter.catch(genericError, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        status_code: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      });
    });

    it('should handle string or null exceptions gracefully', () => {
      const stringException = 'Unhandled string error';

      filter.catch(stringException, mockArgumentsHost as ArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        status_code: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      });
    });
  });
});
