import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/commons/status (GET)', () => {
    return request(app.getHttpServer())
      .get('/commons/status')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('environment');
        expect(res.body).toHaveProperty('uptime');
      });
  });

  it('/commons/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/commons/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.db).toBe('connected');
      });
  });
});
