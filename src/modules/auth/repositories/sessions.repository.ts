import { Injectable } from '@nestjs/common';
import database from 'src/core/database';

export interface Session {
  id: string;
  user_id: string;
  token: string | null;
  expires_at: Date;
}

export type CreateSessionParams = Omit<Session, 'id'>;

@Injectable()
export class SessionsRepository {
  async create(session: CreateSessionParams) {
    const result: { rows: Session[] } = await database.query({
      text: `
        INSERT INTO sessions (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        RETURNING *;
      `,
      values: [session.user_id, session.token, session.expires_at],
    });

    return result.rows[0];
  }

  async findOneById(id: string): Promise<Session | null> {
    const result: { rows: Session[] } = await database.query({
      text: 'SELECT * FROM sessions WHERE id = $1',
      values: [id],
    });

    return result?.rows[0] || null;
  }

  async update(
    id: string,
    updatedSession: Partial<Session>,
  ): Promise<Session | null> {
    const result: { rows: Session[] } = await database.query({
      text: `
        UPDATE sessions
        SET user_id = COALESCE($2, user_id),
            token = COALESCE($3, token),
            expires_at = COALESCE($4, expires_at),
            updated_at = timezone('utc', now())
        WHERE id = $1
        RETURNING *;
      `,
      values: [
        id,
        updatedSession.user_id,
        updatedSession.token,
        updatedSession.expires_at,
      ],
    });

    return result?.rows[0] || null;
  }
}
