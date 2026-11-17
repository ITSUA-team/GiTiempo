UPDATE invoices AS i SET document = COALESCE(i.document, '{}'::jsonb) || jsonb_build_object(
  'timeEntries', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', e.id, 'taskId', e.task_id, 'userId', e.user_id,
      'userName', u.display_name, 'taskName', t.title,
      'startedAt', to_char(e.started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'endedAt', to_char(e.ended_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'durationSeconds', e.duration_seconds,
      'roundedDurationSeconds', ceil(e.duration_seconds::numeric / (i.rounding_step_minutes * 60))::integer * i.rounding_step_minutes * 60,
      'isBillable', e.is_billable, 'description', e.description
    ) ORDER BY e.started_at, e.id)
    FROM time_entries e
    LEFT JOIN users u ON u.id = e.user_id
    LEFT JOIN tasks t ON t.id = e.task_id
    WHERE e.invoice_id = i.id
  ), '[]'::jsonb)
) WHERE i.document IS NULL OR NOT (i.document ? 'timeEntries');
