import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ActivationService } from './activation.service';
import { AccountVerificationsRespository } from './repositories/account.verifications.respository';
import { CommonModule } from 'src/common/commo.module';
import { GoogleOAuthService } from './google-oauth.service';

@Module({
  imports: [JwtModule.register({ global: true }), CommonModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    ActivationService,
    AccountVerificationsRespository,
    GoogleOAuthService,
  ],
})
export class AuthModule {}
