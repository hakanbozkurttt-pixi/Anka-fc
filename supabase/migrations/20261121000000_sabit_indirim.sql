-- =====================================================================
-- Sabit indirim (karar: 20.11.2026, gereksinim belgesindeki "tek oran" kararının yerine)
--
-- * Yeni müşterinin ilk siparişinde %20, sonraki tüm siparişlerde %10.
-- * "İlk sipariş": müşterinin iptal edilmemiş başka siparişi yoksa. İlk sipariş
--   iptal edilirse sonraki sipariş yine ilk sipariş sayılır.
-- * İndirim yalnızca ürünlere uygulanır; kargo ücretine uygulanmaz.
-- * Oranları yönetici panelden değiştirebilir; değişiklik yalnızca yeni
--   siparişlere uygulanır (oran ve fiyatlar sipariş anında sabitlenir).
-- * Kampanyalar sonraki aşamada eklenecek (indirimler birleşmez, avantajlı olan uygulanır).
-- =====================================================================

alter table public.app_settings
  add column first_order_discount_pct numeric(5, 2) not null default 20
    check (first_order_discount_pct >= 0 and first_order_discount_pct <= 90),
  add column standard_discount_pct numeric(5, 2) not null default 10
    check (standard_discount_pct >= 0 and standard_discount_pct <= 90);

grant update (first_order_discount_pct, standard_discount_pct) on public.app_settings to authenticated;

-- Sipariş: hangi indirim uygulandı ve indirim öncesi tutar
alter table public.orders
  add column discount_kind text not null default 'none' check (discount_kind in ('none', 'first_order', 'standard')),
  add column discount_pct numeric(5, 2) not null default 0 check (discount_pct >= 0 and discount_pct <= 90),
  add column items_list_total_try numeric(12, 2),
  add column discount_total_try numeric(12, 2) not null default 0 check (discount_total_try >= 0);

update public.orders set items_list_total_try = items_total_try where items_list_total_try is null;
alter table public.orders alter column items_list_total_try set not null;
alter table public.orders add check (items_total_try = items_list_total_try - discount_total_try);

comment on column public.orders.items_total_try is 'Ürünler toplamı (indirim sonrası)';
comment on column public.orders.items_list_total_try is 'Ürünler toplamı (liste fiyatıyla, indirim öncesi)';

-- Sipariş kalemi: liste fiyatı ve indirimli birim fiyat
alter table public.order_items
  add column list_price_try numeric(10, 2),
  add column discount_pct numeric(5, 2) not null default 0;

update public.order_items set list_price_try = unit_price_try where list_price_try is null;
alter table public.order_items alter column list_price_try set not null;
alter table public.order_items add check (unit_price_try <= list_price_try);

comment on column public.order_items.unit_price_try is 'İndirimli birim fiyat (sipariş anında sabitlenir)';
comment on column public.order_items.list_price_try is 'Sipariş anındaki katalog (liste) fiyatı';


-- ---------------------------------------------------------------------
-- Müşterinin bir sonraki siparişine uygulanacak indirim
-- ---------------------------------------------------------------------
create or replace function public.discount_for_customer(p_customer uuid)
returns table (kind text, pct numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when first_order then 'first_order' else 'standard' end,
    case when first_order then s.first_order_discount_pct else s.standard_discount_pct end
  from public.app_settings s,
       lateral (select not exists (
         select 1 from public.orders o where o.customer_id = p_customer and o.status <> 'cancelled'
       ) as first_order) f
  where s.id;
$$;

revoke all on function public.discount_for_customer(uuid) from public, anon, authenticated;

-- Müşteri uygulaması sepette göstermek için çağırır (yalnızca kendisi için).
create or replace function public.my_order_discount()
returns table (kind text, pct numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.discount_for_customer(auth.uid());
$$;

revoke all on function public.my_order_discount() from public, anon;
grant execute on function public.my_order_discount() to authenticated;


-- İndirimli birim fiyat (kuruşa yuvarlanır). Uygulamadaki önizleme aynı kuralı kullanır.
create or replace function public.discounted_price(p_list numeric, p_pct numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select round(p_list * (100 - p_pct) / 100, 2);
$$;


-- ---------------------------------------------------------------------
-- place_order: indirimle yeniden tanımlanır
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
  new_order public.orders;
  it jsonb;
  p public.products;
  qty int;
  unit numeric;
  list_total numeric := 0;
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

  -- Aynı müşterinin eşzamanlı iki siparişinin ikisi de "ilk sipariş" sayılmasın.
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
    unit := public.discounted_price(p.price_try, d.pct);
    insert into public.order_items (order_id, product_id, brand, product_name, package_grams,
                                    list_price_try, discount_pct, unit_price_try, quantity, line_total_try)
    values (new_order.id, p.id, p.brand, p.name, p.package_grams,
            p.price_try, d.pct, unit, qty, unit * qty);
    list_total := list_total + p.price_try * qty;
    items_total := items_total + unit * qty;
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
