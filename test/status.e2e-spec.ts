interface StatusResponse {
  updated_at: string;
  dependencies: {
    status: string;
    version: string;
    max_connections: number;
    used_connections: number;
  };
}

describe('API status (e2e)', () => {
  const baseUrl = 'http://localhost:3000';

  it('/api/v1/status (GET)', async () => {
    const response = await fetch(`${baseUrl}/api/v1/status`);

    expect(response.status).toBe(200);

    const responseBody = (await response.json()) as StatusResponse;

    expect(responseBody.updated_at).toBeDefined();
    expect(responseBody.dependencies.status).toBe('online');
    expect(responseBody.dependencies.version.includes('16')).toBe(true);
    expect(responseBody.dependencies.max_connections).toBe(100);
    expect(responseBody.dependencies.used_connections).toEqual(1);
  });
});
