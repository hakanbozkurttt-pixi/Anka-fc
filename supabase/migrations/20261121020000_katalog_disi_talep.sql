-- =====================================================================
-- Katalog dışı ürün talebi
--
-- Kararlar (gereksinim belgesi + 21.11.2026):
-- * Müşteri "Katalog dışı ürün talebi" düğmesiyle en fazla 160 karakterlik bir
--   mesaj gönderir; mesaj yöneticiye iletilir.
-- * Yönetici talebi görür; onaylarken ürün bilgisini (marka, ad, tür, paket gramı)
--   ve FİYATI girer (fiyat girilmeden onaylanamaz) ya da reddeder.
-- * Talep sipariş değildir; sipariş durumları kullanılmaz.
-- * Onaylanan ürün kataloğa eklenmez; yalnızca talebi giren müşteri görür ve
--   hem mama takibi için ekleyebilir hem sipariş verebilir.
-- * Bu ürünlerde sabit indirim ve kampanya UYGULANMAZ; yöneticinin girdiği fiyat nihaidir.
-- * Beş marka sınırı yalnızca katalog için geçerlidir.
-- * Her talep ayrı değerlendirilir. Yönetici fiyatı sonradan değiştirebilir
--   (yalnızca yeni siparişlere uygulanır). Sonuç müşteriye uygulama açılınca gösterilir.
--
-- Teknik: Onaylanan ürün products tablosuna "müşteriye özel" (owner_customer_id dolu)
-- olarak eklenir; böylece mama takibi ve sipariş mevcut kurallarla çalışır.
-- =====================================================================

alter table public.products
  add column owner_customer_id uuid references public.profiles (id) on delete cascade;

comment on column public.products.owner_customer_id is 'Doluysa: katalog dışı talep sonucu yalnızca bu müşteriye özel ürün (katalogda görünmez, indirim uygulanmaz)';

create index products_owner_idx on public.products (owner_customer_id) where owner_customer_id is not null;

-- Beş marka sınırı yalnızca katalog ürünleri için
alter table public.products drop constraint products_brand_check;
alter table public.products add constraint products_brand_check check (
  owner_customer_id is not null
  or brand in ('Proplan', 'Hill''s', 'Royal Canin', 'Virbac', 'Carni')
);
alter table public.products add constraint products_private_brand_check check (
  owner_customer_id is null or char_length(btrim(brand)) between 1 and 100
);

-- Okuma: müşteri aktif katalog ürünlerini ve YALNIZCA KENDİSİNE özel ürünleri görür.
drop policy "urun_okuma" on public.products;
create policy "urun_okuma" on public.products
  for select to authenticated
  using (
    (is_active and (owner_customer_id is null or owner_customer_id = (select auth.uid())))
    or (select public.is_admin())
  );


-- ---------------------------------------------------------------------
-- Talepler
-- ---------------------------------------------------------------------
create table public.product_requests (
  id            uuid primary key default gen_random_uuid(),
  request_no    bigint generated always as identity (start with 1) unique,
  customer_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  message       text not null check (char_length(btrim(message)) between 1 and 160),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  product_id    uuid references public.products (id) on delete set null,
  decided_at    timestamptz,
  created_at    timestamptz not null default now(),
  check ((status = 'pending') = (decided_at is null))
  -- Not: Onaylanan talebe ürün bağlanması admin_approve_request ile sağlanır. Ürün sonradan
  -- silinirse (ör. müşteri hesabı silindiğinde) talep kaydı ürünsüz kalabilir.
);

create index product_requests_customer_idx on public.product_requests (customer_id);
create index product_requests_status_idx on public.product_requests (status, created_at desc);

comment on column public.product_requests.status is 'pending = Değerlendiriliyor, approved = Onaylandı, rejected = Reddedildi';

revoke all on public.product_requests from anon, authenticated;
grant select on public.product_requests to authenticated;
grant insert (message) on public.product_requests to authenticated;

alter table public.product_requests enable row level security;

create policy "talep_okuma" on public.product_requests
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));

-- Müşteri yalnızca kendi adına talep girer (müşteri profili olan hesaplar).
create policy "talep_ekleme" on public.product_requests
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()))
  );

-- Mesaj baştaki/sondaki boşluklardan arındırılır.
create or replace function public.product_requests_trim()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.message := btrim(new.message);
  return new;
end;
$$;

create trigger product_requests_trim before insert on public.product_requests
  for each row execute function public.product_requests_trim();


-- Yönetici: onayla (ürün bilgisi + fiyat zorunlu) → müşteriye özel ürün oluşur
create or replace function public.admin_approve_request(
  request_id uuid,
  brand text,
  name text,
  species text,
  package_grams integer,
  price_try numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.product_requests;
  pid uuid;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.' using errcode = '42501';
  end if;
  select * into r from public.product_requests where id = request_id for update;
  if not found then
    raise exception 'Talep bulunamadı.';
  end if;
  if r.status <> 'pending' then
    raise exception 'Bu talep zaten sonuçlandırılmış.';
  end if;
  if price_try is null or price_try <= 0 then
    raise exception 'Fiyat girilmeden talep onaylanamaz.';
  end if;

  insert into public.products (brand, name, species, package_grams, price_try, owner_customer_id, is_active)
  values (btrim(brand), btrim(name), species, package_grams, price_try, r.customer_id, true)
  returning id into pid;

  update public.product_requests
     set status = 'approved', product_id = pid, decided_at = now()
   where id = r.id;
  return pid;
end;
$$;

-- Yönetici: reddet
create or replace function public.admin_reject_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.product_requests;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.' using errcode = '42501';
  end if;
  select * into r from public.product_requests where id = request_id for update;
  if not found then
    raise exception 'Talep bulunamadı.';
  end if;
  if r.status <> 'pending' then
    raise exception 'Bu talep zaten sonuçlandırılmış.';
  end if;
  update public.product_requests set status = 'rejected', decided_at = now() where id = r.id;
end;
$$;

revoke all on function public.admin_approve_request(uuid, text, text, text, integer, numeric) from public, anon;
revoke all on function public.admin_reject_request(uuid) from public, anon;
grant execute on function public.admin_approve_request(uuid, text, text, text, integer, numeric) to authenticated;
grant execute on function public.admin_reject_request(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- Fiyat: müşteriye özel üründe indirim ve kampanya yok
-- ---------------------------------------------------------------------
create or replace function public.best_unit_price(
  p_product uuid,
  p_list numeric,
  p_order_kind text,
  p_order_pct numeric,
  p_today date
)
returns table (unit_price numeric, source text, pct numeric, campaign_id uuid, campaign_name text)
language sql
stable
security definer
set search_path = ''
as $$
  with private as (
    select exists (select 1 from public.products where id = p_product and owner_customer_id is not null) as is_private
  ),
  candidates as (
    select public.discounted_price(p_list, p_order_pct) as unit_price,
           case when p_order_pct > 0 then p_order_kind else 'none' end as source,
           p_order_pct as pct,
           null::uuid as campaign_id,
           null::text as campaign_name,
           0 as rank
    where not (select is_private from private)
    union all
    select case when c.discount_type = 'percent'
                then public.discounted_price(p_list, c.percent)
                else least(p_list, cp.fixed_price_try) end,
           'campaign',
           case when c.discount_type = 'percent' then c.percent else 0 end,
           c.id,
           c.name,
           1
    from public.campaign_products cp
    join public.campaigns c on c.id = cp.campaign_id
    where cp.product_id = p_product
      and p_today between c.start_date and c.end_date
      and not (select is_private from private)
    union all
    -- Müşteriye özel ürün: yöneticinin girdiği fiyat nihai
    select p_list, 'none', 0, null, null, 2
    where (select is_private from private)
  )
  select unit_price, source, pct, campaign_id, campaign_name
  from candidates
  order by unit_price asc, rank asc, campaign_name asc
  limit 1;
$$;


-- place_order: müşteriye özel ürün yalnızca sahibi tarafından sipariş edilebilir.
-- (Ürün okuma işlemi security definer olduğu için ayrıca denetlenir.)
create or replace function public.order_product_allowed(p_product uuid, p_customer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.products
    where id = p_product and is_active and (owner_customer_id is null or owner_customer_id = p_customer)
  );
$$;

revoke all on function public.order_product_allowed(uuid, uuid) from public, anon, authenticated;

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
  d record;
  b record;
  new_order public.orders;
  it jsonb;
  p public.products;
  qty int;
  list_total numeric := 0;
  items_total numeric := 0;
  seen uuid[] := '{}';
  today date := public.today_tr();
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

  perform pg_advisory_xact_lock(hashtext('place_order:' || uid::text));

  fee := public.order_delivery_check(delivery_type, delivery_address, delivery_date, delivery_time);
  select * into d from public.discount_for_customer(uid);

  insert into public.orders (customer_id, delivery_type, delivery_address, delivery_date, delivery_time,
                             customer_note, discount_kind, discount_pct,
                             items_list_total_try, discount_total_try, items_total_try, shipping_fee_try, total_try)
  values (uid, delivery_type,
          case when delivery_type = 'address' then btrim(delivery_address) end,
          case when delivery_type = 'address' then delivery_date end,
          case when delivery_type = 'address' then delivery_time end,
          nullif(btrim(customer_note), ''),
          case when d.pct > 0 then d.kind else 'none' end, d.pct,
          0, 0, 0, fee, fee)
  returning * into new_order;

  for it in select * from jsonb_array_elements(items) loop
    qty := (it ->> 'quantity')::int;
    if qty is null or qty < 1 or qty > 9999 then
      raise exception 'Ürün adedi 1 ile 9999 arasında olmalı.';
    end if;
    if not public.order_product_allowed((it ->> 'product_id')::uuid, uid) then
      raise exception 'Sepetteki bir ürün artık satışta değil. Sepetinizi güncelleyin.';
    end if;
    select * into p from public.products where id = (it ->> 'product_id')::uuid;
    if p.id = any (seen) then
      raise exception 'Aynı ürün sepette birden fazla kez var.';
    end if;
    seen := seen || p.id;

    select * into b from public.best_unit_price(p.id, p.price_try, d.kind, d.pct, today);

    insert into public.order_items (order_id, product_id, brand, product_name, package_grams,
                                    list_price_try, discount_pct, discount_source, campaign_id, campaign_name,
                                    unit_price_try, quantity, line_total_try)
    values (new_order.id, p.id, p.brand, p.name, p.package_grams,
            p.price_try, b.pct, b.source, b.campaign_id, b.campaign_name,
            b.unit_price, qty, b.unit_price * qty);
    list_total := list_total + p.price_try * qty;
    items_total := items_total + b.unit_price * qty;
  end loop;

  update public.orders
     set items_list_total_try = list_total,
         discount_total_try = list_total - items_total,
         items_total_try = items_total,
         total_try = items_total + fee
   where id = new_order.id;

  return jsonb_build_object('id', new_order.id, 'order_no', new_order.order_no,
                            'discount_kind', d.kind, 'discount_pct', d.pct);
end;
$$;


-- Kampanyalara müşteriye özel ürün eklenemez
create or replace function public.campaign_products_catalog_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.products where id = new.product_id and owner_customer_id is not null) then
    raise exception 'Katalog dışı (müşteriye özel) ürünler kampanyaya eklenemez.';
  end if;
  return new;
end;
$$;

create trigger campaign_products_catalog_only before insert or update on public.campaign_products
  for each row execute function public.campaign_products_catalog_only();
