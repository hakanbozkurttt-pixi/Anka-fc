# Marka görselleri

- `anka-hayvan-hastanesi-logo.pdf`: Anka Hayvan Hastanesi'nin verdiği orijinal logo (saydam zeminli).
- `make-icons.py`: Uygulama simgelerini bu logodan üretir. Simgede yalnızca kanatlı amblem kullanılır;
  "ANKA HAYVAN HASTANESİ" yazısı küçük boyutta okunmadığı için simgeye konmaz (giriş ekranlarındaki logoda vardır).

Üretilen dosyalar:

| Dosya | Kullanım |
|---|---|
| `apps/mobile/assets/icon.png` | iPhone simgesi (1024×1024, beyaz zemin, saydamlık yok — Apple şartı) |
| `apps/mobile/assets/splash-icon.png` | Açılış ekranı |
| `apps/mobile/assets/android-icon-*.png` | Android uyarlanabilir simge (ön yüz, beyaz arka plan, tek renkli) |
| `apps/mobile/assets/favicon.png`, `apps/admin/public/favicon.png` | Tarayıcı sekmesi simgesi |
| `apps/mobile/assets/logo.png`, `apps/admin/src/assets/logo.png` | Giriş ekranlarındaki logo |

Yeniden üretmek için (Poppler ve Python Pillow gerekir):

```
pdftocairo -png -transp -r 600 -singlefile docs/brand/anka-hayvan-hastanesi-logo.pdf /tmp/logo
python3 docs/brand/make-icons.py /tmp/logo.png apps/mobile/assets
```
