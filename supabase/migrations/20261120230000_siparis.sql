-- =====================================================================
-- Sipariş ve teslimat
--
-- Kararlar (gereksinim belgesi + 20.11.2026):
-- * Müşteri kataloğun tamamından sipariş verir; mama kaydı gerekmez. Bir siparişte
--   birden fazla ürün olabilir, adet için üst sınır yoktur (teknik sınır: 9999).
-- * Ödeme uygulamada alınmaz.
-- * Durumlar: Onay bekliyor → Onaylandı → Teslim edildi; İptal edildi.
-- * Katalogdaki tüm ürünler stokta kabul edilir (tedarikçi teyidi adımı yok).
-- * Teslim şekilleri:
--     - Hastaneden teslim alma: kargo ücreti yok, tarih/saat sorulmaz.
--     - Adrese teslimat: kargo ücreti (ayarlardan, başlangıçta 200 TL, yönetici
--       değiştirebilir); müşteri adres, teslimat tarihi ve saatini girer.
-- * Onaydan önce müşteri siparişi iptal edebilir ve teslim şeklini değiştirebilir;
--   kargo ücreti buna göre eklenir/kalkar. Onaydan sonra hastaneyle iletişime geçer.
-- * "Teslim edildi": yönetici (panelden) veya müşteri ("Teslim aldım", yalnızca
--   Onaylandı durumunda) yapabilir.
-- * Fiyatlar ve kargo ücreti sipariş anında siparişe yazılır; sonradan katalog
--   fiyatı veya kargo ücreti değişse de verilmiş siparişler değişmez.
-- * İndirim ve kampanya bu aşamada YOK (sonraki aşama).
--
-- Tüm sipariş işlemleri aşağıdaki fonksiyonlarla yapılır; fiyat ve ücret
-- hesabı sunucuda yapılır, müşteri tablolara doğrudan yazamaz.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Ayarlar (tek satır)
-- ---------------------------------------------------------------------
create table public.app_settings (
  id                  boolean primary key default true check (id),
  shipping_fee_try    numeric(10, 2) not null default 200 check (shipping_fee_try >= 0 and shipping_fee_try < 100000),
  updated_at          timestamptz not null default now()
);

insert into public.app_settings (id) values (true);

create trigger app_settings_set_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to authenticated;
grant update (shipping_fee_try) on public.app_settings to authenticated;

alter table public.app_settings enable row level security;

create policy "ayar_okuma" on public.app_settings
  for select to authenticated using (true);

create policy "ayar_guncelleme_yonetici" on public.app_settings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));


-- ---------------------------------------------------------------------
-- Siparişler
-- ---------------------------------------------------------------------
create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  order_no            bigint generated always as identity (start with 1001) unique,
  customer_id         uuid not null references public.profiles (id) on delete cascade,
  status              text not null default 'pending'
                        check (status in ('pending', 'approved', 'delivered', 'cancelled')),
  delivery_type       text not null check (delivery_type in ('pickup', 'address')),
  delivery_address    text check (char_length(delivery_address) <= 500),
  delivery_date       date,
  delivery_time       time,
  customer_note       text check (char_length(customer_note) <= 500),
  items_total_try     numeric(12, 2) not null check (items_total_try >= 0),
  shipping_fee_try    numeric(10, 2) not null check (shipping_fee_try >= 0),
  total_try           numeric(12, 2) not null check (total_try >= 0),
  status_changed_at   timestamptz not null default now(),
  status_changed_by   text not null default 'customer' check (status_changed_by in ('customer', 'admin')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (
    (delivery_type = 'pickup' and delivery_address is null and delivery_date is null and delivery_time is null)
    or
    (delivery_type = 'address' and char_length(btrim(delivery_address)) >= 5 and delivery_date is not null and delivery_time is not null)
  ),
  check (total_try = items_total_try + shipping_fee_try)
);

create index orders_customer_id_idx on public.orders (customer_id);
create index orders_status_idx on public.orders (status, created_at desc);

create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

comment on column public.orders.status is 'pending = Onay bekliyor, approved = Onaylandı, delivered = Teslim edildi, cancelled = İptal edildi';
comment on column public.orders.delivery_type is 'pickup = Hastaneden teslim alma, address = Adrese teslimat';

create table public.order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.orders (id) on delete cascade,
  product_id            uuid not null references public.products (id),
  -- Sipariş anındaki ürün bilgisi ve fiyatı
  brand                 text not null,
  product_name          text not null,
  package_grams         integer not null,
  unit_price_try        numeric(10, 2) not null check (unit_price_try >= 0),
  quantity              integer not null check (quantity between 1 and 9999),
  line_total_try        numeric(12, 2) not null,
  -- Teslimattan sonra "yeni paketi kullanmaya başladınız mı?" sorusunun cevabı
  new_package_answer    text check (new_package_answer in ('started', 'not_yet')),
  new_package_answered_at timestamptz,
  check (line_total_try = unit_price_try * quantity)
);

create index order_items_order_id_idx on public.order_items (order_id);


-- ---------------------------------------------------------------------
-- Erişim: müşteri kendi siparişlerini, yönetici tümünü OKUR.
-- Yazma işlemleri yalnızca aşağıdaki fonksiyonlarla yapılır.
-- ---------------------------------------------------------------------
revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "siparis_okuma" on public.orders
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));

create policy "siparis_kalem_okuma" on public.order_items
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
  );


-- ---------------------------------------------------------------------
-- Yardımcı: teslimat bilgisini denetler, kargo ücretini döndürür.
-- ---------------------------------------------------------------------
create or replace function public.order_delivery_check(
  p_type text,
  p_address text,
  p_date date,
  p_time time
)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  fee numeric;
begin
  if p_type = 'pickup' then
    return 0;
  elsif p_type = 'address' then
    if p_address is null or char_length(btrim(p_address)) < 5 then
      raise exception 'Adrese teslimat için adres girin.';
    end if;
    if p_date is null or p_time is null then
      raise exception 'Adrese teslimat için teslimat tarihi ve saati girin.';
    end if;
    if (p_date + p_time) <= (now() at time zone 'Europe/Istanbul') then
      raise exception 'Teslimat tarihi ve saati ileri bir zaman olmalı.';
    end if;
    if p_date > public.today_tr() + 90 then
      raise exception 'Teslimat tarihi en fazla 90 gün sonrası olabilir.';
    end if;
    select shipping_fee_try into fee from public.app_settings where id;
    return fee;
  else
    raise exception 'Teslim şekli geçersiz.';
  end if;
end;
$$;

revoke all on function public.order_delivery_check(text, text, date, time) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- Müşteri: sipariş ver
-- items: [{ "product_id": "...", "quantity": 2 }, ...]
-- ---------------------------------------------------------------------
create or replace function public.place_order(
  items jsonb,
  delivery_type text,
  delivery_address text default null,
  delivery_date date default null,
  delivery_time time default null,
  customer_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  fee numeric;
  new_order public.orders;
  it jsonb;
  p public.products;
  qty int;
  items_total numeric := 0;
  seen uuid[] := '{}';
begin
  if uid is null or not exists (select 1 from public.profiles where id = uid) then
    raise exception 'Sipariş vermek için müşteri hesabıyla giriş yapın.' using errcode = '42501';
  end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Sepet boş.';
  end if;
  if jsonb_array_length(items) > 100 then
    raise exception 'Bir siparişte en fazla 100 farklı ürün olabilir.';
  end if;

  fee := public.order_delivery_check(delivery_type, delivery_address, delivery_date, delivery_time);

  insert into public.orders (customer_id, delivery_type, delivery_address, delivery_date, delivery_time,
                             customer_note, items_total_try, shipping_fee_try, total_try)
  values (uid, delivery_type,
          case when delivery_type = 'address' then btrim(delivery_address) end,
          case when delivery_type = 'address' then delivery_date end,
          case when delivery_type = 'address' then delivery_time end,
          nullif(btrim(customer_note), ''), 0, fee, fee)
  returning * into new_order;

  for it in select * from jsonb_array_elements(items) loop
    qty := (it ->> 'quantity')::int;
    if qty is null or qty < 1 or qty > 9999 then
      raise exception 'Ürün adedi 1 ile 9999 arasında olmalı.';
    end if;
    select * into p from public.products where id = (it ->> 'product_id')::uuid;
    if not found or not p.is_active then
      raise exception 'Sepetteki bir ürün artık satışta değil. Sepetinizi güncelleyin.';
    end if;
    if p.id = any (seen) then
      raise exception 'Aynı ürün sepette birden fazla kez var.';
    end if;
    seen := seen || p.id;
    insert into public.order_items (order_id, product_id, brand, product_name, package_grams,
                                    unit_price_try, quantity, line_total_try)
    values (new_order.id, p.id, p.brand, p.name, p.package_grams, p.price_try, qty, p.price_try * qty);
    items_total := items_total + p.price_try * qty;
  end loop;

  update public.orders
     set items_total_try = items_total, total_try = items_total + fee
   where id = new_order.id;

  return jsonb_build_object('id', new_order.id, 'order_no', new_order.order_no);
end;
$$;


-- Müşteri: onaydan önce teslim şeklini/adresini/tarihini değiştir (kargo ücreti yeniden hesaplanır)
create or replace function public.update_order_delivery(
  order_id uuid,
  delivery_type text,
  delivery_address text default null,
  delivery_date date default null,
  delivery_time time default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  fee numeric;
begin
  select * into o from public.orders where id = order_id and customer_id = auth.uid() for update;
  if not found then
    raise exception 'Sipariş bulunamadı.';
  end if;
  if o.status <> 'pending' then
    raise exception 'Onaylanan siparişte değişiklik için hastaneyle iletişime geçin.';
  end if;
  fee := public.order_delivery_check(delivery_type, delivery_address, delivery_date, delivery_time);
  update public.orders set
    delivery_type = update_order_delivery.delivery_type,
    delivery_address = case when update_order_delivery.delivery_type = 'address' then btrim(update_order_delivery.delivery_address) end,
    delivery_date = case when update_order_delivery.delivery_type = 'address' then update_order_delivery.delivery_date end,
    delivery_time = case when update_order_delivery.delivery_type = 'address' then update_order_delivery.delivery_time end,
    shipping_fee_try = fee,
    total_try = o.items_total_try + fee
  where id = o.id;
end;
$$;


-- Müşteri: onaydan önce iptal
create or replace function public.cancel_order(order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = order_id and customer_id = auth.uid() for update;
  if not found then
    raise exception 'Sipariş bulunamadı.';
  end if;
  if o.status <> 'pending' then
    raise exception 'Onaylanan siparişin iptali için hastaneyle iletişime geçin.';
  end if;
  update public.orders
     set status = 'cancelled', status_changed_at = now(), status_changed_by = 'customer'
   where id = o.id;
end;
$$;


-- Müşteri: "Teslim aldım" (yalnızca Onaylandı durumunda)
create or replace function public.confirm_received(order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = order_id and customer_id = auth.uid() for update;
  if not found then
    raise exception 'Sipariş bulunamadı.';
  end if;
  if o.status <> 'approved' then
    raise exception '"Teslim aldım" yalnızca onaylanmış siparişte kullanılabilir.';
  end if;
  update public.orders
     set status = 'delivered', status_changed_at = now(), status_changed_by = 'customer'
   where id = o.id;
end;
$$;


-- Müşteri: teslimattan sonra "yeni paketi kullanmaya başladınız mı?" cevabı.
-- "started" ise o ürüne ait mama kayıtlarının sayacı bugünden, siparişteki adetle başlar.
create or replace function public.answer_new_package(order_item_id uuid, answer text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  it public.order_items;
  o public.orders;
  updated int := 0;
begin
  if answer not in ('started', 'not_yet') then
    raise exception 'Geçersiz cevap.';
  end if;
  select * into it from public.order_items where id = order_item_id;
  select * into o from public.orders where id = it.order_id and customer_id = auth.uid();
  if not found then
    raise exception 'Sipariş bulunamadı.';
  end if;
  if o.status <> 'delivered' then
    raise exception 'Bu soru yalnızca teslim edilen siparişler için cevaplanabilir.';
  end if;
  update public.order_items
     set new_package_answer = answer, new_package_answered_at = now()
   where id = it.id;
  if answer = 'started' then
    update public.food_records
       set start_date = public.today_tr(),
           package_count = least(it.quantity, 50)
     where owner_id = o.customer_id and product_id = it.product_id;
    get diagnostics updated = row_count;
  end if;
  return updated;
end;
$$;


-- Yönetici: durum değiştir
-- İzin verilen geçişler: Onay bekliyor → Onaylandı / İptal edildi;
--                        Onaylandı → Teslim edildi / İptal edildi.
create or replace function public.admin_set_order_status(order_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.' using errcode = '42501';
  end if;
  select * into o from public.orders where id = order_id for update;
  if not found then
    raise exception 'Sipariş bulunamadı.';
  end if;
  if not (
    (o.status = 'pending' and new_status in ('approved', 'cancelled'))
    or (o.status = 'approved' and new_status in ('delivered', 'cancelled'))
  ) then
    raise exception 'Bu durum değişikliği yapılamaz.';
  end if;
  update public.orders
     set status = new_status, status_changed_at = now(), status_changed_by = 'admin'
   where id = o.id;
end;
$$;


revoke all on function public.place_order(jsonb, text, text, date, time, text) from public, anon;
revoke all on function public.update_order_delivery(uuid, text, text, date, time) from public, anon;
revoke all on function public.cancel_order(uuid) from public, anon;
revoke all on function public.confirm_received(uuid) from public, anon;
revoke all on function public.answer_new_package(uuid, text) from public, anon;
revoke all on function public.admin_set_order_status(uuid, text) from public, anon;

grant execute on function public.place_order(jsonb, text, text, date, time, text) to authenticated;
grant execute on function public.update_order_delivery(uuid, text, text, date, time) to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;
grant execute on function public.confirm_received(uuid) to authenticated;
grant execute on function public.answer_new_package(uuid, text) to authenticated;
grant execute on function public.admin_set_order_status(uuid, text) to authenticated;
