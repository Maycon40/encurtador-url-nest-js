import { version as uuidVersion } from 'uuid';
import dotenv from 'dotenv';

import orchestrator, { baseUrl } from './orchestrator';

dotenv.config({ path: '.env.development' });

describe('Shortener API (e2e)', () => {
  beforeAll(async () => {
    await orchestrator.cleanDatabase();
  });

  describe('GET /api/v1/links', () => {
    it('should return 401 when user is not authenticated', async () => {
      const res = await fetch(`${baseUrl}/api/v1/links`, {
        headers: {
          Authorization: 'Bearer invalidtoken',
        },
      });

      expect(res.status).toBe(401);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 401,
        error: 'UnauthorizedException',
        message: 'Invalid or expired token',
        action: 'Provide a valid token in the Authorization header',
      });
    });

    it('should return 404 for non-existent any link', async () => {
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

      const res = await fetch(`${baseUrl}/api/v1/links`, {
        headers: {
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
      });

      expect(res.status).toBe(404);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 404,
        error: 'NotFoundException',
        message: 'Could not find any shortened link!',
        action: 'Create a new shortened link and try again',
      });
    });

    it('should return all links for user', async () => {
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

      await orchestrator.createShortLink(
        'https://www.google.com',
        loginResponse.access_token as string,
      );

      const res = await fetch(`${baseUrl}/api/v1/links`, {
        headers: {
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
      });

      expect(res.status).toBe(200);

      const responseBody = await res.json();

      expect(responseBody).toEqual([
        {
          code: responseBody[0].code,
          original_url: 'https://www.google.com',
          short_url: `http://localhost:3000/${responseBody[0].code}`,
          status_code: 200,
        },
      ]);

      expect(typeof responseBody[0].code).toBe(typeof '');
      expect(responseBody[0].code.length).toBe(8);
    });
  });

  describe('GET /api/v1/links/:code', () => {
    it('should return 401 when user is not authenticated', async () => {
      const res = await fetch(`${baseUrl}/api/v1/links/nonexistentcode123`, {
        headers: {
          Authorization: 'Bearer invalidtoken',
        },
      });

      expect(res.status).toBe(401);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 401,
        error: 'UnauthorizedException',
        message: 'Invalid or expired token',
        action: 'Provide a valid token in the Authorization header',
      });
    });

    it('should return 404 statistics for non-existent code', async () => {
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

      const res = await fetch(`${baseUrl}/api/v1/links/nonexistentcode123`, {
        headers: {
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
      });

      expect(res.status).toBe(404);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 404,
        error: 'NotFoundException',
        message: 'Shortened link not found!',
        action: 'Please check the code and try again',
      });
    });

    it('should return 200 and link statistics for valid code', async () => {
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

      const res = await fetch(`${baseUrl}/api/v1/links/${createdCode}`, {
        headers: {
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
      });

      expect(res.status).toBe(200);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        code: createdCode,
        clicks: 0,
        original_url: 'https://www.google.com',
        short_url: `${baseUrl}/${createdCode}`,
        status_code: 200,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
    });
  });

  describe('POST /api/v1/links', () => {
    it('should return 201 when create link with user not authenticated', async () => {
      const res = await fetch(`${baseUrl}/api/v1/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ original_url: 'https://www.google.com' }),
      });

      expect(res.status).toBe(201);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        user_id: null,
        code: responseBody.code,
        claim_token: responseBody.claim_token,
        original_url: 'https://www.google.com',
        short_url: `${baseUrl}/${responseBody.code}`,
        clicks: 0,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
        status_code: 201,
      });

      expect(uuidVersion(responseBody.id as string)).toBe(4);
      expect(uuidVersion(responseBody.claim_token as string)).toBe(4);
      expect(Date.parse(responseBody.created_at as string)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at as string)).not.toBeNaN();
    });

    it('should return 400 when original_url is missing', async () => {
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

      const res = await fetch(`${baseUrl}/api/v1/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 400,
        error: 'BadRequestException',
        message: 'original_url is required',
      });
    });

    it('should return 400 when original_url is invalid', async () => {
      await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const res = await fetch(`${baseUrl}/api/v1/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
        body: JSON.stringify({ original_url: 'invalid-url' }),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'original_url must be a URL address',
        status_code: 400,
      });
    });

    it('should return 201 and shorten URL successfully', async () => {
      await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const res = await fetch(`${baseUrl}/api/v1/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
        body: JSON.stringify({ original_url: 'https://www.test.com' }),
      });

      expect(res.status).toBe(201);
      const responseBody = await res.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        user_id: responseBody.user_id,
        code: responseBody.code,
        claim_token: null,
        original_url: 'https://www.test.com',
        short_url: `${baseUrl}/${responseBody.code}`,
        clicks: 0,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
        status_code: 201,
      });

      expect(uuidVersion(responseBody.id as string)).toBe(4);
      expect(Date.parse(responseBody.created_at as string)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at as string)).not.toBeNaN();
    });
  });

  describe('PUT /api/v1/links/:code', () => {
    it('should return 401 when user is not authenticated', async () => {
      const res = await fetch(`${baseUrl}/api/v1/links/nonexistentcode123`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalidtoken',
        },
        body: JSON.stringify({ original_url: 'https://www.github.com' }),
      });

      expect(res.status).toBe(401);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 401,
        error: 'UnauthorizedException',
        message: 'Invalid or expired token',
        action: 'Provide a valid token in the Authorization header',
      });
    });

    it('should return 400 when original_url is missing', async () => {
      await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const res = await fetch(`${baseUrl}/api/v1/links/nonexistentcode123`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 400,
        error: 'BadRequestException',
        message: 'original_url is required',
      });
    });

    it('should return 404 when updating non-existent code', async () => {
      await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const res = await fetch(`${baseUrl}/api/v1/links/nonexistentcode123`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
        body: JSON.stringify({ original_url: 'https://www.github.com' }),
      });

      expect(res.status).toBe(404);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 404,
        error: 'NotFoundException',
        message: 'Shortened link not found!',
        action: 'Please check the code and try again',
      });
    });

    it('should return 400 when original_url is invalid', async () => {
      await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const createdLink = await orchestrator.createShortLink(
        'https://www.google.com',
        loginResponse.access_token as string,
      );

      const createdCode = createdLink.code;

      const res = await fetch(`${baseUrl}/api/v1/links/${createdCode}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
        body: JSON.stringify({ original_url: 'invalid-url' }),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'original_url must be a URL address',
        status_code: 400,
      });
    });

    it('should return 200 when updating existing code', async () => {
      await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const createdLink = await orchestrator.createShortLink(
        'https://www.google.com',
        loginResponse.access_token as string,
      );

      const createdCode = createdLink.code;

      const res = await fetch(`${baseUrl}/api/v1/links/${createdCode}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
        body: JSON.stringify({ original_url: 'https://www.github.com' }),
      });

      expect(res.status).toBe(200);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        code: createdCode,
        original_url: 'https://www.github.com',
        short_url: `${baseUrl}/${createdCode}`,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
        status_code: 200,
      });

      expect(responseBody.updated_at > createdLink.updated_at).toBe(true);
    });
  });

  describe('DELETE /api/v1/links/:code', () => {
    it('should return 401 when user is not authenticated', async () => {
      const res = await fetch(`${baseUrl}/api/v1/links/nonexistentcode123`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer invalidtoken',
        },
      });

      expect(res.status).toBe(401);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 401,
        error: 'UnauthorizedException',
        message: 'Invalid or expired token',
        action: 'Provide a valid token in the Authorization header',
      });
    });

    it('should return 404 when deleting non-existent code', async () => {
      await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const res = await fetch(`${baseUrl}/api/v1/links/nonexistentcode123`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
      });

      expect(res.status).toBe(404);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 404,
        error: 'NotFoundException',
        message: 'Shortened link not found!',
        action: 'Please check the code and try again',
      });
    });

    it('should return 200 when deleting existing code', async () => {
      await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const createdLink = await orchestrator.createShortLink(
        'https://www.google.com',
        loginResponse.access_token as string,
      );

      const createdCode = createdLink.code;

      const res = await fetch(`${baseUrl}/api/v1/links/${createdCode}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
      });

      expect(res.status).toBe(200);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 200,
        code: createdCode,
        original_url: 'https://www.google.com',
        short_url: `${baseUrl}/${createdCode}`,
      });
    });

    it('should return 404 when trying to delete already deleted code', async () => {
      await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserlogout@example.com',
        password: 'password123',
      });

      const createdLink = await orchestrator.createShortLink(
        'https://www.google.com',
        loginResponse.access_token as string,
      );

      const createdCode = createdLink.code;

      const res = await fetch(`${baseUrl}/api/v1/links/${createdCode}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
      });

      expect(res.status).toBe(200);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        status_code: 200,
        code: createdCode,
        original_url: 'https://www.google.com',
        short_url: `${baseUrl}/${createdCode}`,
      });

      const res2 = await fetch(`${baseUrl}/api/v1/links/${createdCode}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
      });

      expect(res2.status).toBe(404);

      const responseBody2 = await res2.json();

      expect(responseBody2).toEqual({
        status_code: 404,
        error: 'NotFoundException',
        message: 'Shortened link not found!',
        action: 'Please check the code and try again',
      });
    });
  });
});
