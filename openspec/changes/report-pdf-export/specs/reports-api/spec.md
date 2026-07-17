## ADDED Requirements

### Requirement: Time Reports Can Be Exported As PDF

The backend MUST support `format=pdf` on the report export endpoint, producing a styled PDF document from the same filters, ordered grouping path, date-window defaults, and authorization scope rules as the CSV export. The CSV format MUST remain the default and keep its existing detailed row behavior. The PDF MUST render the grouped report: a document header identifying the product, workspace, and effective period, a summary of the applied filters and grouping path, overall summary totals, one table row per group node of the requested grouping path with per-level subtotals and indentation, an overall total row, and page footers carrying the generation date and page numbers.

#### Scenario: Admin exports a PDF report
- **GIVEN** an authenticated admin requests `GET /reports/time/export` with `format=pdf`
- **WHEN** matching completed entries exist
- **THEN** the backend responds with PDF content and a PDF content type
- **AND** the download filename carries the effective date window and a `.pdf` extension
- **AND** the document reflects the requested ordered grouping path with per-level subtotal rows

#### Scenario: Export format defaults to CSV
- **GIVEN** an authenticated admin requests `GET /reports/time/export` without `format`
- **WHEN** matching completed entries exist
- **THEN** the backend responds with the existing detailed CSV content unchanged

#### Scenario: PM PDF export stays inside report scope
- **GIVEN** an authenticated PM requests a PDF export
- **WHEN** matching completed entries exist inside and outside the PM report scope
- **THEN** the PDF includes only data within the PM report scope

#### Scenario: Member cannot export PDF reports
- **GIVEN** an authenticated member requests `GET /reports/time/export` with `format=pdf`
- **WHEN** the request is authorized
- **THEN** the backend responds with 403 Forbidden

#### Scenario: Invalid export format is rejected
- **GIVEN** an authenticated admin requests the export endpoint
- **WHEN** `format` is neither `csv` nor `pdf`
- **THEN** the backend rejects the request as a validation error
