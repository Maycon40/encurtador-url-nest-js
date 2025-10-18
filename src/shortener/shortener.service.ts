import { Injectable } from '@nestjs/common';
import crypto from 'crypto';

import database from '../infra/database';

@Injectable()
export class ShortenerService {
  private generateCode() {
    return crypto.randomBytes(4).toString('hex');
  }

  async static(req, code: string) {
    const result = await database.query({
      text: 'SELECT short_code, original_url, clicks, created_at, expires_at FROM urls WHERE short_code = $1',
      values: [code],
    });

    const data = result.rows[0];

    if (!data || !data["short_code"]) {
      return {
        'error': 'The code is not valid!'
      }
    }

    return {
      short_url: `${req.protocol}://${req.get('host')}/${data['short_code']}`,
      ...data,
    };
  }

  async create(req, originalUrl: string) {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await database.query({
      text: 'INSERT INTO urls (short_code, original_url, expires_at) VALUES ($1, $2, $3)',
      values: [code, originalUrl, expiresAt],
    });

    return {
      short_url: `${req.protocol}://${req.get('host')}/${code}`,
      code
    };
  }

  async read(res, code: string) {
    const result = await database.query({
      text: 'SELECT short_code, original_url, clicks, created_at, expires_at FROM urls WHERE short_code = $1',
      values: [code],
    });

    const data = result.rows[0];

    if (data && data['original_url']) {
      if (new Date() > data['expires_at']) {
        return res.status(401).json({ error: 'Este link expirou!' });
      }

      database.query({
        text: 'UPDATE urls SET clicks = clicks + 1 WHERE short_code = $1',
        values: [code],
      });

      return res.status(302).redirect(data['original_url']);
    }

    return res
      .status(404)
      .json({ error: 'Could not find shortened link!' });
  }

  async update(req, originalUrl: string, code: string) {
    await database.query({
      text: 'UPDATE urls SET original_url = $1 WHERE short_code = $2',
      values: [originalUrl, code],
    });

    return {
      original_url: originalUrl,
      short_url: `${req.protocol}://${req.get('host')}/${code}`,
    };
  }

  async delete(code: string) {
    await database.query({
      text: 'DELETE FROM urls WHERE short_code = $1 RETURNING *',
      values: [code]
    })

    return {
      message: 'Shortened link deleted!'
    };
  }
}
