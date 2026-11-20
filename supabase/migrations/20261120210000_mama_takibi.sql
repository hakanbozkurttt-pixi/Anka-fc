-- =====================================================================
-- Mama takibi
--
-- Müşteri bir hayvanı için katalogdan mama seçer; paket sayısını, günlük
-- tüketimi (gram) ve başlangıç tarihini girer. Sistem tahmini bitiş ve
-- hatırlatma tarihini hesaplar.
--
-- Kararlar (20.11.2026):
-- * Süre = (paket gramı × paket sayısı) ÷ günlük gram, tam gün (aşağı yuvarlanır).
--   Örnek: 1.500 g ÷ 60 g = 25 gün; 2 × 1.500 g ÷ 60 g = 50 gün.
-- * Hatırlatma, müşteri değiştirmezse bitişten 5 gün önce. Müşteri 1-20 gün
--   arasında seçebilir ve kayıt bazında kapatabilir.
-- * Mama bitince sayaç kendiliğinden aynı paket(ler)le yeniden başlar.
--   Müşteri "yeni paketi başlattım" derse sayaç o günden başlar.
-- * Hatırlatma SİPARİŞ OLUŞTURMAZ; yalnızca hatırlatmadır.
-- * Tarihler Türkiye saatine göredir.
--
-- Bu aşamada telefona bildirim gönderilmez; hatırlatma tarihi hesaplanır ve
-- uygulamada gösterilir. Bildirim gönderimi sonraki aşamada bu hesaba bağlanacak.
-- =====================================================================

create table public.food_records (
  id                    uuid primary key default gen_random_uuid(),
  pet_id                uuid not null references public.pets (id) on delete cascade,
  owner_id              uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  product_id            uuid not null references public.products (id),
  -- Kayıt anındaki ürün bilgisi (katalog sonradan değişse de müşterinin takibi bozulmaz).
  brand                 text not null,
  product_name          text not null,
  package_grams         integer not null check (package_grams > 0),
  package_count         integer not null default 1 check (package_count between 1 and 50),
  daily_grams           integer not null check (daily_grams between 1 and 5000),
  start_date            date not null,
  reminder_enabled      boolean not null default true,
  reminder_days_before  integer not null default 5 check (reminder_days_before between 1 and 20),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (daily_grams <= package_grams * package_count),
  check (start_date >= date '2000-01-01')
);

create index food_records_pet_id_idx on public.food_records (pet_id);
create index food_records_owner_id_idx on public.food_records (owner_id);

comment on table public.food_records is 'Müşterinin hayvanı için mama takip kaydı. Günlük tüketim burada tutulur, katalogda değil.';

create trigger food_records_set_updated_at before update on public.food_records
  for each row execute function public.set_updated_at();


-- Türkiye saatine göre bugün
create or replace function public.today_tr()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Istanbul')::date;
$$;


-- Kayıt eklenirken ürün bilgisini katalogdan kopyala; başlangıç tarihini denetle.
create or replace function public.food_records_prepare()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  p record;
begin
  if tg_op = 'INSERT' then
    select brand, name, package_grams, is_active into p
      from public.products where id = new.product_id;
    if not found or not p.is_active then
      raise exception 'Seçilen mama katalogda bulunamadı veya satışta değil.';
    end if;
    new.brand := p.brand;
    new.product_name := p.name;
    new.package_grams := p.package_grams;
  end if;

  if new.start_date > public.today_tr() then
    raise exception 'Başlangıç tarihi bugünden sonra olamaz.';
  end if;

  return new;
end;
$$;

create trigger food_records_prepare before insert or update on public.food_records
  for each row execute function public.food_records_prepare();


-- ---------------------------------------------------------------------
-- Hesaplama (tek doğru kaynak)
-- supply_days   : bir döngüde mamanın yettiği gün sayısı
-- cycle_number  : kaçıncı döngü (mama bitince sayaç yeniden başlar)
-- cycle_start   : bu döngünün başlangıcı
-- end_date      : tahmini bitiş (mamanın biteceği gün)
-- reminder_date : hatırlatma günü (bitişten N gün önce, döngü başından önce olamaz)
-- days_left     : bitişe kalan gün
-- ---------------------------------------------------------------------
create or replace function public.food_schedule(
  p_start date,
  p_total_grams integer,
  p_daily_grams integer,
  p_reminder_days integer,
  p_today date
)
returns table (
  supply_days integer,
  cycle_number integer,
  cycle_start date,
  end_date date,
  reminder_date date,
  days_left integer
)
language sql
immutable
set search_path = ''
as $$
  with d as (
    select greatest(1, p_total_grams / p_daily_grams) as sd
  ),
  c as (
    select sd,
           case when p_today < p_start then 0 else (p_today - p_start) / sd end as k
    from d
  )
  select sd,
         k + 1,
         p_start + k * sd,
         p_start + (k + 1) * sd,
         greatest(p_start + k * sd, p_start + (k + 1) * sd - p_reminder_days),
         (p_start + (k + 1) * sd) - p_today
  from c;
$$;


-- Kayıtlar + güncel hesap. Erişim kuralları alttaki tablodan gelir (security_invoker).
create view public.food_records_with_schedule
with (security_invoker = true) as
select
  r.*,
  r.package_grams * r.package_count as total_grams,
  s.supply_days,
  s.cycle_number,
  s.cycle_start,
  s.end_date,
  s.reminder_date,
  s.days_left
from public.food_records r
cross join lateral public.food_schedule(
  r.start_date,
  r.package_grams * r.package_count,
  r.daily_grams,
  r.reminder_days_before,
  public.today_tr()
) s;


-- ---------------------------------------------------------------------
-- Erişim izinleri
-- Müşteri yalnızca kendi hayvanları için kayıt ekler, görür, değiştirir, siler.
-- Ürün bilgisi (marka, ad, paket gramı) müşteri tarafından yazılamaz.
-- Yönetici kayıtları yalnızca okuyabilir.
-- ---------------------------------------------------------------------
revoke all on public.food_records from anon, authenticated;
revoke all on public.food_records_with_schedule from anon, authenticated;

grant select, delete on public.food_records to authenticated;
grant insert (pet_id, product_id, package_count, daily_grams, start_date, reminder_enabled, reminder_days_before)
  on public.food_records to authenticated;
grant update (package_count, daily_grams, start_date, reminder_enabled, reminder_days_before)
  on public.food_records to authenticated;
grant select on public.food_records_with_schedule to authenticated;

alter table public.food_records enable row level security;

create policy "mama_okuma" on public.food_records
  for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));

create policy "mama_ekleme" on public.food_records
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = (select auth.uid()))
  );

create policy "mama_guncelleme" on public.food_records
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "mama_silme" on public.food_records
  for delete to authenticated
  using (owner_id = (select auth.uid()));
