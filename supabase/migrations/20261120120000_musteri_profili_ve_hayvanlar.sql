-- =====================================================================
-- Müşteri profili ve hayvan profilleri
--
-- * E-posta ve şifre Supabase'in kendi giriş sisteminde (auth.users)
--   tutulur; şifre yalnızca şifrelenmiş (hash) olarak saklanır.
-- * Müşterinin ad, soyad, telefon ve adres bilgileri public.profiles
--   tablosunda tutulur. Satır, kayıt anında veritabanı tarafından
--   otomatik oluşturulur; zorunlu alanlar burada da denetlenir.
-- * Hayvanlar public.pets tablosunda tutulur.
-- * Satır bazlı erişim kuralları (RLS): müşteri yalnızca kendi
--   kayıtlarını görür; yönetici tüm kayıtları yalnızca okuyabilir.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Yönetici kontrolü
-- Yönetici yetkisi, kullanıcının "app_metadata" alanındaki role=admin
-- bilgisinden okunur. Bu alanı müşteriler değiştiremez; yalnızca
-- sunucu tarafındaki gizli anahtarla (scripts/create-admin.mjs) atanır.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;


-- ---------------------------------------------------------------------
-- Müşteri profili
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  first_name  text not null check (char_length(btrim(first_name)) between 1 and 100),
  last_name   text not null check (char_length(btrim(last_name)) between 1 and 100),
  -- Telefon: rakam, boşluk, +, -, ( ) kabul edilir; en az 10 rakam.
  phone       text not null check (
                phone ~ '^[0-9+() -]+$'
                and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 10 and 15
              ),
  address     text not null check (char_length(btrim(address)) between 5 and 500),
  email       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Müşteri profili. Satır, kayıt anında handle_new_customer tetikleyicisiyle oluşturulur.';


-- Kayıt anında profili oluşturan tetikleyici.
-- Telefon uygulaması kayıt olurken ad, soyad, telefon ve adresi
-- "user_metadata" içinde gönderir. Bu bilgiler eksik veya hatalıysa
-- kayıt işleminin tamamı geri alınır (yarım hesap oluşmaz).
-- Metadata içinde first_name hiç yoksa (ör. yönetici hesabı) profil oluşturulmaz.
create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if not (meta ? 'first_name') then
    return new;
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

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_customer();


-- ---------------------------------------------------------------------
-- Hayvan profili
-- Zorunlu: tür (kedi/köpek) ve ad.
-- İsteğe bağlı: doğum tarihi, ırk, cinsiyet, kilo, not.
-- ---------------------------------------------------------------------
create table public.pets (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  species     text not null check (species in ('cat', 'dog')),
  name        text not null check (char_length(btrim(name)) between 1 and 50),
  birth_date  date check (birth_date <= current_date and birth_date >= date '1980-01-01'),
  breed       text check (char_length(breed) <= 100),
  sex         text check (sex in ('female', 'male')),
  weight_kg   numeric(5, 2) check (weight_kg > 0 and weight_kg < 200),
  notes       text check (char_length(notes) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index pets_owner_id_idx on public.pets (owner_id);

comment on column public.pets.species is 'cat = kedi, dog = köpek';
comment on column public.pets.sex is 'female = dişi, male = erkek (isteğe bağlı)';


-- updated_at alanını otomatik güncelle
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger pets_set_updated_at before update on public.pets
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- Erişim izinleri
-- Giriş yapmamış (anon) kullanıcılar hiçbir tabloya erişemez.
-- Bu aşamada izin verilen işlemler: profili görmek, hayvan eklemek ve
-- görmek. Düzenleme ve silme sonraki aşamada ayrıca eklenecek.
-- ---------------------------------------------------------------------
revoke all on public.profiles from anon, authenticated;
revoke all on public.pets from anon, authenticated;

grant select on public.profiles to authenticated;
grant select, insert on public.pets to authenticated;

alter table public.profiles enable row level security;
alter table public.pets enable row level security;

-- Profil: müşteri kendi profilini, yönetici tüm profilleri okur.
create policy "profil_okuma" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- Hayvan: müşteri kendi hayvanlarını, yönetici tüm hayvanları okur.
create policy "hayvan_okuma" on public.pets
  for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));

-- Hayvan ekleme: müşteri yalnızca kendi adına hayvan ekleyebilir.
-- (Yönetici bu aşamada kayıt eklemez; panel salt okunurdur.)
create policy "hayvan_ekleme" on public.pets
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
