import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';

import { TokenService } from './services/token.service';
import { UsersRepository } from 'src/modules/auth/repositories/users.repository';
import { SessionsRepository } from 'src/modules/auth/repositories/sessions.repository';

@Module({
  imports: [JwtModule.register({ global: true })],
  providers: [TokenService, SessionsRepository, UsersRepository],
  exports: [TokenService, SessionsRepository, UsersRepository],
})
export class CommonModule {}
