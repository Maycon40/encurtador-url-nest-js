import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

@Injectable()
export class CodeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (!req.params || !req.params["code"]) {
      return res.status(400).json({
        error: "The param code is required!"
      })
    }
    
    next();
  }
}

@Injectable()
export class UrlMiddleware implements NestMiddleware {
  use(req: any, res: any, next: (error?: any) => void) {
    if (!req.body || !req.body["original_url"]) {      
      return res.status(400).json({
        error: 'The param original url is required',
      });
    }

    next();
  }
}