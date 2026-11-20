// Veritabanı tek istekte en fazla 1000 satır döndürür (sunucu ayarı).
// Bu yardımcı, listeyi 1000'erlik parçalar hâlinde sonuna kadar çeker;
// böylece müşteri veya ürün sayısı 1000'i geçince liste eksik kalmaz.
export const PAGE_SIZE = 1000

export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw error
    all.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return all
  }
}
