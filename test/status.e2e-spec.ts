import { baseUrl } from './orchestrator';

interface StatusResponse {
  updated_at: string;
  database: {
    status: string;
    version: string;
    max_connections: number;
    used_connections: number;
  };
}

describe('API status (e2e)', () => {
  it('/api/v1/status (GET)', async () => {
    const response = await fetch(`${baseUrl}/api/v1/status`);

    expect(response.status).toBe(200);

    const responseBody = (await response.json()) as StatusResponse;

    expect(responseBody.updated_at).toBeDefined();
    expect(responseBody.database.status).toBe('online');
    expect(responseBody.database.version.includes('16')).toBe(true);
    expect(responseBody.database.max_connections).toBe(100);
    expect(responseBody.database.used_connections).toEqual(1);
  });
});
