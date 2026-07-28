WITH today AS (
  SELECT (now() AT TIME ZONE 'UTC')::date AS value
), relative_ranges AS (
  SELECT
    saved_reports.id,
    CASE saved_reports.config #>> '{dateRange,period}'
      WHEN 'previous_month' THEN (date_trunc('month', today.value) - interval '1 day')::date
      ELSE today.value
    END AS date_to,
    CASE saved_reports.config #>> '{dateRange,period}'
      WHEN 'this_week' THEN today.value - ((extract(isodow FROM today.value)::integer) - 1)
      WHEN 'this_month' THEN date_trunc('month', today.value)::date
      WHEN 'previous_month' THEN (date_trunc('month', today.value) - interval '1 month')::date
      WHEN 'last_7_days' THEN today.value - 6
      WHEN 'last_30_days' THEN today.value - 29
    END AS date_from
  FROM saved_reports
  CROSS JOIN today
  WHERE saved_reports.config #>> '{dateRange,kind}' = 'relative'
    AND saved_reports.config #>> '{dateRange,period}' IN (
      'this_week',
      'this_month',
      'previous_month',
      'last_7_days',
      'last_30_days'
    )
)
UPDATE saved_reports
SET
  config = jsonb_set(
    saved_reports.config,
    '{dateRange}',
    jsonb_build_object(
      'kind', 'absolute',
      'dateFrom', to_char(relative_ranges.date_from, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'dateTo', to_char(relative_ranges.date_to, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  ),
  updated_at = now()
FROM relative_ranges
WHERE saved_reports.id = relative_ranges.id;
