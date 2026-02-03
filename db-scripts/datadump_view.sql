-- Drop the old view name
DROP VIEW IF EXISTS public.v_rpt_attendee;

-- Create the unified attendee report view with the cleaner name 'attendee'
CREATE OR REPLACE VIEW public.attendee AS
SELECT
  r.id               AS id,
  r.event_id         AS event_id,
  r.parent_id        AS parent_id,
  r.first_name       AS first_name,
  r.middle_name      AS middle_name,
  r.last_name        AS last_name,
  r.email            AS email,
  COALESCE(c.companion_count, 0) AS companion_count,
  r.company_name     AS company_name,
  r.phone            AS phone,
  r.mobile           AS mobile,
  at.name            AS attendee_type,
  NULL::text         AS emergency_contact,
  r.status           AS registration_status,
  NULL::text         AS manual_status,
  rr.status          AS room_status,
  ar.status          AS air_status,
  r.created_at       AS created_at,
  r.updated_at       AS updated_at,
  r.concur_login_id  AS concur_login_id,
  r.notes            AS internal_notes,
  COALESCE(r.dietary, r.dietary_restrictions, NULL::text) AS dietary_restrictions
FROM public.registrations r
LEFT JOIN public.attendee_types at ON at.id = r.attendee_type_id
LEFT JOIN public.room_requests rr ON rr.registration_id = r.id AND rr.event_id = r.event_id
LEFT JOIN public.air_requests ar ON ar.registration_id = r.id
LEFT JOIN (
  SELECT parent_id, COUNT(*) AS companion_count
  FROM public.registrations
  WHERE parent_id IS NOT NULL
  GROUP BY parent_id
) c ON c.parent_id = r.id;
