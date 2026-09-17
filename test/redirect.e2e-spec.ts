import dotenv from 'dotenv';
import orchestrator, { baseUrl } from './orchestrator';

dotenv.config({ path: '.env' });

describe('Redirect API (e2e)', () => {
  beforeAll(async () => {
    await orchestrator.cleanDatabase();
  });

  describe('GET /:code', () => {
    it('should return 410 for expired code', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: '',
        password: 'password123',
      });

      await orchestrator.activateUser(createdUser.email);

      const loginResponse = await orchestrator.loginUser({
        email: '',
        password: 'password123',
      });

      const createdLink = await orchestrator.createShortLink(
        'https://www.example.com',
        loginResponse.access_token as string,
      );

      const createdCode: string = createdLink.code;

      await orchestrator.expireShortLink(createdCode);

      const res = await fetch(`${baseUrl}/${createdCode}`, {
        redirect: 'manual',
      });

      expect(res.status).toBe(410);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 410,
        error: 'GoneException',
        message: 'This link has expired!',
      });
    });

    it('should return 404 for non-existent code', async () => {
      const res = await fetch(`${baseUrl}/nonexistentcode123`, {
        redirect: 'manual',
      });

      expect(res.status).toBe(404);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 404,
        error: 'NotFoundException',
        message: 'Could not find shortened link!',
      });
    });

    it('should return 302 redirect for valid code', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      await orchestrator.activateUser(createdUser.email);

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const createdLink = await orchestrator.createShortLink(
        'https://www.google.com',
        loginResponse.access_token as string,
      );

      const createdCode = createdLink.code;

      const res = await fetch(`${baseUrl}/${createdCode}`, {
        redirect: 'manual',
      });

      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe('https://www.google.com');
    });
  });
});
