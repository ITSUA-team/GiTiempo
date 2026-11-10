import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from '../app.module';

const OUT_PATH = resolve(process.cwd(), '../../packages/shared/openapi.json');

/**
 * Detects properties that look like misconverted nullable scalars.
 *
 * NestJS Swagger interprets `type: ["string", "null"]` as `isArray: true`,
 * producing `{ type: "array", items: { type: "string" } }` with no array or
 * item constraints. Legitimate string arrays always carry at least one
 * constraint (pattern, enum, minItems, maxItems, uniqueItems, default).
 */
function findMisconvertedNullables(doc: unknown): string[] {
  const violations: string[] = [];

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  function walk(schema: unknown, path: string): void {
    if (!isRecord(schema)) return;

    const type = schema.type;
    const items = schema.items;

    if (type === 'array' && isRecord(items)) {
      const itemType = items.type;
      const itemKeys = Object.keys(items).filter((k) => k !== 'type');
      const arrayKeys = Object.keys(schema).filter(
        (k) => k !== 'type' && k !== 'items',
      );

      const isSimpleItemType =
        typeof itemType === 'string' &&
        itemType !== 'array' &&
        itemType !== 'object';

      if (isSimpleItemType && itemKeys.length === 0 && arrayKeys.length === 0) {
        violations.push(
          `${path}: type="array" items={type:"${itemType}"} with no constraints — likely a misconverted nullable ${itemType}`,
        );
      }
    }

    if (isRecord(schema.properties)) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        walk(prop, `${path}.${key}`);
      }
    }

    if (isRecord(items)) {
      walk(items, `${path}[]`);
    }

    for (const [idx, sub] of (Array.isArray(schema.anyOf)
      ? schema.anyOf
      : []
    ).entries()) {
      walk(sub, `${path}.anyOf[${idx}]`);
    }
    for (const [idx, sub] of (Array.isArray(schema.oneOf)
      ? schema.oneOf
      : []
    ).entries()) {
      walk(sub, `${path}.oneOf[${idx}]`);
    }
    for (const [idx, sub] of (Array.isArray(schema.allOf)
      ? schema.allOf
      : []
    ).entries()) {
      walk(sub, `${path}.allOf[${idx}]`);
    }
  }

  const components = (
    doc as { components?: { schemas?: Record<string, unknown> } }
  ).components;
  const schemas = components?.schemas ?? {};

  for (const [name, schema] of Object.entries(schemas)) {
    walk(schema, name);
  }

  return violations;
}

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('GI Tiempo API')
    .setDescription('GI Tiempo backend REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));

  const violations = findMisconvertedNullables(document);
  if (violations.length > 0) {
    console.error(
      '[openapi:export] Found misconverted nullable fields in OpenAPI document:',
    );
    for (const v of violations) {
      console.error(`  ${v}`);
    }
    process.exitCode = 1;
    await app.close();
    return;
  }

  writeFileSync(OUT_PATH, JSON.stringify(document, null, 2), 'utf8');

  console.log(`Wrote ${OUT_PATH}`);

  await app.close();
}

main().catch((err) => {
  console.error('[openapi:export] failed:', err);
  process.exitCode = 1;
});
