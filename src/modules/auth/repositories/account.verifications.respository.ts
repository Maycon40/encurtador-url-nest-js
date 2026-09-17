import { Injectable } from '@nestjs/common';
import database from '../../../core/database';

export interface AccountVerification {
  id?: string;
  user_id: string;
  code: string;
  attempts?: number;
  expires_at: Date;
  used_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

@Injectable()
export class AccountVerificationsRespository {
  async create(data: AccountVerification): Promise<AccountVerification> {
    const result: { rows: AccountVerification[] } = await database.query({
      text: `
        INSERT INTO account_verifications (
          user_id,
          code,
          expires_at
        ) VALUES ($1, $2, $3)
        RETURNING *;
      `,
      values: [data.user_id, data.code, data.expires_at],
    });

    return result.rows[0];
  }

  async findOneByUserId(userId: string): Promise<AccountVerification | null> {
    const result: { rows: AccountVerification[] } = await database.query({
      text: 'SELECT * FROM account_verifications WHERE user_id = $1',
      values: [userId],
    });

    return result?.rows[0] || null;
  }

  async markAsUsed(id: string): Promise<AccountVerification | null> {
    const result: { rows: AccountVerification[] } = await database.query({
      text: `
        UPDATE
          account_verifications
        SET
          used_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING
          *
        ;`,
      values: [id],
    });

    return result?.rows[0] || null;
  }

  async deleteByUserId(userId: string): Promise<AccountVerification | null> {
    const result: { rows: AccountVerification[] } = await database.query({
      text: `
        DELETE FROM account_verifications
        WHERE user_id = $1
        RETURNING *;
      `,
      values: [userId],
    });

    return result?.rows[0] || null;
  }
}
