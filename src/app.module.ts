import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { StatusModule } from './status/status.module';
import { ShortenerModule } from './shortener/shortener.module';

@Module({
  imports: [
    StatusModule,
    ShortenerModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
})
export class AppModule {}
