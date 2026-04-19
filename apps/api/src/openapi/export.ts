import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from '../app.module';

const OUT_PATH = resolve(process.cwd(), '../../packages/shared/openapi.json');

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('GI Tiempo API')
    .setDescription('GI Tiempo backend REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));

  writeFileSync(OUT_PATH, JSON.stringify(document, null, 2), 'utf8');

  console.log(`Wrote ${OUT_PATH}`);

  await app.close();
}

main().catch((err) => {
  console.error('[openapi:export] failed:', err);
  process.exit(1);
});
