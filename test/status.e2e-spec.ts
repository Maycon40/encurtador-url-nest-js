import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface StatusResponse {
  dependencies: {
    version: string;
    max_connections: number;
    used_connections: number;
  };
}

describe('API status (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/v1/status (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/status')
      .expect(200);

    const responseBody = (await response.body) as StatusResponse;

    console.log('responseBody', responseBody);

    expect(responseBody.dependencies.version.includes('16')).toBe(true);
    expect(responseBody.dependencies.max_connections).toBe(100);
    expect(responseBody.dependencies.used_connections).toEqual(1);
  });
});
