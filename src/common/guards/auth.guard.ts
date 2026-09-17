import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException({
        message: 'No token provided',
        action: 'Provide a valid token in the Authorization header',
      });
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      request['payload'] = {
        id: payload.sub,
        email: payload.email,
        sub: payload.sub,
        iat: payload.iat,
        exp: payload.exp,
      };
    } catch {
      throw new UnauthorizedException({
        message: 'Invalid or expired token',
        action: 'Provide a valid token in the Authorization header',
      });
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | null {
    const [type, token]: string[] =
      request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' && token ? token : null;
  }
}
