import { Injectable } from '@nestjs/common';

import database from '../infra/database';

export interface Link {
  code: string;
  original_url: string;
  short_url?: string;
  expires_at: Date;
  clicks?: number;
  created_at?: Date;
  updated_at?: Date;
}

@Injectable()
export class ShortenerRepository {
  async findByCode(code: string): Promise<Link | null> {
    const result: { rows: Link[] } = await database.query({
      text: 'SELECT * FROM links WHERE code = $1',
      values: [code],
    });

    return result?.rows[0] || null;
  }

  async create(link: Link): Promise<Link | null> {
    const result: { rows: Link[] } = await database.query({
      text: 'INSERT INTO links (code, short_url, original_url, expires_at) VALUES ($1, $2, $3, $4) RETURNING *',
      values: [link.code, link.short_url, link.original_url, link.expires_at],
    });

    return result?.rows[0] || null;
  }

  async update(code: string, link: Link): Promise<Link | null> {
    const result: { rows: Link[] } = await database.query({
      text: `
        UPDATE
          links
        SET
          original_url = $2,
          expires_at = $3,
          code = $4,
          short_url = $5,
          updated_at = timezone('utc', now())
        WHERE
          code = $1
        RETURNING
          *
        ;`,
      values: [
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

  async delete(code: string): Promise<Link | null> {
    const result: { rows: Link[] } = await database.query({
      text: 'DELETE FROM links WHERE code = $1 RETURNING *',
      values: [code],
    });

    return result?.rows[0] || null;
  }
}
