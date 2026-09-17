import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import cryptography from 'src/common/utils/crypto.utils';
import { User } from '../../modules/auth/repositories/users.repository';

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  generateAccessToken(user: User) {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '1h',
    });

    return accessToken;
  }

  generateRefreshTokenHash(userId: string, sessionId: string) {
    const refreshToken = this.generateRefreshToken(userId, sessionId);

    const refreshTokenHash = cryptography.hash(refreshToken);

    return { refreshToken, refreshTokenHash };
  }

  generateRefreshToken(userId: string, sessionId: string) {
    const payload = { sub: userId, sessionId };

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    return refreshToken;
  }
}
