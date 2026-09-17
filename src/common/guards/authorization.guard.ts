import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  mixin,
  Type,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersRepository } from '../../modules/auth/repositories/users.repository';

export function AuthorizationGuard(feature: string): Type<CanActivate> {
  @Injectable()
  class AuthorizationGuardMixin implements CanActivate {
    constructor(private readonly usersRepository: UsersRepository) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const payload = request.payload;

      const currentUser = await this.usersRepository.findOneById(
        payload?.id as string,
      );
      const features = currentUser?.features || [];

      request.user = currentUser;

      if (!currentUser) {
        throw new UnauthorizedException('User not authenticated.');
      }

      if (features.length == 0) {
        throw new ForbiddenException('User missing features.');
      }

      if (!features.includes(feature)) {
        throw new ForbiddenException(`User does not have permission required.`);
      }

      return true;
    }
  }

  return mixin(AuthorizationGuardMixin);
}
