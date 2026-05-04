-- Copy newsletter preference from auth signup metadata into public.profiles when the auth trigger runs.
-- Signup client sends options.data.newsletter_opt_in (boolean); stored in raw_user_meta_data.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  newsletter boolean := false;
BEGIN
  newsletter := lower(trim(COALESCE(meta ->> 'newsletter_opt_in', ''))) IN ('true', 't', '1', 'yes', 'on');

  INSERT INTO public.profiles (id, email, full_name, display_name, newsletter_opt_in)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta ->> 'full_name', ''),
    COALESCE(
      NULLIF(trim(meta ->> 'display_name'), ''),
      NULLIF(trim(meta ->> 'full_name'), ''),
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    newsletter
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
