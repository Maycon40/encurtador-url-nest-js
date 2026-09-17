import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  GoneException,
} from '@nestjs/common';
import crypto from 'crypto';

import { ShortenerRepository } from './shortener.repository';

export const MAX_GENERATE_CODE_RETRIES = 5;
export const URL_EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

@Injectable()
export class ShortenerService {
  constructor(private readonly shortenerRepository: ShortenerRepository) {}

  private generateCode = () => {
    return crypto.randomBytes(6).toString('base64url');
  };

  private async generateAvailableCode() {
    let attempts = 0;
    let code = '';
    let isCodeAvailable = false;

    while (!isCodeAvailable && attempts < MAX_GENERATE_CODE_RETRIES) {
      code = this.generateCode();
      attempts++;

      const link = await this.shortenerRepository.findOneByCode(code);

      if (!link) {
        isCodeAvailable = true;
        break;
      }
    }

    if (!isCodeAvailable) {
      throw new InternalServerErrorException(
        'Failed to generate a unique short link. Please try again.',
      );
    }

    return code;
  }

  private validateUrl(url: string) {
    const regex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

    if (!url || !regex.test(url)) {
      throw new BadRequestException('The url provided is invalid');
    }
  }

  async create(userId: string | null, originalUrl: string, url: string) {
    this.validateUrl(originalUrl);

    let claimToken: string | null = null;
    const code = await this.generateAvailableCode();

    if (!userId) {
      claimToken = crypto.randomUUID();
    }

    const expiresAt = new Date(Date.now() + URL_EXPIRATION_TIME);
    const shortUrl = `${url}/${code}`;

    const createdLink = await this.shortenerRepository.create({
      user_id: userId,
      code,
      short_url: shortUrl,
      original_url: originalUrl,
      expires_at: expiresAt,
      claim_token: claimToken,
    });

    return {
      id: createdLink?.id,
      user_id: createdLink?.user_id,
      code: createdLink?.code,
      claim_token: createdLink?.claim_token,
      original_url: createdLink?.original_url,
      short_url: createdLink?.short_url,
      clicks: createdLink?.clicks,
      expires_at: createdLink?.expires_at,
      created_at: createdLink?.created_at,
      updated_at: createdLink?.updated_at,
    };
  }

  private async findOneByCode(userId: string, code: string) {
    const link = await this.shortenerRepository.findOneByCodeAndUserId(
      userId,
      code,
    );

    if (!link) {
      throw new NotFoundException({
        message: 'Shortened link not found!',
        action: 'Please check the code and try again',
      });
    }

    return link;
  }

  async findAll(userId: string) {
    const links = await this.shortenerRepository.findAllByUserId(userId);

    if (links?.length == 0) {
      throw new NotFoundException({
        message: 'Could not find any shortened link!',
        action: 'Create a new shortened link and try again',
      });
    }

    return links?.map((link) => ({
      code: link.code,
      original_url: link.original_url,
      short_url: link.short_url,
      clicks: link.clicks,
      expires_at: link.expires_at,
      created_at: link.created_at,
      updated_at: link.updated_at,
    }));
  }

  async getRedirectUrl(code: string) {
    const link = await this.shortenerRepository.findOneByCode(code);

    if (!link) {
      throw new NotFoundException('Could not find shortened link!');
    }

    if (new Date() > link.expires_at) {
      throw new GoneException('This link has expired!');
    }

    await this.shortenerRepository.incrementClicks(code);

    return { redirect: link.original_url };
  }

  async update(
    userId: string,
    code: string,
    newLinkData: { code?: string; original_url?: string; expires_at?: Date },
  ) {
    const currentLink = await this.findOneByCode(userId, code);

    const short_url = newLinkData.code
      ? `${currentLink.short_url?.split('/').slice(0, -1).join('/')}/${newLinkData.code}`
      : currentLink.short_url;

    const updatedLinkData = {
      code: newLinkData.code || currentLink.code,
      short_url: short_url,
      original_url: newLinkData.original_url || currentLink.original_url,
      expires_at: newLinkData.expires_at || currentLink.expires_at,
    };

    this.validateUrl(updatedLinkData.original_url);

    const updatedLink = await this.shortenerRepository.update(
      userId,
      code,
      updatedLinkData,
    );

    return {
      code: updatedLink?.code,
      original_url: updatedLink?.original_url,
      short_url: updatedLink?.short_url,
      clicks: updatedLink?.clicks,
      expires_at: updatedLink?.expires_at,
      created_at: updatedLink?.created_at,
      updated_at: updatedLink?.updated_at,
    };
  }

  async delete(userId: string, code: string) {
    await this.findOneByCode(userId, code);

    const deletedLink = await this.shortenerRepository.delete(userId, code);

    return {
      code: deletedLink?.code,
      original_url: deletedLink?.original_url,
      short_url: deletedLink?.short_url,
    };
  }

  async statistics(userId: string, code: string) {
    const link = await this.findOneByCode(userId, code);

    return {
      short_url: link.short_url,
      code: link.code,
      original_url: link.original_url,
      clicks: link.clicks,
      expires_at: link.expires_at,
      updated_at: link.updated_at,
      created_at: link.created_at,
    };
  }
}
