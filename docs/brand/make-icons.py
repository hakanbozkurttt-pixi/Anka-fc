# Anka Hayvan Hastanesi logosundan uygulama görsellerini üretir.
import sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
full = Image.open(src).convert("RGBA")

def crop_alpha(im):
    return im.crop(im.split()[3].getbbox())

emblem = crop_alpha(full.crop((0, 900, full.width, 3660)))   # kanatlı amblem
logo = crop_alpha(full)                                     # amblem + yazı

def fit(im, box):
    im = im.copy()
    im.thumbnail((box, box), Image.LANCZOS)
    return im

def place(canvas_size, im, frac, bg=(0, 0, 0, 0)):
    canvas = Image.new("RGBA", (canvas_size, canvas_size), bg)
    e = fit(im, int(canvas_size * frac))
    canvas.alpha_composite(e, ((canvas_size - e.width) // 2, (canvas_size - e.height) // 2))
    return canvas

white = (255, 255, 255, 255)

# iOS simgesi: 1024x1024, saydamlık YOK (Apple şartı), beyaz zemin
place(1024, emblem, 0.78, white).convert("RGB").save(f"{out}/icon.png")
# Açılış ekranı simgesi (beyaz zemin üstünde gösterilir)
place(1024, emblem, 0.80).save(f"{out}/splash-icon.png")
# Android uyarlanabilir simge: ön yüz güvenli alanda (~%66), arka plan beyaz
place(512, emblem, 0.58).save(f"{out}/android-icon-foreground.png")
Image.new("RGBA", (512, 512), white).save(f"{out}/android-icon-background.png")
# Android tek renkli simge: yalnızca şekil (saydamlık) kullanılır
mono = place(432, emblem, 0.62)
r, g, b, a = mono.split()
Image.merge("RGBA", (a.point(lambda _: 255), a.point(lambda _: 255), a.point(lambda _: 255), a)).save(f"{out}/android-icon-monochrome.png")
# Web/panel küçük simgesi
place(48, emblem, 0.92, white).save(f"{out}/favicon.png")
place(192, emblem, 0.86, white).save(f"{out}/favicon-192.png")
# Giriş ekranları için logo (amblem + yazı), saydam
fit(logo, 1200).save(f"{out}/logo.png")
print("tamam", emblem.size, logo.size)
