import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';

import { ShortenerController } from './shortener.controller';
import { ShortenerService } from './shortener.service';
import { CodeMiddleware, UrlMiddleware } from './shortener.middleware';

@Module({
  controllers: [ShortenerController],
  providers: [ShortenerService],
})
export class ShortenerModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CodeMiddleware)
      .forRoutes(
        { path: ':code', method: RequestMethod.GET },
        { path: ':code', method: RequestMethod.DELETE },
        { path: ':code', method: RequestMethod.PUT },
        { path: 'static/:code', method: RequestMethod.GET },
      );

    consumer
      .apply(UrlMiddleware)
      .forRoutes(
        { path: 'shorten', method: RequestMethod.POST },
        { path: ':code', method: RequestMethod.PUT },
      );
  }
}
