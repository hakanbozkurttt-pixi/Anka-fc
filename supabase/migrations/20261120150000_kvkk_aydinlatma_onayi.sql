-- =====================================================================
-- KVKK aydınlatma metni onayları
--
-- * Müşteri, kayıt sırasında ve metnin her yeni sürümünde aydınlatma
--   metnini onaylar. Her onay; kim, hangi sürüm ve ne zaman bilgisiyle
--   ayrı bir satır olarak saklanır (geçmiş korunur, silinmez/değiştirilmez).
-- * Onay zamanı sunucu saatiyle yazılır; müşteri değiştiremez.
-- * Müşteri hesabı silinirse onay kayıtları da silinir (on delete cascade).
--   Silme sonrası saklama gerekip gerekmediği KVKK hukuki görüşüne bağlıdır.
-- =====================================================================

create table public.kvkk_acceptances (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  version      text not null check (char_length(version) between 1 and 50),
  accepted_at  timestamptz not null default now(),
  unique (user_id, version)
);

create index kvkk_acceptances_user_id_idx on public.kvkk_acceptances (user_id);

comment on table public.kvkk_acceptances is 'Müşterinin KVKK aydınlatma metni onay geçmişi (sürüm + zaman).';

revoke all on public.kvkk_acceptances from anon, authenticated;
grant select on public.kvkk_acceptances to authenticated;
-- Müşteri yalnızca "version" sütununu gönderebilir; user_id ve zaman sunucuda atanır.
grant insert (version) on public.kvkk_acceptances to authenticated;

alter table public.kvkk_acceptances enable row level security;

create policy "kvkk_okuma" on public.kvkk_acceptances
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "kvkk_onaylama" on public.kvkk_acceptances
  for insert to authenticated
  with check (user_id = (select auth.uid()));


-- Kayıt tetikleyicisi: artık KVKK onayı da zorunlu.
-- Uygulama kayıt sırasında onaylanan metin sürümünü "kvkk_version" olarak gönderir;
-- yoksa kayıt işleminin tamamı reddedilir.
create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  kvkk_version text := btrim(meta ->> 'kvkk_version');
begin
  if not (meta ? 'first_name') then
    return new;
  end if;

  if kvkk_version is null or kvkk_version = '' then
    raise exception 'KVKK aydınlatma metni onaylanmadan kayıt olunamaz.';
  end if;

  insert into public.profiles (id, first_name, last_name, phone, address, email)
  values (
    new.id,
    btrim(meta ->> 'first_name'),
    btrim(meta ->> 'last_name'),
    btrim(meta ->> 'phone'),
    btrim(meta ->> 'address'),
    new.email
  );

  insert into public.kvkk_acceptances (user_id, version)
  values (new.id, kvkk_version);

  return new;
end;
$$;
