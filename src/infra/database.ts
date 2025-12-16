import { Client } from 'pg';

interface QueryData {
  rows: Array<any>;
}

async function query(queryObject) {
  const host = process.env.POSTGRES_HOST;
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DB;
  const postgresPort = Number(process.env.POSTGRES_PORT) || 5432;

  const client = new Client({
    host,
    user,
    password,
    database,
    port: postgresPort,
    ssl: ['development', 'test'].includes(process.env.NODE_ENV || '')
      ? false
      : true,
  });

  try {
    await client.connect();
    const result = (await client.query(queryObject)) as QueryData;
    return result;
  } catch (error) {
    console.error('Erro', error);
  } finally {
    await client.end();
  }
}

export default {
  query,
};
