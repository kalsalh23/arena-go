-- ============================================================
-- Arena Go — 00006 : Seed data (villages of rural Hama)
-- Villages are DATA, not hardcoded app logic — admins manage them.
-- ============================================================

insert into public.villages (name, is_active) values
  ('طيبة الإمام', true),
  ('صوران', true),
  ('كفرنبودة', true),
  ('كفرعين', true),
  ('حلفايا', true),
  ('معردفت', true),
  ('الشيذر', true),
  ('قمحانة', true),
  ('جب رمحة', true),
  ('تلبسة', true)
on conflict (name) do nothing;
