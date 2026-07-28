describe('AppController (e2e)', () => {
  const baseUrl = 'http://localhost:3000';

  it('/ (GET)', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe('Welcome to URL Shortener');
  });
});
