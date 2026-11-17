import { giTiempoDatePickerPt, giTiempoFieldWidthSelectPt } from '@gitiempo/web-config/theme';

export const invoiceSelectPt = {
  ...giTiempoFieldWidthSelectPt,
  label: {
    ...giTiempoFieldWidthSelectPt.label,
    style: { fontSize: '13px', fontWeight: 400 },
  },
};

export const invoiceDatePickerPt = {
  ...giTiempoDatePickerPt,
  pcInputText: {
    ...giTiempoDatePickerPt.pcInputText,
    root: {
      ...giTiempoDatePickerPt.pcInputText.root,
      class: [
        giTiempoDatePickerPt.pcInputText.root.class,
        'aria-invalid:border-[var(--p-inputtext-invalid-border-color)]',
      ],
      style: { fontSize: '13px', fontWeight: 400, color: 'var(--color-text-dark)' },
    },
  },
};
