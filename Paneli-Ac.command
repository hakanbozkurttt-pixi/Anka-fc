#!/bin/bash
# Hastane yönetim panelini açar (macOS). Çift tıklayın.
# Önce Docker Desktop açık olmalıdır.
cd "$(dirname "$0")" || exit 1

if [ ! -d node_modules ]; then
  echo "İlk çalıştırma: gerekli dosyalar kuruluyor..."
  npm install || { read -r -p "Bir sorun oluştu. Kapatmak için Enter'a basın."; exit 1; }
fi
if [ ! -f apps/admin/.env ]; then
  echo "apps/admin/.env dosyası bulunamadı. README'deki 'Projeyi ilk kez çalıştırma' adımlarını uygulayın."
  read -r -p "Kapatmak için Enter'a basın."
  exit 1
fi

echo "Veritabanı başlatılıyor ve panel tarayıcıda açılıyor..."
echo "Paneli kapatmak için bu pencereyi kapatın."
npm run panel || read -r -p "Bir sorun oluştu. Docker Desktop açık mı? Kapatmak için Enter'a basın."
