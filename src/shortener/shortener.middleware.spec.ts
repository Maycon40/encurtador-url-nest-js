import { Request, Response, NextFunction } from 'express';
import { CodeMiddleware, UrlMiddleware } from './shortener.middleware';

describe('Shortener Middlewares', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock<NextFunction>;

  beforeEach(() => {
    mockRequest = {};

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
  });

  /* ========================================================================
   * 1. TESTES PARA O CODE MIDDLEWARE
   * ======================================================================== */
  describe('CodeMiddleware', () => {
    let middleware: CodeMiddleware;

    beforeEach(() => {
      middleware = new CodeMiddleware();
    });

    it('should be defined', () => {
      expect(middleware).toBeDefined();
    });

    it('should call next() if param code is present', () => {
      mockRequest = {
        params: { code: 'abc1234' },
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should return 400 if req.params is undefined', () => {
      mockRequest = {};

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'The param code is required!',
        status_code: 400,
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 400 if code parameter is missing or empty', () => {
      mockRequest = {
        params: {},
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'The param code is required!',
        status_code: 400,
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  /* ========================================================================
   * 2. TESTES PARA O URL MIDDLEWARE
   * ======================================================================== */
  describe('UrlMiddleware', () => {
    let middleware: UrlMiddleware;

    beforeEach(() => {
      middleware = new UrlMiddleware();
    });

    it('should be defined', () => {
      expect(middleware).toBeDefined();
    });

    it('should call next() when original_url is valid (http or https)', () => {
      mockRequest = {
        body: { original_url: 'https://example.com/path?query=1' },
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should return 400 if req.body is missing or empty', () => {
      mockRequest = {};

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'The param original url is required',
        status_code: 400,
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 400 if original_url field is missing in body', () => {
      mockRequest = {
        body: { other_param: 'value' },
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'The param original url is required',
        status_code: 400,
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 400 if original_url has an invalid format', () => {
      const invalidUrls = [
        'invalid-url',
        'ftp://example.com',
        'http://',
        'www.example.com', // sem o protocolo http:// ou https://
      ];

      invalidUrls.forEach((url) => {
        jest.clearAllMocks();

        mockRequest = {
          body: { original_url: url },
        };

        middleware.use(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'The param original url is invalid',
          status_code: 400,
        });
        expect(nextFunction).not.toHaveBeenCalled();
      });
    });
  });
});
