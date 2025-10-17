import { Controller, Get } from '@nestjs/common';
import database from '../infra/database';

@Controller()
export class StatusController {
  @Get('/api/v1/status')
  async status() {
    const databaseName = process.env.POSTGRES_DB;

    const updatedAt = new Date().toISOString();
    const versionResult = await database.query('SHOW server_version;');
    const maxConnectionsResult = await database.query('SHOW max_connections;');
    const usedConnectionsResult = await database.query({
      text: 'SELECT count(*)::int FROM pg_stat_activity WHERE datname = $1',
      values: [databaseName],
    });

    const { server_version: version } = versionResult.rows[0];
    const { max_connections: maxConnections } = maxConnectionsResult.rows[0];
    const { count: usedConnections } = usedConnectionsResult.rows[0];

    return {
      updated_at: updatedAt,
      dependencies: {
        status: version ? 'online' : 'offline',
        version,
        max_connections: Number(maxConnections),
        used_connections: usedConnections
      },
    };
  }
}
