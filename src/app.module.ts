import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { StatusModule } from './modules/status/status.module';
import { ShortenerModule } from './modules/shortener/shortener.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.ENV_FILE || '.env',
    }),
    StatusModule,
    ShortenerModule,
    AuthModule,
  ],
})
export class AppModule {}
