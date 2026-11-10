import { createZodDto as createOriginalZodDto } from 'nestjs-zod';

type OpenApiProperty = {
  type?: string | string[];
  anyOf?: unknown[];
  [key: string]: unknown;
};

type OpenApiMetadataFactory = () => Record<string, OpenApiProperty>;

interface WithFactory {
  _OPENAPI_METADATA_FACTORY?: OpenApiMetadataFactory;
}

/**
 * nestjs-zod generates JSON Schema 2020-12 metadata where nullable types use
 * `type: ["string", "null"]`. NestJS Swagger's `createApiPropertyDecorator`
 * interprets any array-valued `type` as `isArray: true`, converting nullable
 * strings into `{ type: "array", items: { type: "string" } }`.
 *
 * Types with additional checks (email, url, uuid, datetime, int) already use
 * `anyOf` and bypass the bug. This wrapper rewrites the remaining
 * `type: [T, "null"]` properties to the same `anyOf` shape so NestJS Swagger
 * processes them correctly.
 */
export function createZodDto<
  TSchema extends Parameters<typeof createOriginalZodDto>[0],
>(
  schema: TSchema,
  options?: { codec: boolean },
): ReturnType<typeof createOriginalZodDto<TSchema>> {
  const DtoClass = createOriginalZodDto(
    schema,
    options,
  ) as unknown as WithFactory;

  const originalFactory = DtoClass._OPENAPI_METADATA_FACTORY;
  if (originalFactory) {
    DtoClass._OPENAPI_METADATA_FACTORY = function (
      this: unknown,
    ): Record<string, OpenApiProperty> {
      const metadata = originalFactory.call(this);

      for (const key of Object.keys(metadata)) {
        const prop = metadata[key];

        if (Array.isArray(prop.type) && prop.type.includes('null')) {
          const nonNullTypes = prop.type.filter((t) => t !== 'null');

          if (nonNullTypes.length === 1) {
            prop.anyOf = [{ type: nonNullTypes[0] }, { type: 'null' }];
            prop.type = '';
          } else if (nonNullTypes.length > 1) {
            prop.anyOf = nonNullTypes
              .map((t) => ({ type: t }))
              .concat([{ type: 'null' }]);
            prop.type = '';
          }
        }
      }

      return metadata;
    };
  }

  return DtoClass as ReturnType<typeof createOriginalZodDto<TSchema>>;
}
