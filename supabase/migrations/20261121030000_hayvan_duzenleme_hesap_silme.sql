-- =====================================================================
-- Hayvan profilini düzenleme/silme ve hesap silme
--
-- Kararlar (gereksinim belgesi + 21.11.2026):
-- * Müşteri hayvan profilini düzenleyebilir ve silebilir. Silinen hayvanın mama
--   kayıtları da silinir (hatırlatmalar durur).
-- * Müşteri hesabını silebilir. Geçmiş siparişler hastane kayıtlarında kalır;
--   müşterinin uygulamadaki sipariş geçmişine erişimi sona erer.
-- * "Onay bekliyor" veya "Onaylandı" durumunda siparişi olan müşteri hesabını
--   silemez (önce iptal eder / hastaneyle görüşür).
-- * Siparişlerde, sipariş anındaki müşteri adı, telefonu ve e-postası saklanır;
--   hesap silinince sipariş bu bilgilerle hastanede kalır. Diğer tüm kişisel
--   veriler (profil, hayvanlar, mama kayıtları, KVKK onayları, talepler,
--   müşteriye özel ürünler) silinir.
--   NOT: Bu bilgilerin saklama süresi KVKK açısından hukuki görüşe bağlıdır.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Hayvan: düzenleme ve silme (yalnızca sahibi)
-- ---------------------------------------------------------------------
grant update (species, name, birth_date, breed, sex, weight_kg, notes) on public.pets to authenticated;
grant delete on public.pets to authenticated;

create policy "hayvan_guncelleme" on public.pets
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "hayvan_silme" on public.pets
  for delete to authenticated
  using (owner_id = (select auth.uid()));


-- ---------------------------------------------------------------------
-- Siparişler hesap silinince hastanede kalır
-- ---------------------------------------------------------------------
alter table public.orders
  add column customer_name text,
  add column customer_phone text,
  add column customer_email text;

update public.orders o
   set customer_name = p.first_name || ' ' || p.last_name,
       customer_phone = p.phone,
       customer_email = p.email
  from public.profiles p
 where p.id = o.customer_id;

alter table public.orders alter column customer_id drop not null;
alter table public.orders drop constraint orders_customer_id_fkey;
alter table public.orders add constraint orders_customer_id_fkey
  foreign key (customer_id) references public.profiles (id) on delete set null;

comment on column public.orders.customer_id is 'Boşsa müşteri hesabını silmiştir; sipariş, customer_name/phone/email kopyasıyla hastanede kalır.';

-- Sipariş oluşturulurken müşteri bilgisinin kopyası yazılır.
create or replace function public.orders_customer_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.first_name || ' ' || p.last_name, p.phone, p.email
    into new.customer_name, new.customer_phone, new.customer_email
    from public.profiles p
   where p.id = new.customer_id;
  return new;
end;
$$;

create trigger orders_customer_snapshot before insert on public.orders
  for each row execute function public.orders_customer_snapshot();

-- Sipariş kalemi ürün kopyasını (marka, ad, gram, fiyat) zaten taşır; ürün silinirse bağlantı boşalır.
alter table public.order_items alter column product_id drop not null;
alter table public.order_items drop constraint order_items_product_id_fkey;
alter table public.order_items add constraint order_items_product_id_fkey
  foreign key (product_id) references public.products (id) on delete set null;

-- Ürün silinirse (yalnızca müşteriye özel ürünler hesapla birlikte silinir) mama kaydı da silinir.
alter table public.food_records drop constraint food_records_product_id_fkey;
alter table public.food_records add constraint food_records_product_id_fkey
  foreign key (product_id) references public.products (id) on delete cascade;


-- ---------------------------------------------------------------------
-- Müşteri: hesabımı sil
-- ---------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or not exists (select 1 from public.profiles where id = uid) then
    raise exception 'Silinecek müşteri hesabı bulunamadı.' using errcode = '42501';
  end if;
  if exists (select 1 from public.orders where customer_id = uid and status in ('pending', 'approved')) then
    raise exception 'Bekleyen siparişiniz varken hesabınızı silemezsiniz. Onay bekleyen siparişi iptal edin; onaylanmış sipariş için hastaneyle iletişime geçin.';
  end if;
  -- Giriş hesabı silinir; profil, hayvanlar, mama kayıtları, KVKK onayları, talepler ve
  -- müşteriye özel ürünler zincirleme silinir. Siparişler kopya bilgilerle kalır.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
