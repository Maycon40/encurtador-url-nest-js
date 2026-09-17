import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import email from 'src/core/email';
import password from 'src/common/utils/password.utils';
import { AccountVerificationsRespository } from './repositories/account.verifications.respository';
import { User, UsersRepository } from './repositories/users.repository';
import cryptography from 'src/common/utils/crypto.utils';
import { AuthService } from './auth.service';

export const ACTIVATION_TOKEN_EXPIRATION_IN_MILLISECONDS = 15 * 60 * 1000; // 15 minutes in milliseconds

@Injectable()
export class ActivationService {
  constructor(
    private authService: AuthService,
    private usersRepository: UsersRepository,
    private accountVerificationsRespository: AccountVerificationsRespository,
  ) {}

  async generateActivationCode(userId: string) {
    const code = cryptography.generate6DigitCode();

    const codeHash = await password.hash(code, 12);
    const expiresAt = new Date(
      Date.now() + ACTIVATION_TOKEN_EXPIRATION_IN_MILLISECONDS,
    );

    await this.accountVerificationsRespository.deleteByUserId(userId);

    const accountActivation = await this.accountVerificationsRespository.create(
      {
        user_id: userId,
        code: codeHash,
        expires_at: expiresAt,
      },
    );

    return { ...accountActivation, code };
  }

  async resendActivationCode(email: string) {
    const user = await this.usersRepository.findOneByEmail(email || '');

    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        action: 'Check the email and try again',
      });
    }

    const accountActivation = await this.generateActivationCode(user?.id || '');
    const code = accountActivation?.code || '';

    void this.sendActivationCode(user, code);

    return accountActivation;
  }

  async sendActivationCode(user: User, code: string) {
    await email.send({
      from: `Encurtador URL <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: user.email,
      subject: 'Ative a sua conta',
      text: `Olá ${user.name}, use o código abaixo para ativar a sua conta:

${code}

Atenciosamente,
Encurtador URL`,
    });
  }

  async activateAccount(email: string, code: string) {
    const user = await this.usersRepository.findOneByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const accountVerification =
      await this.accountVerificationsRespository.findOneByUserId(user.id);

    if (!accountVerification) {
      throw new NotFoundException('User does not have any activation code');
    }

    if (!user?.features?.includes('read:activation_code')) {
      throw new BadRequestException('User cannot be activated');
    }

    if (accountVerification.expires_at < new Date()) {
      throw new BadRequestException({
        message: 'Activation code has expired',
        action: 'Generate a new activation code and try again',
      });
    }

    if (accountVerification.used_at) {
      throw new BadRequestException({
        message: 'Activation code has already been used',
        action: 'Generate a new activation code and try again',
      });
    }

    const storedCode = accountVerification?.code || '';

    const isCodeValid = await password.compare(code, storedCode);

    if (!isCodeValid) {
      throw new BadRequestException('Invalid activation code');
    }

    await this.accountVerificationsRespository.markAsUsed(
      accountVerification.id || '',
    );
    await this.authService.setInitialFeatures(user.id);

    return accountVerification;
  }
}
