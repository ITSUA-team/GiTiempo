import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { expect, it } from 'vitest';
import { InvoicesService } from '../services/invoices.service';
import { InvoicesController } from './invoices.controller';

it('publishes the invoice PDF download and billing error contracts', async () => {
  const module = await Test.createTestingModule({
    controllers: [InvoicesController],
    providers: [{ provide: InvoicesService, useValue: {} }],
  }).compile();
  const app = module.createNestApplication();
  try {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    const responses = doc.paths['/invoices/{id}/pdf']?.get?.responses;
    expect(responses).toMatchObject({
      '200': {
        content: {
          'application/pdf': { schema: { type: 'string', format: 'binary' } },
        },
        headers: { 'Content-Disposition': { schema: { type: 'string' } } },
      },
      '422': {
        content: {
          'application/json': {
            schema: {
              oneOf: [
                { $ref: '#/components/schemas/InvoiceDocumentIncompleteDto' },
                { $ref: '#/components/schemas/InvoiceLogoInvalidDto' },
              ],
            },
          },
        },
      },
    });
  } finally {
    await app.close();
  }
});
