import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface ShortenResponse {
  code: string;
  short_url: string;
}

interface ResponseBody {
  short_url: string;
  original_url: string;
  short_code: string;
  clicks: number;
  created_at: string;
  expires_at: string;
}

describe('API status (e2e)', () => {
  let app: INestApplication<App>;
  let code = '';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/shorten (POST)', async () => {
    await request(app.getHttpServer()).post('/shorten').expect(400);

    const response = await request(app.getHttpServer())
      .post('/shorten')
      .send({ original_url: 'https://www.google.com' })
      .expect(201);

    const responseBody = (await response.body) as ShortenResponse;
    code = responseBody.code;

    expect(responseBody.short_url.includes('http')).toBe(true);
  });

  it('/:code (GET)', async () => {
    await request(app.getHttpServer()).get(`/${code}`).expect(302);
  });

  it('/static/:code (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/static/${code}`)
      .expect(200);

    const responseBody = (await response.body) as ResponseBody;

    expect(responseBody.short_url.includes('http')).toEqual(true);
    expect(responseBody.original_url.includes('http')).toEqual(true);
    expect(responseBody.short_code).toBeDefined();
    expect(responseBody.clicks).toBeGreaterThanOrEqual(0);
    expect(responseBody.created_at).toBeDefined();
    expect(responseBody.expires_at).toBeDefined();
  });

  it('/:code (PUT)', async () => {
    await request(app.getHttpServer())
      .put(`/${code}`)
      .send({ original_url: 'https://www.google.com' })
      .expect(200);
  });

  it('/:code (DELETE)', async () => {
    await request(app.getHttpServer()).delete(`/${code}`).expect(200);
  });
});
