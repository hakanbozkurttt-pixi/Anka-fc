-- =====================================================================
-- Mama ürün kataloğu
--
-- * Her paket boyutu ayrı bir üründür (ör. aynı mamanın 1,5 kg ve 3 kg
--   paketleri iki ayrı satır).
-- * Katalogda stok bilgisi TUTULMAZ (gereksinim kararı: yönetici stoğu
--   elle kontrol eder).
-- * Günlük tüketim miktarı katalogda DEĞİLDİR; o, müşterinin hayvanı için
--   gireceği mama takip bilgisidir.
-- * Ürünü yalnızca yönetici ekler ve düzenler. Ürün silinmez; satıştan
--   kaldırmak için "pasif" yapılır (ileride siparişlerde geçmiş korunur).
-- * Müşteriler yalnızca aktif ürünleri görebilir.
-- =====================================================================

create table public.products (
  id              uuid primary key default gen_random_uuid(),
  brand           text not null check (brand in ('Proplan', 'Hill''s', 'Royal Canin', 'Virbac', 'Carni')),
  name            text not null check (char_length(btrim(name)) between 1 and 200),
  species         text not null check (species in ('cat', 'dog', 'both')),
  series          text check (char_length(series) <= 100),
  flavor          text check (char_length(flavor) <= 100),
  age_group       text check (char_length(age_group) <= 100),
  package_grams   integer not null check (package_grams between 1 and 100000),
  price_try       numeric(10, 2) not null check (price_try > 0 and price_try < 1000000),
  -- Barkod veya ürün kodu (varsa). Doluysa katalogda benzersizdir.
  code            text check (code is null or char_length(btrim(code)) between 1 and 64),
  description     text check (char_length(description) <= 2000),
  -- Görselin "product-images" deposundaki yolu.
  image_path      text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.products is 'Mama kataloğu. Her paket boyutu ayrı satırdır. Stok ve günlük tüketim bilgisi burada tutulmaz.';
comment on column public.products.species is 'cat = kedi, dog = köpek, both = her ikisi';
comment on column public.products.code is 'Barkod veya ürün kodu (isteğe bağlı, doluysa benzersiz)';

-- Aynı barkod/ürün kodu iki kez kaydedilemez (büyük/küçük harf ve baştaki/sondaki boşluk fark etmez).
create unique index products_code_unique on public.products (lower(btrim(code))) where code is not null;
create index products_brand_idx on public.products (brand);

create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- Erişim izinleri
-- ---------------------------------------------------------------------
revoke all on public.products from anon, authenticated;
grant select, insert, update on public.products to authenticated;

alter table public.products enable row level security;

-- Müşteri yalnızca aktif ürünleri, yönetici tüm ürünleri görür.
create policy "urun_okuma" on public.products
  for select to authenticated
  using (is_active or (select public.is_admin()));

create policy "urun_ekleme_yonetici" on public.products
  for insert to authenticated
  with check ((select public.is_admin()));

create policy "urun_guncelleme_yonetici" on public.products
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));


-- ---------------------------------------------------------------------
-- Toplu içe aktarma
-- Dosyadaki tüm satırlar tek işlemde kaydedilir: bir satır bile
-- kaydedilemezse hiçbiri kaydedilmez (yarım yükleme olmaz).
-- "id" alanı dolu olan satırlar o ürünü günceller (yönetici önizlemede
-- onayladıktan sonra), boş olanlar yeni ürün olarak eklenir.
-- Fonksiyon çağıranın yetkisiyle çalışır; yönetici değilse erişim
-- kuralları (RLS) kaydı reddeder.
-- ---------------------------------------------------------------------
create or replace function public.import_products(rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r jsonb;
  inserted int := 0;
  updated int := 0;
  affected int;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.' using errcode = '42501';
  end if;

  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) = 0 then
    raise exception 'İçe aktarılacak satır yok.';
  end if;

  if jsonb_array_length(rows) > 5000 then
    raise exception 'Tek seferde en fazla 5000 satır yüklenebilir.';
  end if;

  for r in select * from jsonb_array_elements(rows) loop
    if coalesce(r ->> 'id', '') <> '' then
      update public.products set
        brand         = r ->> 'brand',
        name          = btrim(r ->> 'name'),
        species       = r ->> 'species',
        series        = nullif(btrim(r ->> 'series'), ''),
        flavor        = nullif(btrim(r ->> 'flavor'), ''),
        age_group     = nullif(btrim(r ->> 'age_group'), ''),
        package_grams = (r ->> 'package_grams')::integer,
        price_try     = (r ->> 'price_try')::numeric,
        code          = nullif(btrim(r ->> 'code'), ''),
        description   = nullif(btrim(r ->> 'description'), ''),
        is_active     = coalesce((r ->> 'is_active')::boolean, true)
      where id = (r ->> 'id')::uuid;
      get diagnostics affected = row_count;
      if affected = 0 then
        raise exception 'Güncellenecek ürün bulunamadı.';
      end if;
      updated := updated + 1;
    else
      insert into public.products
        (brand, name, species, series, flavor, age_group, package_grams, price_try, code, description, is_active)
      values (
        r ->> 'brand',
        btrim(r ->> 'name'),
        r ->> 'species',
        nullif(btrim(r ->> 'series'), ''),
        nullif(btrim(r ->> 'flavor'), ''),
        nullif(btrim(r ->> 'age_group'), ''),
        (r ->> 'package_grams')::integer,
        (r ->> 'price_try')::numeric,
        nullif(btrim(r ->> 'code'), ''),
        nullif(btrim(r ->> 'description'), ''),
        coalesce((r ->> 'is_active')::boolean, true)
      );
      inserted := inserted + 1;
    end if;
  end loop;

  return jsonb_build_object('inserted', inserted, 'updated', updated);
end;
$$;

revoke all on function public.import_products(jsonb) from public, anon;
grant execute on function public.import_products(jsonb) to authenticated;


-- ---------------------------------------------------------------------
-- Ürün görselleri deposu
-- Görseller herkese açık okunur (ürün fotoğrafı kişisel veri değildir);
-- yalnızca yönetici yükler, değiştirir veya siler.
-- En fazla 5 MB; JPEG, PNG veya WebP.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Yönetici, depodaki görsel kayıtlarını görebilir (silme/değiştirme işlemi bunu gerektirir).
create policy "urun_gorseli_okuma_yonetici" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

create policy "urun_gorseli_yukleme_yonetici" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "urun_gorseli_guncelleme_yonetici" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

create policy "urun_gorseli_silme_yonetici" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
