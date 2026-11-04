import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createZodDto } from './zod-dto.js';

type OpenApiProperty = {
  type?: string | string[];
  anyOf?: { type?: string }[];
  items?: { type?: string };
  [key: string]: unknown;
};

type OpenApiMetadata = Record<string, OpenApiProperty>;

function getMetadata(Dto: ReturnType<typeof createZodDto>): OpenApiMetadata {
  return Dto._OPENAPI_METADATA_FACTORY() as OpenApiMetadata;
}

describe('createZodDto', () => {
  it('converts nullable string type array to anyOf in OpenAPI metadata', () => {
    const schema = z.object({
      displayName: z.string().nullable(),
      email: z.string(),
    });
    const Dto = createZodDto(schema);
    const metadata = getMetadata(Dto);

    const displayName = metadata.displayName;
    expect(Array.isArray(displayName.type)).toBe(false);
    expect(displayName.anyOf).toEqual([{ type: 'string' }, { type: 'null' }]);
  });

  it('converts nullable boolean type array to anyOf in OpenAPI metadata', () => {
    const schema = z.object({
      active: z.boolean().nullable(),
    });
    const Dto = createZodDto(schema);
    const metadata = getMetadata(Dto);

    expect(Array.isArray(metadata.active.type)).toBe(false);
    expect(metadata.active.anyOf).toEqual([
      { type: 'boolean' },
      { type: 'null' },
    ]);
  });

  it('preserves non-nullable string type as-is', () => {
    const schema = z.object({
      email: z.string(),
    });
    const Dto = createZodDto(schema);
    const metadata = getMetadata(Dto);

    expect(metadata.email.type).toBe('string');
    expect(metadata.email.anyOf).toBeUndefined();
  });

  it('preserves legitimate string arrays as array type', () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });
    const Dto = createZodDto(schema);
    const metadata = getMetadata(Dto);

    expect(metadata.tags.type).toBe('array');
    expect(metadata.tags.items).toEqual({ type: 'string' });
    expect(metadata.tags.anyOf).toBeUndefined();
  });

  it('preserves nullable types that already use anyOf (e.g. email)', () => {
    const schema = z.object({
      nullableEmail: z.string().email().nullable(),
    });
    const Dto = createZodDto(schema);
    const metadata = getMetadata(Dto);

    const prop = metadata.nullableEmail;
    expect(Array.isArray(prop.type)).toBe(false);
    expect(prop.anyOf).toBeDefined();
    expect(prop.anyOf).toHaveLength(2);
    expect(prop.anyOf?.[1]).toEqual({ type: 'null' });
  });
});
