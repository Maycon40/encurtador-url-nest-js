import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
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

      try {
        await this.read(code);
      } catch (error) {
        if (error instanceof NotFoundException) {
          isCodeAvailable = true;
        } else {
          throw error;
        }
      }
    }

    if (!isCodeAvailable) {
      throw new InternalServerErrorException(
        'Failed to generate a unique short link. Please try again.',
      );
    }

    return code;
  }

  async create(originalUrl: string, url: string) {
    const code = await this.generateAvailableCode();

    const expiresAt = new Date(Date.now() + URL_EXPIRATION_TIME);
    const shortUrl = `${url}/${code}`;

    const createdLink = await this.shortenerRepository.create({
      code,
      short_url: shortUrl,
      original_url: originalUrl,
      expires_at: expiresAt,
    });

    return {
      code: createdLink?.code,
      original_url: createdLink?.original_url,
      short_url: createdLink?.short_url,
      clicks: createdLink?.clicks,
      expires_at: createdLink?.expires_at,
      created_at: createdLink?.created_at,
      updated_at: createdLink?.updated_at,
    };
  }

  async read(code: string) {
    const link = await this.shortenerRepository.findByCode(code);

    if (!link) {
      throw new NotFoundException('Could not find shortened link!');
    }

    return link;
  }

  async getRedirectUrl(code: string) {
    const link = await this.read(code);

    if (new Date() > link.expires_at) {
      throw new BadRequestException('This link has expired!');
    }

    await this.shortenerRepository.incrementClicks(code);

    return { redirect: link.original_url };
  }

  async update(
    newLinkData: { code?: string; original_url?: string; expires_at?: Date },
    code: string,
  ) {
    const currentLink = await this.read(code);

    const short_url = newLinkData.code
      ? `${currentLink.short_url?.split('/').slice(0, -1).join('/')}/${newLinkData.code}`
      : currentLink.short_url;

    const updatedLinkData = {
      code: newLinkData.code || currentLink.code,
      short_url: short_url,
      original_url: newLinkData.original_url || currentLink.original_url,
      expires_at: newLinkData.expires_at || currentLink.expires_at,
    };

    const updatedLink = await this.shortenerRepository.update(
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

  async delete(code: string) {
    await this.read(code);

    const deletedLink = await this.shortenerRepository.delete(code);

    return {
      code: deletedLink?.code,
      original_url: deletedLink?.original_url,
      short_url: deletedLink?.short_url,
    };
  }

  async statistics(code: string) {
    const link = await this.read(code);

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
