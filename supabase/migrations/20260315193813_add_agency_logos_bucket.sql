-- Agregamos el bucket para los escudos/logos de las agencias de futbol
insert into storage.buckets (id, name, public)
values ('agency-logos', 'agency-logos', true)
on conflict (id) do nothing;

create policy "Public Access to Agency Logos"
  on storage.objects for select
  using ( bucket_id = 'agency-logos' );

create policy "Auth Users Can Upload Agency Logos"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'agency-logos' );

create policy "Auth Users Can Update their Agency Logos"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'agency-logos' );

create policy "Auth Users Can Delete their Agency Logos"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'agency-logos' );
