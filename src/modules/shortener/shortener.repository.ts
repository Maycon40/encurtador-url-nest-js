import { Injectable } from '@nestjs/common';

import database from '../../core/database';

export interface Link {
  id?: string;
  user_id?: string | null;
  code: string;
  claim_token?: string | null;
  original_url: string;
  short_url?: string;
  expires_at: Date;
  clicks?: number;
  created_at?: Date;
  updated_at?: Date;
}

@Injectable()
export class ShortenerRepository {
  async findOneByCode(code: string): Promise<Link | null> {
    const result: { rows: Link[] } = await database.query({
      text: 'SELECT * FROM links WHERE code = $1',
      values: [code],
    });

    return result?.rows[0] || null;
  }

  async findOneByCodeAndUserId(
    userId: string,
    code: string,
  ): Promise<Link | null> {
    const result: { rows: Link[] } = await database.query({
      text: 'SELECT * FROM links WHERE user_id = $1 AND code = $2',
      values: [userId, code],
    });

    return result?.rows[0] || null;
  }

  async findAllByUserId(userId: string): Promise<Link[] | null> {
    const result: { rows: Link[] } = await database.query({
      text: 'SELECT * FROM links WHERE user_id = $1',
      values: [userId],
    });

    return result?.rows || null;
  }

  async create(link: Link): Promise<Link | null> {
    const result: { rows: Link[] } = await database.query({
      text: 'INSERT INTO links (user_id, code, claim_token, short_url, original_url, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      values: [
        link.user_id,
        link.code,
        link.claim_token,
        link.short_url,
        link.original_url,
        link.expires_at,
      ],
    });

    return result?.rows[0] || null;
  }

  async update(userId: string, code: string, link: Link): Promise<Link | null> {
    const result: { rows: Link[] } = await database.query({
      text: `
        UPDATE
          links
        SET
          original_url = $3,
          expires_at = $4,
          code = $5,
          short_url = $6,
          updated_at = timezone('utc', now())
        WHERE
          user_id = $1 AND
          code = $2
        RETURNING
          *
        ;`,
      values: [
        userId,
        code,
        link.original_url,
        link.expires_at,
        link.code,
        link.short_url,
      ],
    });

    return result?.rows[0] || null;
  }

  async incrementClicks(code: string): Promise<void> {
    await database.query({
      text: 'UPDATE links SET clicks = clicks + 1 WHERE code = $1',
      values: [code],
    });
  }

  async delete(userId: string, code: string): Promise<Link | null> {
    const result: { rows: Link[] } = await database.query({
      text: 'DELETE FROM links WHERE user_id = $1 AND code = $2 RETURNING *',
      values: [userId, code],
    });

    return result?.rows[0] || null;
  }
}
