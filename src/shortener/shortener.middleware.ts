import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface UrlRequestBody {
  original_url: string;
}

@Injectable()
export class CodeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (!req.params || !req.params['code']) {
      return res.status(400).json({
        error: 'The param code is required!',
      });
    }

    next();
  }
}

@Injectable()
export class UrlMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: (error?: any) => void) {
    const body = req.body as UrlRequestBody | undefined;

    if (!body || !body.original_url) {
      return res.status(400).json({
        error: 'The param original url is required',
      });
    }

    next();
  }
}
