import { Injectable } from '@nestjs/common';
import crypto from 'crypto';

import database from '../infra/database';

interface ReadData {
  original_url: string;
}

interface StaticData {
  short_code: string;
}

@Injectable()
export class ShortenerService {
  private generateCode() {
    return crypto.randomBytes(6).toString('base64url');
  }

  async create(originalUrl: string, url: string) {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const shortUrl = `${url}/${code}`;

    const existingLink = await this.read(code);

    if (existingLink && existingLink['statusCode'] === 302) {
      return {
        statusCode: 400,
        error: 'A link with this code already exists!',
      };
    }

    const result: {
      rows: Array<{
        short_url: string;
        code: string;
        original_url: string;
        expires_at: Date;
        created_at: Date;
        updated_at: Date;
      }>;
    } = await database.query({
      text: 'INSERT INTO links (code, short_url, original_url, expires_at) VALUES ($1, $2, $3, $4) RETURNING *',
      values: [code, shortUrl, originalUrl, expiresAt],
    });

    const createdLink = result?.rows[0];

    return {
      statusCode: 201,
      code: createdLink?.code,
      original_url: createdLink?.original_url,
      short_url: createdLink?.short_url,
      expires_at: createdLink?.expires_at,
      created_at: createdLink?.created_at,
      updated_at: createdLink?.updated_at,
    };
  }

  async read(code: string) {
    const result = await database.query({
      text: 'SELECT * FROM links WHERE code = $1',
      values: [code],
    });

    const data = result?.rows[0] as ReadData;

    if (data && data['original_url']) {
      if (new Date() > data['expires_at']) {
        return { statusCode: 401, error: 'This link has expired!' };
      }

      await database.query({
        text: 'UPDATE links SET clicks = clicks + 1 WHERE code = $1',
        values: [code],
      });

      return { statusCode: 302, redirect: data['original_url'] };
    }

    return { statusCode: 404, error: 'Could not find shortened link!' };
  }

  async update(originalUrl: string, code: string) {
    const result = await database.query({
      text: 'UPDATE links SET original_url = $1 WHERE code = $2 RETURNING *',
      values: [originalUrl, code],
    });

    const updatedLink = result?.rows[0];

    if (!updatedLink || !updatedLink['code']) {
      return { statusCode: 404, error: 'Could not find shortened link!' };
    }

    return {
      statusCode: 200,
      code: updatedLink?.code,
      original_url: updatedLink?.original_url,
      short_url: updatedLink?.short_url,
    };
  }

  async delete(code: string) {
    const result = await database.query({
      text: 'DELETE FROM links WHERE code = $1 RETURNING *',
      values: [code],
    });

    if (!result?.rows[0]) {
      return { statusCode: 404, error: 'Could not find shortened link!' };
    }

    return {
      statusCode: 200,
      message: 'Shortened link deleted!',
    };
  }

  async statistics(code: string) {
    const result = await database.query({
      text: 'SELECT * FROM links WHERE code = $1',
      values: [code],
    });

    const data = result?.rows[0] as StaticData;

    if (!data || !data['code']) {
      return { statusCode: 404, error: 'Could not find shortened link!' };
    }

    return {
      statusCode: 200,
      short_url: data['short_url'],
      code: data['code'],
      original_url: data['original_url'],
      clicks: data['clicks'],
      expires_at: data['expires_at'],
      updated_at: data['updated_at'],
      created_at: data['created_at'],
    };
  }
}
