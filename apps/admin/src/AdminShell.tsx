import { useEffect, useState } from 'react'
import { CatalogPage } from './catalog/CatalogPage'
import { GuidePage } from './catalog/GuidePage'
import { ImportPage } from './catalog/ImportPage'
import { CustomersPage } from './CustomersPage'
import { supabase } from './lib/supabase'

const TABS = [
  { id: 'catalog', label: 'Ürün kataloğu' },
  { id: 'import', label: 'Toplu yükleme' },
  { id: 'guide', label: 'Kılavuz' },
  { id: 'customers', label: 'Müşteriler' },
] as const

export type TabId = (typeof TABS)[number]['id']

function readTab(): TabId {
  const hash = window.location.hash.replace('#', '')
  return (TABS.find((t) => t.id === hash)?.id ?? 'catalog') as TabId
}

export function AdminShell({ email }: { email: string }) {
  const [tab, setTab] = useState<TabId>(readTab)

  useEffect(() => {
    const onHash = () => setTab(readTab())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (id: TabId) => {
    window.location.hash = id
    setTab(id)
  }

  return (
    <div className="shell">
      <header className="topbar">
        <strong>Hastane Yönetim Paneli</strong>
        <div className="topbar-right">
          <span className="muted">{email}</span>
          <button type="button" className="secondary" onClick={() => supabase?.auth.signOut()}>
            Çıkış yap
          </button>
        </div>
      </header>
      <nav className="tabs" aria-label="Bölümler">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === tab ? 'tab active' : 'tab'}
            aria-current={t.id === tab ? 'page' : undefined}
            onClick={() => go(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main>
        {tab === 'catalog' && <CatalogPage onOpenImport={() => go('import')} onOpenGuide={() => go('guide')} />}
        {tab === 'import' && <ImportPage onDone={() => go('catalog')} onOpenGuide={() => go('guide')} />}
        {tab === 'guide' && <GuidePage />}
        {tab === 'customers' && <CustomersPage />}
      </main>
    </div>
  )
}
