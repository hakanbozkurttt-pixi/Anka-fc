import { useCallback, useEffect, useMemo, useState } from 'react'
import { imageUrl, listProducts, productErrorMessage, updateProduct } from './api'
import { BRANDS, formatGrams, formatPrice, PRODUCT_SPECIES_LABEL, type Product, type ProductSpecies } from './model'
import { ProductForm } from './ProductForm'
import { TemplateButtons } from './TemplateButtons'

type Props = { onOpenImport: () => void; onOpenGuide: () => void }

export function CatalogPage({ onOpenImport, onOpenGuide }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState('')
  const [species, setSpecies] = useState('')
  const [status, setStatus] = useState('')

  const load = useCallback(
    () =>
      listProducts()
        .then((list) => {
          setProducts(list)
          setError(null)
        })
        .catch((e) => setError(productErrorMessage(e)))
        .finally(() => setLoading(false)),
    [],
  )

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR')
    return products.filter((p) => {
      if (brand && p.brand !== brand) return false
      if (species && p.species !== species) return false
      if (status === 'active' && !p.is_active) return false
      if (status === 'passive' && p.is_active) return false
      if (!q) return true
      return [p.name, p.code, p.series, p.flavor, p.age_group]
        .filter(Boolean)
        .some((v) => v!.toLocaleLowerCase('tr-TR').includes(q))
    })
  }, [products, query, brand, species, status])

  async function toggleActive(p: Product) {
    const action = p.is_active ? 'pasif yapılsın (müşteriler artık görmez)' : 'tekrar aktif yapılsın'
    if (!window.confirm(`"${p.name}" ${action} mı?`)) return
    try {
      await updateProduct(p.id, { is_active: !p.is_active })
      await load()
    } catch (e) {
      setError(productErrorMessage(e))
    }
  }

  if (editing) {
    return (
      <ProductForm
        product={editing === 'new' ? null : editing}
        products={products}
        onCancel={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null)
          await load()
        }}
      />
    )
  }

  return (
    <>
      <div className="page-head">
        <h1>Ürün kataloğu</h1>
        <div className="row">
          <button type="button" onClick={() => setEditing('new')}>Yeni ürün ekle</button>
          <button type="button" className="secondary" onClick={onOpenImport}>Dosyadan toplu yükle</button>
        </div>
      </div>
      <p className="muted">
        Her paket boyutu ayrı bir üründür. Ürünler silinmez; satıştan kaldırmak için pasif yapılır.{' '}
        <button type="button" className="link-button" onClick={onOpenGuide}>Kullanım kılavuzu</button>
      </p>

      <div className="filters">
        <input type="search" placeholder="Ad, barkod, seri, tat veya yaş grubu ara" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Ürün ara" />
        <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Marka">
          <option value="">Tüm markalar</option>
          {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={species} onChange={(e) => setSpecies(e.target.value)} aria-label="Hayvan türü">
          <option value="">Tüm türler</option>
          {(Object.keys(PRODUCT_SPECIES_LABEL) as ProductSpecies[]).map((s) => <option key={s} value={s}>{PRODUCT_SPECIES_LABEL[s]}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Durum">
          <option value="">Aktif ve pasif</option>
          <option value="active">Yalnızca aktif</option>
          <option value="passive">Yalnızca pasif</option>
        </select>
      </div>

      {loading ? <p className="muted">Yükleniyor…</p> : null}
      {error ? <p className="status status-error">{error}</p> : null}

      {!loading && products.length === 0 ? (
        <div className="card empty">
          <p><strong>Katalogda henüz ürün yok.</strong></p>
          <p className="muted">Ürünleri tek tek ekleyebilir veya şablonu doldurup toplu yükleyebilirsiniz.</p>
          <TemplateButtons />
        </div>
      ) : null}

      {products.length > 0 ? (
        <>
          <p className="muted">{filtered.length} / {products.length} ürün gösteriliyor</p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th></th>
                  <th>Marka</th>
                  <th>Ürün</th>
                  <th>Tür</th>
                  <th className="num">Paket</th>
                  <th className="num">Fiyat</th>
                  <th>Barkod / kod</th>
                  <th>Durum</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const img = imageUrl(p.image_path)
                  const extra = [p.series, p.flavor, p.age_group].filter(Boolean).join(' · ')
                  return (
                    <tr key={p.id} className={p.is_active ? '' : 'passive'}>
                      <td><div className="thumb">{img ? <img src={img} alt="" /> : null}</div></td>
                      <td>{p.brand}</td>
                      <td>
                        <div>{p.name}</div>
                        {extra ? <div className="muted small">{extra}</div> : null}
                      </td>
                      <td>{PRODUCT_SPECIES_LABEL[p.species]}</td>
                      <td className="num">{formatGrams(p.package_grams)}</td>
                      <td className="num">{formatPrice(p.price_try)}</td>
                      <td className="mono">{p.code ?? '—'}</td>
                      <td><span className={p.is_active ? 'badge ok' : 'badge'}>{p.is_active ? 'Aktif' : 'Pasif'}</span></td>
                      <td className="actions">
                        <button type="button" className="secondary small" onClick={() => setEditing(p)}>Düzenle</button>
                        <button type="button" className="link-button small" onClick={() => toggleActive(p)}>
                          {p.is_active ? 'Pasif yap' : 'Aktif yap'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  )
}
