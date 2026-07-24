-- GPT Raumvisualisierung: Inspirationsbild + öffentlicher Storage-Bucket

alter table public.gpt_raum_sessions
  add column if not exists ziel_bild_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gpt-visualisierungen',
  'gpt-visualisierungen',
  true,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "gpt_visualisierungen_public_read" on storage.objects;
create policy "gpt_visualisierungen_public_read"
  on storage.objects for select to public
  using (bucket_id = 'gpt-visualisierungen');

drop policy if exists "gpt_visualisierungen_service_write" on storage.objects;
create policy "gpt_visualisierungen_service_write"
  on storage.objects for all to service_role
  using (bucket_id = 'gpt-visualisierungen')
  with check (bucket_id = 'gpt-visualisierungen');
