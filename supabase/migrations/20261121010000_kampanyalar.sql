-- =====================================================================
-- Aylık kampanyalar
--
-- Gereksinim belgesi:
-- * Yönetici her kampanya için ürün, indirim türü (yüzde veya sabit fiyat),
--   başlangıç ve bitiş tarihini panelden girer.
-- * Aynı üründe sabit indirim (ilk sipariş %20 / sonrakiler %10) ve kampanya
--   birlikte geçerliyse müşteri için DAHA AVANTAJLI OLAN TEK indirim uygulanır;
--   indirimler birleşmez. Sabit fiyatlı kampanya da sabit indirimle karşılaştırılır.
-- * Ürün listesinde liste fiyatı; sepette ve özette indirimli fiyat gösterilir.
--
-- Uygulama kararları (20.11.2026):
-- * Bir kampanyada birden fazla ürün olabilir. Sabit fiyat her ürün için ayrı girilir.
-- * Kampanya, başlangıç ve bitiş günleri dahil, Türkiye saatine göre geçerlidir.
-- * Sipariş anındaki fiyat siparişe yazılır; kampanya sonradan bitse veya
--   değişse de verilmiş sipariş değişmez.
-- * Eşitlikte sabit indirim (siparişin oranı) uygulanır.
-- =====================================================================

create table public.campaigns (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(btrim(name)) between 1 and 100),
  discount_type    text not null check (discount_type in ('percent', 'fixed_price')),
  percent          numeric(5, 2) check (percent > 0 and percent <= 90),
  start_date       date not null,
  end_date         date not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (end_date >= start_date),
  check ((discount_type = 'percent') = (percent is not null))
);

comment on column public.campaigns.discount_type is 'percent = yüzde indirim, fixed_price = sabit fiyat (ürün bazında)';

create table public.campaign_products (
  campaign_id      uuid not null references public.campaigns (id) on delete cascade,
  product_id       uuid not null references public.products (id) on delete cascade,
  -- Yalnızca sabit fiyatlı kampanyada: o ürünün kampanya fiyatı
  fixed_price_try  numeric(10, 2) check (fixed_price_try > 0),
  primary key (campaign_id, product_id)
);

create index campaign_products_product_idx on public.campaign_products (product_id);
create index campaigns_dates_idx on public.campaigns (start_date, end_date);

create trigger campaigns_set_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();


-- Sipariş kaleminde hangi indirimin uygulandığı
alter table public.order_items
  add column discount_source text not null default 'none'
    check (discount_source in ('none', 'first_order', 'standard', 'campaign')),
  add column campaign_id uuid references public.campaigns (id) on delete set null,
  add column campaign_name text;

update public.order_items oi
   set discount_source = o.discount_kind
  from public.orders o
 where o.id = oi.order_id and oi.discount_pct > 0;

comment on column public.order_items.discount_source is 'Uygulanan indirim: none, first_order (ilk sipariş), standard (sabit), campaign (kampanya)';


-- ---------------------------------------------------------------------
-- Erişim
-- Yönetici tüm kampanyaları görür; müşteri yalnızca BUGÜN geçerli olanları
-- (sepette indirimli fiyatı gösterebilmek için). Yazma yalnızca yönetici
-- işlemleriyle (admin_save_campaign / silme).
-- ---------------------------------------------------------------------
create or replace function public.campaign_is_active(p_campaign uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.campaigns c
    where c.id = p_campaign and public.today_tr() between c.start_date and c.end_date
  );
$$;

revoke all on public.campaigns from anon, authenticated;
revoke all on public.campaign_products from anon, authenticated;
grant select, delete on public.campaigns to authenticated;
grant select on public.campaign_products to authenticated;

alter table public.campaigns enable row level security;
alter table public.campaign_products enable row level security;

create policy "kampanya_okuma" on public.campaigns
  for select to authenticated
  using ((select public.is_admin()) or public.today_tr() between start_date and end_date);

create policy "kampanya_silme_yonetici" on public.campaigns
  for delete to authenticated
  using ((select public.is_admin()));

create policy "kampanya_urun_okuma" on public.campaign_products
  for select to authenticated
  using ((select public.is_admin()) or public.campaign_is_active(campaign_id));


-- ---------------------------------------------------------------------
-- Yönetici: kampanya oluştur / güncelle (tek işlemde, ürünleriyle)
-- products: [{ "product_id": "...", "fixed_price_try": 199.90 }, ...]
-- ---------------------------------------------------------------------
create or replace function public.admin_save_campaign(
  campaign_id uuid,
  name text,
  discount_type text,
  percent numeric,
  start_date date,
  end_date date,
  products jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid uuid := campaign_id;
  it jsonb;
  pid uuid;
  fixed numeric;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.' using errcode = '42501';
  end if;
  if jsonb_typeof(products) <> 'array' or jsonb_array_length(products) = 0 then
    raise exception 'Kampanyaya en az bir ürün ekleyin.';
  end if;
  if discount_type = 'percent' and (percent is null or percent <= 0 or percent > 90) then
    raise exception 'İndirim yüzdesi 0 ile 90 arasında olmalı.';
  end if;

  if cid is null then
    insert into public.campaigns (name, discount_type, percent, start_date, end_date)
    values (btrim(name), discount_type, case when discount_type = 'percent' then percent end, start_date, end_date)
    returning id into cid;
  else
    update public.campaigns c set
      name = btrim(admin_save_campaign.name),
      discount_type = admin_save_campaign.discount_type,
      percent = case when admin_save_campaign.discount_type = 'percent' then admin_save_campaign.percent end,
      start_date = admin_save_campaign.start_date,
      end_date = admin_save_campaign.end_date
    where c.id = cid;
    if not found then
      raise exception 'Kampanya bulunamadı.';
    end if;
    delete from public.campaign_products cp where cp.campaign_id = cid;
  end if;

  for it in select * from jsonb_array_elements(products) loop
    pid := (it ->> 'product_id')::uuid;
    fixed := nullif(it ->> 'fixed_price_try', '')::numeric;
    if discount_type = 'fixed_price' and (fixed is null or fixed <= 0) then
      raise exception 'Sabit fiyatlı kampanyada her ürün için kampanya fiyatı girin.';
    end if;
    insert into public.campaign_products (campaign_id, product_id, fixed_price_try)
    values (cid, pid, case when discount_type = 'fixed_price' then fixed end);
  end loop;

  return cid;
end;
$$;

revoke all on function public.admin_save_campaign(uuid, text, text, numeric, date, date, jsonb) from public, anon;
grant execute on function public.admin_save_campaign(uuid, text, text, numeric, date, date, jsonb) to authenticated;


-- ---------------------------------------------------------------------
-- En avantajlı birim fiyat (tek doğru kaynak; uygulamadaki önizleme aynı kuralı izler)
-- Adaylar: siparişin sabit indirimi ve o gün geçerli kampanyalar. En düşük fiyat
-- seçilir; eşitlikte sabit indirim. İndirimler birleşmez.
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
  with candidates as (
    select public.discounted_price(p_list, p_order_pct) as unit_price,
           case when p_order_pct > 0 then p_order_kind else 'none' end as source,
           p_order_pct as pct,
           null::uuid as campaign_id,
           null::text as campaign_name,
           0 as rank
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
  )
  select unit_price, source, pct, campaign_id, campaign_name
  from candidates
  order by unit_price asc, rank asc, campaign_name asc
  limit 1;
$$;

revoke all on function public.best_unit_price(uuid, numeric, text, numeric, date) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- place_order: her ürün için en avantajlı tek indirim
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
    select * into p from public.products where id = (it ->> 'product_id')::uuid;
    if not found or not p.is_active then
      raise exception 'Sepetteki bir ürün artık satışta değil. Sepetinizi güncelleyin.';
    end if;
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
