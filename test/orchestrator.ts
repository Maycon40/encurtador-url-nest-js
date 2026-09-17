import retry from 'async-retry';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

import database from '../src/core/database';
import { User as UserInterface } from '../src/modules/auth/repositories/users.repository';

export const baseUrl = 'http://localhost:3000';

type User = UserInterface & { password: string };

const emailHttpUrl = `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}`;

async function waitForAllServices() {
  await waitForWebServer();
  await waitForEmailServer();

  async function waitForWebServer() {
    await retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      const response = await fetch('http://localhost:3000/api/v1/status');

      if (!response.ok) {
        throw new Error();
      }
    }
  }

  async function waitForEmailServer() {
    await retry(fetchEmailPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchEmailPage() {
      const response = await fetch(emailHttpUrl);

      if (!response.ok) {
        throw new Error();
      }
    }
  }
}

async function cleanDatabase(): Promise<void> {
  await database.query({
    text: 'TRUNCATE TABLE users, links RESTART IDENTITY CASCADE;',
  });
}

async function deleteAllEmails() {
  await fetch(`${emailHttpUrl}/messages`, {
    method: 'DELETE',
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function hasEmailsAfterDelay(delayMs = 10) {
  await delay(delayMs);

  const response = await fetch(`${emailHttpUrl}/messages`);
  const emailList = await response.json();

  return emailList.length > 0;
}

async function getLastEmail(): Promise<any> {
  const emailListResponse = await fetch(`${emailHttpUrl}/messages`);

  const emailListBody = await emailListResponse.json();

  const lastEmail = emailListBody.pop();

  if (!lastEmail) {
    return null;
  }

  const emailTextResponse = await fetch(
    `${emailHttpUrl}/messages/${lastEmail.id}.plain`,
  );

  const emailTextBody = await emailTextResponse.text();

  lastEmail['text'] = emailTextBody;

  return lastEmail;
}

function extractCode(text: string) {
  const match = text.match(/[0-9]{6}/);

  return match ? match[0] : null;
}

async function findLastActivationCode(): Promise<any> {
  const lastEmail = await getLastEmail();

  if (!lastEmail) {
    return null;
  }

  const code = extractCode(lastEmail.text as string);

  return { code };
}

async function markAsUsedActivationCode(userId: string): Promise<any> {
  const result = await database.query({
    text: `
      UPDATE
        account_verifications
      SET
        used_at = timezone('utc', now())
      WHERE
        user_id = $1;
    `,
    values: [userId],
  });

  return result;
}

async function expireActivationCode(userId: string): Promise<any> {
  const result = await database.query({
    text: `
      UPDATE
        account_verifications
      SET
        expires_at = NOW() - INTERVAL '15 minutes'
      WHERE
        user_id = $1;
    `,
    values: [userId],
  });

  return result;
}

async function createUser(user: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  });

  return (await response.json()) as User;
}

async function activateUser(userEmail: string): Promise<any> {
  const activationCode = await findLastActivationCode();

  const response = await fetch(
    `${baseUrl}/api/v1/auth/activations/${userEmail}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: activationCode.code }),
    },
  );

  const responseBody = await response.json();

  return responseBody;
}

async function loginUser(credentials: {
  email: string;
  password: string;
}): Promise<any> {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  return await response.json();
}

async function findUserById(userId: string): Promise<User> {
  const result: { rows: User[] } = await database.query({
    text: 'SELECT * FROM users WHERE id = $1',
    values: [userId],
  });

  return result?.rows[0];
}

async function addFeaturesForUser(
  userId: string,
  features: string[],
): Promise<any> {
  const resultCurrentFeatures = await database.query({
    text: `
      SELECT
        features
      FROM
        users
      WHERE
        id = $1;
    `,
    values: [userId],
  });

  const currentFeatures = resultCurrentFeatures.rows[0]?.features || [];

  const newFeatures = {
    ...currentFeatures,
    ...features,
  };

  const result = await database.query({
    text: `
      UPDATE
        users
      SET
        features = $1
      WHERE
        id = $2
      RETURNING *;
    `,
    values: [newFeatures, userId],
  });

  return result.rows[0];
}

async function removeFeaturesForUser(
  userId: string,
  features: string[],
): Promise<any> {
  const resultCurrentFeatures = await database.query({
    text: `
      SELECT
        features
      FROM
        users
      WHERE
        id = $1;
    `,
    values: [userId],
  });

  const currentFeatures = resultCurrentFeatures.rows[0]?.features || [];

  const newFeatures = currentFeatures.filter(
    (feature: string) => !features.includes(feature),
  );

  const result = await database.query({
    text: `
      UPDATE
        users
      SET
        features = $1
      WHERE
        id = $2
      RETURNING *;
    `,
    values: [newFeatures, userId],
  });

  return result.rows[0];
}

async function createShortLink(url: string, token: string): Promise<any> {
  const response = await fetch(`${baseUrl}/api/v1/links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ original_url: url }),
  });

  return await response.json();
}

async function expireShortLink(code: string): Promise<any> {
  await database.query({
    text: `
      UPDATE
        links
      SET
        expires_at = NOW() - INTERVAL '1 minute'
      WHERE
        code = $1;
    `,
    values: [code],
  });
}

const orchestrator = {
  waitForAllServices,
  deleteAllEmails,
  hasEmailsAfterDelay,
  getLastEmail,
  markAsUsedActivationCode,
  cleanDatabase,
  findLastActivationCode,
  expireActivationCode,
  createUser,
  activateUser,
  loginUser,
  findUserById,
  addFeaturesForUser,
  removeFeaturesForUser,
  createShortLink,
  expireShortLink,
};

export default orchestrator;
