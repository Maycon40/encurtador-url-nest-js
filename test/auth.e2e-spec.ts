import { version as uuidVersion } from 'uuid';
import * as jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import orchestrator, { baseUrl } from './orchestrator';
import database from '../src/core/database';
import password from '../src/common/utils/password.utils';

dotenv.config({ path: '.env.development' });

describe('Auth API (e2e)', () => {
  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.cleanDatabase();
    await orchestrator.deleteAllEmails();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(201);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        name: 'Test User',
        email: 'test@example.com',
        provider: 'local',
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
        status_code: 201,
      });

      expect(uuidVersion(responseBody.id as string)).toBe(4);
      expect(Date.parse(responseBody.created_at as string)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at as string)).not.toBeNaN();

      // Password validation

      const userInDatabase = await orchestrator.findUserById(
        responseBody.id as string,
      );

      expect(userInDatabase?.features).toEqual(['read:activation_code']);

      const correctPasswordMatch = await password.compare(
        'password123',
        userInDatabase?.password,
      );
      const incorrectPasswordMatch = await password.compare(
        'paSsword123',
        userInDatabase.password,
      );

      expect(correctPasswordMatch).toBe(true);
      expect(incorrectPasswordMatch).toBe(false);

      // Email validation

      const hasEmails = await orchestrator.hasEmailsAfterDelay();

      expect(hasEmails).toBe(true);

      const lastEmail = await orchestrator.getLastEmail();

      expect(lastEmail).toEqual({
        id: 1,
        sender: '<contato@contato.com>',
        recipients: ['<test@example.com>'],
        subject: 'Ative a sua conta',
        text: lastEmail.text,
        size: lastEmail.size,
        created_at: lastEmail.created_at,
      });

      expect(lastEmail.text).toContain('Test User');

      const { code } = await orchestrator.findLastActivationCode();

      expect(lastEmail.text).toContain(code);
    });

    it('should return 400 when trying to register without password', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'testwithoutpassword@example.com',
        }),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'Password is required',
        status_code: 400,
      });
    });

    it('should return 400 when trying to register without name', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'testwithoutname@example.com',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'Name is required',
        status_code: 400,
      });
    });

    it('should return 400 when trying to register without email', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'Email is required',
        status_code: 400,
      });
    });

    it('should return 400 when trying to register with an invalid email', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'Email is invalid',
        status_code: 400,
      });
    });

    it('should return 400 when trying to register an existing user', async () => {
      const response1 = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicated User',
          email: 'testduplicated@example.com',
          password: 'password123',
        }),
      });

      expect(response1.status).toBe(201);

      const response2 = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicated User',
          email: 'testduplicated@example.com',
          password: 'password123',
        }),
      });

      expect(response2.status).toBe(400);

      const responseBody = await response2.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'Email is already registered',
        action:
          'Please use a different email address or login with your existing account.',
        status_code: 400,
      });
    });
  });

  describe('POST /api/v1/auth/activations', () => {
    it('should return 400 when trying to resend activation code without email', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/activations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'Email is required',
        status_code: 400,
      });
    });

    it('should return 404 when trying to resend activation code for non-existing user', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/activations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'jonhdoe@example.com',
        }),
      });

      expect(res.status).toBe(404);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'NotFoundException',
        message: 'User not found',
        action: 'Check the email and try again',
        status_code: 404,
      });
    });

    it('should resend activation code for existing user', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: 'testresendactivationsuccessfully@example.com',
        password: 'password123',
      });

      const res = await fetch(`${baseUrl}/api/v1/auth/activations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'testresendactivationsuccessfully@example.com',
        }),
      });

      expect(res.status).toBe(200);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        user_id: createdUser.id,
        attempts: responseBody.attempts,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
        status_code: 200,
      });

      expect(uuidVersion(responseBody.id as string)).toBe(4);
      expect(uuidVersion(responseBody.user_id as string)).toBe(4);
      expect(Date.parse(responseBody.created_at as string)).not.toBeNaN();
      expect(Date.parse(responseBody.expires_at as string)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at as string)).not.toBeNaN();

      // Email validation

      const hasEmails = await orchestrator.hasEmailsAfterDelay();

      expect(hasEmails).toBe(true);

      const lastEmail = await orchestrator.getLastEmail();

      expect(lastEmail).toEqual({
        id: 3,
        sender: '<contato@contato.com>',
        recipients: ['<testresendactivationsuccessfully@example.com>'],
        subject: 'Ative a sua conta',
        text: lastEmail.text,
        size: lastEmail.size,
        created_at: lastEmail.created_at,
      });

      expect(lastEmail.text).toContain('Test User');

      const { code } = await orchestrator.findLastActivationCode();

      expect(lastEmail.text).toContain(code);
    });
  });

  describe('PATCH /api/v1/auth/activations/:email', () => {
    it('should return 400 when trying to activate profile without code', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/auth/activations/user@example.com`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      );

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'Code is required',
        status_code: 400,
      });
    });

    it('should return 404 when trying to activate profile of non-existing user', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/auth/activations/user@example.com`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: '123456',
          }),
        },
      );

      expect(res.status).toBe(404);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'NotFoundException',
        message: 'User not found',
        status_code: 404,
      });
    });

    it('should return 400 when trying to activate profile with invalid code', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: 'testuseractivate@example.com',
        password: 'password123',
      });

      const res = await fetch(
        `${baseUrl}/api/v1/auth/activations/${createdUser.email}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: '000000',
          }),
        },
      );

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'Invalid activation code',
        status_code: 400,
      });
    });

    it('should return 400 when trying to activate profile with expired code', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserexpiredcode@example.com',
        password: 'password123',
      });

      const { code } = await orchestrator.findLastActivationCode();

      await orchestrator.expireActivationCode(createdUser.id);

      const res = await fetch(
        `${baseUrl}/api/v1/auth/activations/${createdUser.email}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
          }),
        },
      );

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'Activation code has expired',
        action: 'Generate a new activation code and try again',
        status_code: 400,
      });
    });

    it('should return 400 when trying to activate profile with already used code', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: 'testusercode@example.com',
        password: 'password123',
      });

      const { code } = await orchestrator.findLastActivationCode();

      await orchestrator.markAsUsedActivationCode(createdUser.id);

      const res = await fetch(
        `${baseUrl}/api/v1/auth/activations/${createdUser.email}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
          }),
        },
      );

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'Activation code has already been used',
        action: 'Generate a new activation code and try again',
        status_code: 400,
      });
    });

    it('should return 400 when trying to activate profile with already activated user', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: 'testuseralreadyactivated@example.com',
        password: 'password123',
      });

      const { code } = await orchestrator.findLastActivationCode();

      const res = await fetch(
        `${baseUrl}/api/v1/auth/activations/${createdUser.email}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
          }),
        },
      );

      expect(res.status).toBe(200);

      const res2 = await fetch(
        `${baseUrl}/api/v1/auth/activations/${createdUser.email}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
          }),
        },
      );

      expect(res2.status).toBe(400);

      const responseBody = await res2.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'User cannot be activated',
        status_code: 400,
      });
    });

    it('should return 400 when send an aditional field', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/auth/activations/user@example.com`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: 'valid-code',
            provider_id: 'invalid-field',
          }),
        },
      );

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'property provider_id should not exist',
        status_code: 400,
      });
    });

    it('should return 400 when send an invalid email', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/activations/user`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: '123456',
        }),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'Email is invalid',
        status_code: 400,
      });
    });

    it('should activate profile of existing user with valid code', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: 'testuseractivatesuccessfully@example.com',
        password: 'password123',
      });

      const { code } = await orchestrator.findLastActivationCode();

      const res = await fetch(
        `${baseUrl}/api/v1/auth/activations/${createdUser.email}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
          }),
        },
      );

      expect(res.status).toBe(200);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        user_id: responseBody.user_id,
        attempts: 0,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
        status_code: 200,
      });

      expect(uuidVersion(responseBody.id as string)).toBe(4);
      expect(uuidVersion(responseBody.user_id as string)).toBe(4);
      expect(Date.parse(responseBody.created_at as string)).not.toBeNaN();
      expect(Date.parse(responseBody.expires_at as string)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at as string)).not.toBeNaN();

      const userInDatabase = await orchestrator.findUserById(createdUser.id);

      expect(userInDatabase?.features).toEqual([
        'create:session',
        'update:session',
        'delete:session',
        'read:user',
        'update:user',
        'create:link',
        'read:link',
        'read:link:all',
        'update:link',
        'delete:link',
      ]);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 403 when trying to login without activate user', async () => {
      await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserlogin@example.com',
        password: 'password123',
      });

      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'testuserlogin@example.com',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(403);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'ForbiddenException',
        message: 'User account is not activated.',
        action: 'Please activate your account before logging in.',
        status_code: 403,
      });
    });

    it('should return 400 when trying to login without password', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'testuserlogin@example.com',
        }),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'Password is required',
        status_code: 400,
      });
    });

    it('should return 400 when trying to login without email', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'password123',
        }),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'Email is required',
        status_code: 400,
      });
    });

    it('should return 400 when trying to login with an invalid email', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(400);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'BadRequestException',
        message: 'Email is invalid',
        status_code: 400,
      });
    });

    it('should return 400 when trying to login with invalid credentials', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        }),
      });

      expect(res.status).toBe(401);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'UnauthorizedException',
        message: 'Invalid credentials',
        action: 'Please check your email and password and try again.',
        status_code: 401,
      });
    });

    it('should login an existing user', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserloginsuccessfully@example.com',
        password: 'password123',
      });

      await orchestrator.activateUser(createdUser.email);

      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'testuserloginsuccessfully@example.com',
          password: 'password123',
        }),
      });

      expect(res.status).toBe(200);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        access_token: responseBody.access_token,
        refresh_token: responseBody.refresh_token,
        expires_in: 3600,
        user: {
          id: createdUser.id,
          name: 'Test User',
          email: 'testuserloginsuccessfully@example.com',
          provider: 'local',
          created_at: createdUser.created_at,
          updated_at: responseBody.user.updated_at,
        },
        status_code: 200,
      });

      expect(uuidVersion(responseBody.user.id as string)).toBe(4);
      expect(Date.parse(responseBody.user.created_at as string)).not.toBeNaN();
      expect(Date.parse(responseBody.user.updated_at as string)).not.toBeNaN();

      // Verify that the token is valid and can be decoded

      expect(() =>
        jwt.verify(
          responseBody.access_token as string,
          process.env.JWT_ACCESS_SECRET ?? '',
        ),
      ).not.toThrow();

      expect(() =>
        jwt.verify(
          responseBody.refresh_token as string,
          process.env.JWT_REFRESH_SECRET ?? '',
        ),
      ).not.toThrow();

      const payload1 = jwt.decode(responseBody.access_token as string);
      expect(payload1).toEqual({
        sub: createdUser.id,
        email: createdUser.email,
        iat: expect.any(Number),
        exp: expect.any(Number),
      });

      const payload2 = jwt.decode(responseBody.refresh_token as string);

      expect(payload2).toEqual({
        sub: createdUser.id,
        sessionId: expect.any(String),
        iat: expect.any(Number),
        exp: expect.any(Number),
      });

      const sessionId = (payload2 as jwt.JwtPayload).sessionId;

      expect(uuidVersion(String(sessionId))).toBe(4);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return 401 when trying to refresh token without token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(401);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'UnauthorizedException',
        message: 'Token not provided',
        status_code: 401,
      });
    });

    it('should return 401 when trying to refresh token with invalid token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalidtoken',
        },
      });

      expect(res.status).toBe(401);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'UnauthorizedException',
        message: 'Invalid or expired refresh token',
        status_code: 401,
      });
    });

    it('should return 401 when trying to refresh token with expired token', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserexpiredrefresh@example.com',
        password: 'password123',
      });

      await orchestrator.activateUser(createdUser.email);

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserexpiredrefresh@example.com',
        password: 'password123',
      });

      const payload = jwt.decode(loginResponse.refresh_token as string);

      const sessionId = (payload as jwt.JwtPayload).sessionId;

      await database.query({
        text: `
          UPDATE sessions
          SET expires_at = NOW() - INTERVAL '1 second'
          WHERE id = $1;
        `,
        values: [sessionId],
      });

      const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginResponse.refresh_token}`,
        },
      });

      expect(res.status).toBe(401);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'UnauthorizedException',
        message: 'Expired token',
        status_code: 401,
      });
    });

    it('should return 401 when trying to refresh token with access token', async () => {
      await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserrefresh@example.com',
        password: 'password123',
      });

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserrefresh@example.com',
        password: 'password123',
      });

      const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
      });

      expect(res.status).toBe(401);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'UnauthorizedException',
        message: 'Invalid or expired refresh token',
        status_code: 401,
      });
    });

    it('should return 403 when trying to refresh token without permission', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: 'userwithoutpermissiontorefresh@example.com',
        password: 'password123',
      });

      await orchestrator.activateUser(createdUser.email);

      const loginResponse = await orchestrator.loginUser({
        email: 'userwithoutpermissiontorefresh@example.com',
        password: 'password123',
      });

      await orchestrator.removeFeaturesForUser(createdUser.id, [
        'update:session',
      ]);

      const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginResponse.refresh_token}`,
        },
      });

      expect(res.status).toBe(403);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'ForbiddenException',
        message: 'User does not have permission required.',
        status_code: 403,
      });
    });

    it('should refresh token with valid token', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserrefreshsuccessfully@example.com',
        password: 'password123',
      });

      await orchestrator.activateUser(createdUser.email);

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserrefreshsuccessfully@example.com',
        password: 'password123',
      });

      const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginResponse.refresh_token}`,
        },
      });

      expect(res.status).toBe(200);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        access_token: responseBody.access_token,
        refresh_token: responseBody.refresh_token,
        expires_in: 3600,
        status_code: 200,
      });

      // Verify that the token is valid and can be decoded

      expect(() =>
        jwt.verify(
          responseBody.access_token as string,
          process.env.JWT_ACCESS_SECRET ?? '',
        ),
      ).not.toThrow();

      expect(() =>
        jwt.verify(
          responseBody.refresh_token as string,
          process.env.JWT_REFRESH_SECRET ?? '',
        ),
      ).not.toThrow();

      const payload1 = jwt.decode(responseBody.access_token as string);
      expect(payload1).toEqual({
        sub: createdUser.id,
        email: createdUser.email,
        iat: expect.any(Number),
        exp: expect.any(Number),
      });

      const payload2 = jwt.decode(responseBody.refresh_token as string);

      expect(payload2).toEqual({
        sub: createdUser.id,
        sessionId: expect.any(String),
        iat: expect.any(Number),
        exp: expect.any(Number),
      });

      const sessionId = (payload2 as jwt.JwtPayload).sessionId;

      expect(uuidVersion(String(sessionId))).toBe(4);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 401 when trying to logout without token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(401);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'UnauthorizedException',
        message: 'Token not provided',
        status_code: 401,
      });
    });

    it('should return 401 when trying to logout with invalid token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalidtoken',
        },
      });

      expect(res.status).toBe(401);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'UnauthorizedException',
        message: 'Invalid or expired refresh token',
        status_code: 401,
      });
    });

    it('should logout with valid token', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserlogoutsuccessfully@example.com',
        password: 'password123',
      });

      await orchestrator.activateUser(createdUser.email);

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserlogoutsuccessfully@example.com',
        password: 'password123',
      });

      const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginResponse.refresh_token}`,
        },
      });

      expect(res.status).toBe(204);

      const resProfile = await fetch(`${baseUrl}/api/v1/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer null`,
        },
      });

      expect(resProfile.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    it('should return 401 when trying to access profile without token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/profile`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(401);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'UnauthorizedException',
        message: 'No token provided',
        action: 'Provide a valid token in the Authorization header',
        status_code: 401,
      });
    });

    it('should return 401 when trying to access profile with invalid token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalidtoken',
        },
      });

      expect(res.status).toBe(401);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'UnauthorizedException',
        message: 'Invalid or expired token',
        action: 'Provide a valid token in the Authorization header',
        status_code: 401,
      });
    });

    it('should return 200 when trying to access profile with valid token', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserprofile@example.com',
        password: 'password123',
      });

      await orchestrator.activateUser(createdUser.email);

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserprofile@example.com',
        password: 'password123',
      });

      const res = await fetch(`${baseUrl}/api/v1/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginResponse.access_token}`,
        },
      });

      expect(res.status).toBe(200);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        id: createdUser.id,
        email: 'testuserprofile@example.com',
        name: 'Test User',
        provider: 'local',
        created_at: createdUser.created_at,
        updated_at: responseBody.updated_at,
        status_code: 200,
      });
    });
  });

  describe('PATCH /api/v1/auth/profile/:user_id', () => {
    it('should return 401 when trying to update profile without token', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/auth/profile/invalid-user-id`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Updated Name',
          }),
        },
      );

      expect(res.status).toBe(401);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'UnauthorizedException',
        message: 'No token provided',
        action: 'Provide a valid token in the Authorization header',
        status_code: 401,
      });
    });

    it('should return 401 when trying to update profile with invalid token', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/auth/profile/invalid-user-id`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer invalidtoken',
          },
          body: JSON.stringify({
            name: 'Updated Name',
          }),
        },
      );

      expect(res.status).toBe(401);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'UnauthorizedException',
        message: 'Invalid or expired token',
        action: 'Provide a valid token in the Authorization header',
        status_code: 401,
      });
    });

    it('should return 403 when trying to update profile of another user', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserprofile@example.com',
        password: 'password123',
      });

      const createdUser2 = await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserprofile2@example.com',
        password: 'password123',
      });

      await orchestrator.activateUser(createdUser.email);

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserprofile@example.com',
        password: 'password123',
      });

      const res = await fetch(
        `${baseUrl}/api/v1/auth/profile/${createdUser2.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${loginResponse.access_token}`,
          },
          body: JSON.stringify({
            name: 'Updated Name',
          }),
        },
      );

      expect(res.status).toBe(403);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'ForbiddenException',
        message: 'You do not have permission to update this user',
        action: 'You can only update your own user profile',
        status_code: 403,
      });
    });

    it('should return 404 when trying to update profile of non-existing user', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: 'testuser404@example.com',
        password: 'password123',
      });

      await orchestrator.activateUser(createdUser.email);

      const loginResponse = await orchestrator.loginUser({
        email: 'testuser404@example.com',
        password: 'password123',
      });

      const res = await fetch(
        `${baseUrl}/api/v1/auth/profile/00000000-0000-4000-8000-000000000000`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${loginResponse.access_token}`,
          },
          body: JSON.stringify({
            name: 'Updated Name',
          }),
        },
      );

      expect(res.status).toBe(404);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        error: 'NotFoundException',
        message: 'User not found',
        status_code: 404,
      });
    });

    it('should update profile of existing user with valid token', async () => {
      const createdUser = await orchestrator.createUser({
        name: 'Test User',
        email: 'testuserupdate@example.com',
        password: 'password123',
      });

      await orchestrator.activateUser(createdUser.email);

      const loginResponse = await orchestrator.loginUser({
        email: 'testuserupdate@example.com',
        password: 'password123',
      });

      const res = await fetch(
        `${baseUrl}/api/v1/auth/profile/${createdUser.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${loginResponse.access_token}`,
          },
          body: JSON.stringify({
            name: 'Updated Name',
          }),
        },
      );

      expect(res.status).toBe(200);

      const responseBody = await res.json();

      expect(responseBody).toEqual({
        id: createdUser.id,
        name: 'Updated Name',
        email: 'testuserupdate@example.com',
        provider: 'local',
        created_at: createdUser.created_at,
        updated_at: responseBody.updated_at,
        status_code: 200,
      });

      expect(Date.parse(responseBody.created_at as string)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at as string)).not.toBeNaN();
    });
  });
});
