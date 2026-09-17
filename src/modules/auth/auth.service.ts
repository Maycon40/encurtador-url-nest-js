import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { User, UsersRepository } from './repositories/users.repository';
import password from 'src/common/utils/password.utils';
import {
  Session,
  SessionsRepository,
} from './repositories/sessions.repository';
import { TokenService } from '../../common/services/token.service';
import cryptography from 'src/common/utils/crypto.utils';

export const SESSION_EXPIRATION_IN_MILLISECONDS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

@Injectable()
export class AuthService {
  constructor(
    private usersRepository: UsersRepository,
    private tokenService: TokenService,
    private sessionsRepository: SessionsRepository,
  ) {}

  async findOneById(id: string) {
    const userFound = await this.usersRepository.findOneById(id);

    return {
      id: userFound?.id,
      email: userFound?.email,
      name: userFound?.name,
      provider: userFound?.provider,
      created_at: userFound?.created_at,
      updated_at: userFound?.updated_at,
    };
  }

  async setInitialFeatures(userId: string) {
    await this.usersRepository.setFeatures(userId, [
      'create:session',
      'update:session',
      'delete:session',
      'read:user',
      'update:user',
      'create:link',
      'read:link',
      'read:link:all',
      'update:link',
      'delete:link',
    ]);
  }

  async refreshToken(user: User, sessionId: string, refreshToken: string) {
    const session = await this.sessionsRepository.findOneById(sessionId);

    if (!session || session.user_id !== user.id || !session.token) {
      throw new UnauthorizedException('Invalid token');
    }

    if (session.expires_at < new Date()) {
      throw new UnauthorizedException('Expired token');
    }

    const isRefreshTokenValid = cryptography.compare(
      refreshToken,
      session.token,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid token');
    }

    return await this.generateAuthResponse(user, session);
  }

  async validateAndLoginLocal(email: string, pass: string) {
    const targetUser = await this.usersRepository.findOneByEmail(email);

    if (!targetUser || !targetUser.password) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        action: 'Please check your email and password and try again.',
      });
    }

    if (targetUser.features?.includes('read:activation_code')) {
      throw new ForbiddenException({
        message: 'User account is not activated.',
        action: 'Please activate your account before logging in.',
      });
    }

    if (!targetUser.features?.includes('create:session')) {
      throw new ForbiddenException('User does not have permission to login');
    }

    const isPasswordValid = await password.compare(pass, targetUser.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        action: 'Please check your email and password and try again.',
      });
    }

    const session = await this.createSession(targetUser.id);

    return await this.generateAuthResponse(targetUser, session);
  }

  async registerLocal(dto: { email: string; password: string; name?: string }) {
    const existingUser = await this.usersRepository.findOneByEmail(dto.email);

    if (existingUser) {
      throw new BadRequestException({
        message: 'Email is already registered',
        action:
          'Please use a different email address or login with your existing account.',
      });
    }

    const hashedPassword = await password.hash(dto.password);

    const user = await this.usersRepository.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name || null,
      provider: 'local',
      features: ['read:activation_code'],
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      features: user.features,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  async updateUser(
    targetUserId: string,
    currentUser: User,
    newUserData: { name: string },
  ) {
    const targetUser = await this.usersRepository.findOneById(targetUserId);

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (currentUser.id !== targetUserId) {
      throw new ForbiddenException({
        message: 'You do not have permission to update this user',
        action: 'You can only update your own user profile',
      });
    }

    const newUserDataValues = {
      ...currentUser,
      ...newUserData,
    };

    const updatedUser = await this.usersRepository.update(
      targetUserId,
      newUserDataValues,
    );

    return updatedUser;
  }

  async validateOAuthUser(googleProfile: Record<string, string>) {
    let user = await this.usersRepository.findOneByEmail(googleProfile.email);

    if (!user) {
      user = await this.usersRepository.create({
        email: googleProfile.email,
        name: `${googleProfile.firstName} ${googleProfile.lastName}`,
        provider: 'google',
        provider_id: googleProfile.sub,
      });

      await this.setInitialFeatures(user.id);
    } else if (!user.provider_id) {
      user =
        (await this.usersRepository.update(user.id, {
          provider_id: googleProfile.sub,
        })) || user;

      if (user.features?.includes('read:activation_code')) {
        await this.setInitialFeatures(user.id);
      }
    }

    const session = await this.createSession(user.id);

    return await this.generateAuthResponse(user, session);
  }

  private async createSession(userId: string) {
    const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_IN_MILLISECONDS);

    const createdSession = await this.sessionsRepository.create({
      user_id: userId,
      token: null,
      expires_at: expiresAt,
    });

    return createdSession;
  }

  private async generateAuthResponse(user: User, session: Session) {
    const accessToken = this.tokenService.generateAccessToken(user);

    const { refreshToken, refreshTokenHash } =
      this.tokenService.generateRefreshTokenHash(user.id, session.id);

    await this.sessionsRepository.update(session.id, {
      ...session,
      token: refreshTokenHash,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };
  }

  async logout(sessionId: string, userId: string) {
    const currentUser = await this.usersRepository.findOneById(userId);

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    if (!currentUser.features?.includes('delete:session')) {
      throw new ForbiddenException('User does not have permission to logout');
    }

    await this.sessionsRepository.update(sessionId, {
      user_id: userId,
      token: null,
      expires_at: new Date(),
    });
  }
}
