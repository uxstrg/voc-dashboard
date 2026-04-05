const BASE_URL = 'https://voc-api-production.up.railway.app'

export async function fetchSummary() {
  const res = await fetch(`${BASE_URL}/api/summary`)
  return res.json()
}

export async function fetchVocList(params?: { platform?: string; domain?: string; limit?: number }) {
  const query = new URLSearchParams()
  if (params?.platform) query.set('platform', params.platform)
  if (params?.domain) query.set('domain', params.domain)
  if (params?.limit) query.set('limit', String(params.limit))
  const res = await fetch(`${BASE_URL}/api/voc?${query}`)
  return res.json()
}
