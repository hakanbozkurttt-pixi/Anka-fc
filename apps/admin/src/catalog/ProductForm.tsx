import { useEffect, useState, type FormEvent } from 'react'
import {
  createProduct,
  IMAGE_TYPES,
  imageUrl,
  MAX_IMAGE_BYTES,
  productErrorMessage,
  removeProductImage,
  updateProduct,
  uploadProductImage,
} from './api'
import { BRANDS, PRODUCT_SPECIES_LABEL, type Brand, type Product, type ProductSpecies } from './model'
import { parseGrams, parsePrice } from './rows'

type Props = {
  product: Product | null // null: yeni ürün
  /** Kaydetmeden önce aynı barkodlu ürünü bulmak için */
  products: Product[]
  onSaved: () => void
  onCancel: () => void
}

type Errors = Partial<Record<'brand' | 'name' | 'species' | 'package_grams' | 'price_try' | 'code' | 'image', string>>

export function ProductForm({ product, products, onSaved, onCancel }: Props) {
  const [brand, setBrand] = useState<Brand | ''>(product?.brand ?? '')
  const [name, setName] = useState(product?.name ?? '')
  const [species, setSpecies] = useState<ProductSpecies | ''>(product?.species ?? '')
  const [series, setSeries] = useState(product?.series ?? '')
  const [flavor, setFlavor] = useState(product?.flavor ?? '')
  const [ageGroup, setAgeGroup] = useState(product?.age_group ?? '')
  const [grams, setGrams] = useState(product ? String(product.package_grams) : '')
  const [price, setPrice] = useState(product ? product.price_try.toFixed(2).replace('.', ',') : '')
  const [code, setCode] = useState(product?.code ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [isActive, setIsActive] = useState(product?.is_active ?? true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [preview, setPreview] = useState<string | null>(imageUrl(product?.image_path ?? null))
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Seçilen yerel görselin önizleme adresini, form kapanınca serbest bırak.
  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function pickImage(file: File | undefined) {
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) {
      setErrors((e) => ({ ...e, image: 'Görsel JPEG, PNG veya WebP olmalı.' }))
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((e) => ({ ...e, image: 'Görsel 5 MB’tan büyük olamaz.' }))
      return
    }
    setErrors((e) => ({ ...e, image: undefined }))
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
    setRemoveImage(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const next: Errors = {}
    if (!brand) next.brand = 'Marka seçin.'
    if (!name.trim()) next.name = 'Ürün adı zorunludur.'
    if (!species) next.species = 'Hayvan türünü seçin.'
    const g = parseGrams(grams)
    if (g === null || g < 1 || g > 100000) next.package_grams = 'Gram olarak tam sayı girin (ör. 1,5 kg için 1500).'
    const p = parsePrice(price)
    if (p === null || p <= 0 || p >= 1000000) next.price_try = 'Geçerli bir fiyat girin (ör. 1249,90).'
    const trimmedCode = code.trim()
    if (trimmedCode) {
      const other = products.find(
        (x) => x.id !== product?.id && x.code && x.code.trim().toLocaleLowerCase('tr-TR') === trimmedCode.toLocaleLowerCase('tr-TR'),
      )
      if (other) next.code = `Bu barkod / ürün kodu "${other.name}" ürününde kayıtlı. Her ürünün kodu farklı olmalı.`
    }
    setErrors(next)
    setFormError(null)
    if (Object.values(next).some(Boolean) || !brand || !species || g === null || p === null) return

    setSaving(true)
    let uploadedPath: string | null = null
    try {
      let image_path = product?.image_path ?? null
      if (imageFile) {
        uploadedPath = await uploadProductImage(imageFile)
        image_path = uploadedPath
      } else if (removeImage) {
        image_path = null
      }

      const input = {
        brand,
        name: name.trim(),
        species,
        series: series.trim() || null,
        flavor: flavor.trim() || null,
        age_group: ageGroup.trim() || null,
        package_grams: g,
        price_try: p,
        code: trimmedCode || null,
        description: description.trim() || null,
        is_active: isActive,
        image_path,
      }

      if (product) await updateProduct(product.id, input)
      else await createProduct(input)

      // Eski görsel değiştiyse veya kaldırıldıysa depodan sil.
      if (product?.image_path && product.image_path !== image_path) await removeProductImage(product.image_path)
      onSaved()
    } catch (e) {
      if (uploadedPath) await removeProductImage(uploadedPath)
      setFormError(productErrorMessage(e))
      setSaving(false)
    }
  }

  return (
    <form className="card form product-form" onSubmit={handleSubmit} noValidate>
      <h2>{product ? 'Ürünü düzenle' : 'Yeni ürün'}</h2>
      <p className="muted">
        Her paket boyutu ayrı bir üründür. Aynı mamanın 1,5 kg ve 3 kg paketlerini ayrı ayrı ekleyin.
      </p>
      {formError ? <p className="status status-error" role="alert">{formError}</p> : null}

      <div className="grid-2">
        <label>
          Marka *
          <select value={brand} onChange={(e) => setBrand(e.target.value as Brand)} aria-invalid={!!errors.brand}>
            <option value="">Seçin</option>
            {BRANDS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          {errors.brand ? <span className="field-error">{errors.brand}</span> : null}
        </label>
        <label>
          Hayvan türü *
          <select value={species} onChange={(e) => setSpecies(e.target.value as ProductSpecies)} aria-invalid={!!errors.species}>
            <option value="">Seçin</option>
            {(Object.keys(PRODUCT_SPECIES_LABEL) as ProductSpecies[]).map((s) => (
              <option key={s} value={s}>{PRODUCT_SPECIES_LABEL[s]}</option>
            ))}
          </select>
          {errors.species ? <span className="field-error">{errors.species}</span> : null}
        </label>
      </div>

      <label>
        Ürün adı (paketteki tam adı) *
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} aria-invalid={!!errors.name} />
        {errors.name ? <span className="field-error">{errors.name}</span> : null}
      </label>

      <div className="grid-3">
        <label>
          Seri <span className="muted">(isteğe bağlı)</span>
          <input value={series} onChange={(e) => setSeries(e.target.value)} maxLength={100} />
        </label>
        <label>
          İçerik / tat <span className="muted">(isteğe bağlı)</span>
          <input value={flavor} onChange={(e) => setFlavor(e.target.value)} maxLength={100} />
        </label>
        <label>
          Yaş grubu <span className="muted">(isteğe bağlı)</span>
          <input value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} maxLength={100} />
        </label>
      </div>

      <div className="grid-3">
        <label>
          Paket ağırlığı (gram) *
          <input value={grams} onChange={(e) => setGrams(e.target.value)} inputMode="numeric" placeholder="ör. 1500" aria-invalid={!!errors.package_grams} />
          {errors.package_grams ? <span className="field-error">{errors.package_grams}</span> : null}
        </label>
        <label>
          Satış fiyatı (TL) *
          <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="ör. 1249,90" aria-invalid={!!errors.price_try} />
          {errors.price_try ? <span className="field-error">{errors.price_try}</span> : null}
        </label>
        <label>
          Barkod / ürün kodu <span className="muted">(varsa)</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={64} aria-invalid={!!errors.code} />
          {errors.code ? <span className="field-error">{errors.code}</span> : null}
        </label>
      </div>

      <label>
        Açıklama <span className="muted">(isteğe bağlı, müşteri görür)</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={3} />
      </label>

      <div className="image-field">
        <div className="thumb large">{preview && !removeImage ? <img src={preview} alt="Ürün görseli" /> : <span className="muted">Görsel yok</span>}</div>
        <div className="form">
          <label>
            Ürün görseli <span className="muted">(isteğe bağlı; JPEG, PNG veya WebP, en fazla 5 MB)</span>
            <input type="file" accept={IMAGE_TYPES.join(',')} onChange={(e) => pickImage(e.target.files?.[0])} />
          </label>
          {errors.image ? <span className="field-error">{errors.image}</span> : null}
          {(product?.image_path || imageFile) && !removeImage ? (
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setImageFile(null)
                setRemoveImage(true)
                setPreview(null)
              }}
            >
              Görseli kaldır
            </button>
          ) : null}
        </div>
      </div>

      <label className="checkbox">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Aktif (müşteriler bu ürünü görebilir)
      </label>

      <div className="row">
        <button type="submit" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" className="secondary" onClick={onCancel} disabled={saving}>Vazgeç</button>
      </div>
    </form>
  )
}
