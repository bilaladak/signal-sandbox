import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_POOL } from '../../database/database.module';
import type { UserRole } from '@signal-sandbox/shared-types';

interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  org_id: string;
  role: UserRole;
  created_at: string;
}

interface CreateUserParams {
  email: string;
  name: string;
  passwordHash: string;
  organisationName: string;
}

@Injectable()
export class AuthRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findUserByEmail(email: string): Promise<DbUser | null> {
    const { rows } = await this.pool.query<DbUser>(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email],
    );
    return rows[0] || null;
  }

  async findUserById(id: string): Promise<DbUser | null> {
    const { rows } = await this.pool.query<DbUser>(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    return rows[0] || null;
  }

  async createUserWithOrg(params: CreateUserParams) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const orgId = uuidv4();
      const { rows: orgRows } = await client.query(
        `INSERT INTO organisations (id, name) VALUES ($1, $2) RETURNING *`,
        [orgId, params.organisationName],
      );

      const userId = uuidv4();
      const { rows: userRows } = await client.query(
        `INSERT INTO users (id, email, name, password_hash, org_id, role)
         VALUES ($1, $2, $3, $4, $5, 'owner') RETURNING *`,
        [userId, params.email, params.name, params.passwordHash, orgId],
      );

      await client.query('COMMIT');

      return { user: userRows[0], organisation: orgRows[0] };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async saveRefreshToken(userId: string, token: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
      [uuidv4(), userId, token],
    );
  }

  async findRefreshToken(userId: string, token: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM refresh_tokens
       WHERE user_id = $1 AND token = $2 AND expires_at > NOW()`,
      [userId, token],
    );
    return rows[0] || null;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await this.pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
  }

  async deleteAllRefreshTokens(userId: string): Promise<void> {
    await this.pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  }
}
