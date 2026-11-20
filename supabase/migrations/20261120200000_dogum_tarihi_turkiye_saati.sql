-- Düzeltme: Doğum tarihi "bugünden sonra olamaz" kontrolü Türkiye saatine göre yapılır.
--
-- Hata: Veritabanı saati UTC olduğu için Türkiye saatiyle 00:00-03:00 arasında
-- müşterinin "bugün" olarak girdiği doğum tarihi "gelecek tarih" sayılıp reddediliyordu.
alter table public.pets drop constraint pets_birth_date_check;

alter table public.pets add constraint pets_birth_date_check check (
  birth_date <= (now() at time zone 'Europe/Istanbul')::date
  and birth_date >= date '1980-01-01'
);
