import { Injectable } from '@nestjs/common';
import database from '../../../core/database';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  password?: string | null;
  provider: 'local' | 'google';
  provider_id?: string | null;
  refresh_token_hash?: string | null;
  features?: string[];
  created_at?: Date;
  updated_at?: Date;
}

export type CreateUserParams = Omit<User, 'id' | 'created_at' | 'updated_at'>;

@Injectable()
export class UsersRepository {
  async findOneByEmail(email: string): Promise<User | null> {
    const result: { rows: User[] } = await database.query({
      text: 'SELECT * FROM users WHERE email = $1',
      values: [email],
    });

    return result?.rows[0] || null;
  }

  async findOneById(id: string): Promise<User | null> {
    const result: { rows: User[] } = await database.query({
      text: 'SELECT * FROM users WHERE id = $1',
      values: [id],
    });

    return result?.rows[0] || null;
  }

  async create(user: CreateUserParams): Promise<User> {
    const result: { rows: User[] } = await database.query({
      text: `
        INSERT INTO users (
          email,
          name,
          password,
          provider,
          provider_id,
          features
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `,
      values: [
        user.email,
        user.name || null,
        user.password || null,
        user.provider || 'local',
        user.provider_id || null,
        user.features || [],
      ],
    });

    return result.rows[0];
  }

  async update(id: string, user: Partial<User>): Promise<User | null> {
    const result: { rows: User[] } = await database.query({
      text: `
        UPDATE users
        SET
          name = COALESCE($2, name),
          provider_id = COALESCE($3, provider_id),
          updated_at = timezone('utc', now())
        WHERE id = $1
        RETURNING *;
      `,
      values: [id, user.name || null, user.provider_id || null],
    });

    return result?.rows[0] || null;
  }

  async updateRefreshTokenHash(
    id: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await database.query({
      text: `
        UPDATE users
        SET refresh_token_hash = $2, updated_at = timezone('utc', now())
        WHERE id = $1;
      `,
      values: [id, refreshTokenHash],
    });
  }

  async setFeatures(userId: string, features: string[]): Promise<void> {
    await database.query({
      text: `
        UPDATE users
        SET features = $2, updated_at = timezone('utc', now())
        WHERE id = $1;
      `,
      values: [userId, features],
    });
  }
}
