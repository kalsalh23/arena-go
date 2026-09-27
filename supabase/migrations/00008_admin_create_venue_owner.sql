-- ============================================================
-- Arena Go — 00008 : Admin creates venue-owner accounts.
-- The admin client generates the credentials and shares them via WhatsApp;
-- the account is created server-side (bcrypt via pgcrypto) and the
-- handle_new_user trigger builds the profile with role='venue_owner'.
-- ============================================================

create or replace function public.admin_create_venue_owner(p_phone text, p_full_name text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid;
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'مدير Arena Go فقط يمكنه إنشاء حسابات أصحاب الملاعب';
  end if;

  if p_phone !~ '^9639[0-9]{8}$' then
    raise exception 'صيغة رقم الهاتف غير صحيحة (9639XXXXXXXX)';
  end if;
  if coalesce(length(p_password), 0) < 6 then
    raise exception 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
  end if;
  if exists (select 1 from public.user_phones where phone = p_phone) then
    raise exception 'رقم الهاتف مسجل مسبقاً';
  end if;

  v_email := p_phone || '@phone.arenago.app';

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new, is_sso_user
  ) values (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    v_email, crypt(p_password, gen_salt('bf', 10)), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('phone', p_phone, 'full_name', coalesce(nullif(trim(p_full_name), ''), 'صاحب ملعب'), 'role', 'venue_owner'),
    now(), now(), '', '', '', '', false
  ) returning id into v_uid;

  -- auth.identities.email/phone are GENERATED columns (from identity_data) — never insert them.
  insert into auth.identities (id, user_id, provider_id, identity_data, last_sign_in_at, created_at, updated_at, provider)
  values (
    gen_random_uuid(), v_uid, v_uid::text,
    jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
    now(), now(), now(), 'email'
  );

  return jsonb_build_object('id', v_uid, 'phone', p_phone, 'full_name', coalesce(nullif(trim(p_full_name), ''), 'صاحب ملعب'));
end $$;
