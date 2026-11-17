import { UnprocessableEntityException } from '@nestjs/common';
import { invoiceLogoSchema } from '@gitiempo/shared';
import sharp from 'sharp';

const pngPrefix = 'data:image/png;base64,';

export async function prepareInvoiceLogo(
  logo?: string | null,
): Promise<string | null> {
  if (logo == null) return null;
  const invalidLogo = () =>
    new UnprocessableEntityException({
      code: 'invoice_logo_invalid',
      message:
        'Replace or remove the invalid invoice logo. PNG logos must be valid images up to 4 megapixels.',
    });
  if (!invoiceLogoSchema.safeParse(logo).success) throw invalidLogo();
  if (!logo.startsWith(pngPrefix)) return logo;
  try {
    // pdfmake's PNG decoder can throw outside the document stream on invalid IDAT data.
    // Give it only PNGs decoded and re-encoded within a bounded pixel budget.
    const image = await sharp(
      Buffer.from(logo.slice(pngPrefix.length), 'base64'),
      {
        limitInputPixels: 4_000_000,
        failOn: 'warning',
      },
    )
      .resize({
        width: 512,
        height: 512,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
    return pngPrefix + image.toString('base64');
  } catch {
    throw invalidLogo();
  }
}
