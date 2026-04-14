import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { DiagnosedVoC, DiagnosisIssue } from '../types'
import { getGapDisplayLabel, getGapStatusColor } from '../utils/analysisUtils'
import minerLoaderGif from '../assets/image-1.gif'
import { SOURCE_LABELS } from '../constants/colors'
import { PLATFORM_MAP, PLATFORMS, DOMAINS } from '../constants/platforms'
import { DomainTag, SentimentTag, GapTag, MutedChip } from '../components/tags'

const API_BASE = 'https://voc-api-production.up.railway.app'

const DOMAIN_FILTERS = ['전체', ...DOMAINS] as const
const ITEMS_PER_PAGE = 10

const SENTIMENT_GROUPS = ['긍정', '중립', '부정'] as const
type SentimentGroup = typeof SENTIMENT_GROUPS[number]

// platform → source 필드 정규화
function normalizeVoC(raw: Record<string, unknown>): DiagnosedVoC {
  return {
    ...raw,
    source: (raw.platform ?? raw.source) as DiagnosedVoC['source'],
    platform: (raw.platform ?? raw.source) as string,
    channel_detail: (raw.channel_detail ?? '') as string,
  } as DiagnosedVoC
}

function getSentimentGroup(voc: DiagnosedVoC): SentimentGroup {
  let pos = 0, neu = 0, neg = 0
  for (const issue of voc.issues) {
    if (issue.sentiment === '긍정' || issue.sentiment === '매우 긍정') pos++
    else if (issue.sentiment === '중립') neu++
    else neg++
  }
  // Tied: worst wins (negative > neutral > positive)
  if (neg >= pos && neg >= neu) return '부정'
  if (neu >= pos && neu >= neg) return '중립'
  return '긍정'
}

function getVocFinalSentiment(voc: DiagnosedVoC): string {
  const group = getSentimentGroup(voc)
  return group
}

function formatServiceRating(channelDetail: string): string {
  // "U+one / 별점: 2" → "U+one · ⭐️ 2"
  const match = channelDetail.match(/^(.+?)\s*\/\s*별점:\s*(.+)$/)
  if (match) return `${match[1].trim()} · ⭐️ ${match[2].trim()}`
  return channelDetail
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function isAppOrPlayStore(platform: string): boolean {
  return platform === 'AppStore' || platform === 'PlayStore'
}

export default function VocFeed() {
  const [vocData, setVocData] = useState<DiagnosedVoC[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sourcesChecked, setSourcesChecked] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    PLATFORMS.forEach(p => { init[p] = true })
    return init
  })
  const [sentimentChecked, setSentimentChecked] = useState<Record<string, boolean>>({
    '긍정': true, '중립': true, '부정': true,
  })
  const [domainFilter, setDomainFilter] = useState<string>('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'default' | 'latest'>('default')
  const [selectedVoC, setSelectedVoC] = useState<DiagnosedVoC | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showScrollTop, setShowScrollTop] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const fetchVoc = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/api/voc`)
        if (!res.ok) throw new Error(`API 오류: ${res.status}`)
        const json: Record<string, unknown>[] = await res.json()
        setVocData(json.map(normalizeVoC))
      } catch (e) {
        setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    fetchVoc()
  }, [])

  // All sources unchecked?
  const allSourcesUnchecked = useMemo(() => PLATFORMS.every(p => !sourcesChecked[p]), [sourcesChecked])

  // Source "전체" checkbox state
  const allSourcesChecked = useMemo(() => PLATFORMS.every(p => sourcesChecked[p]), [sourcesChecked])
  const someSourcesChecked = useMemo(() => PLATFORMS.some(p => sourcesChecked[p]) && !allSourcesChecked, [sourcesChecked, allSourcesChecked])

  const toggleSource = useCallback((platform: string) => {
    setSourcesChecked(prev => ({ ...prev, [platform]: !prev[platform] }))
    setCurrentPage(1)
  }, [])

  const toggleAllSources = useCallback(() => {
    const newVal = !allSourcesChecked
    setSourcesChecked(() => {
      const next: Record<string, boolean> = {}
      PLATFORMS.forEach(p => { next[p] = newVal })
      return next
    })
    setCurrentPage(1)
  }, [allSourcesChecked])

  const toggleSentiment = useCallback((group: string) => {
    setSentimentChecked(prev => ({ ...prev, [group]: !prev[group] }))
    setCurrentPage(1)
  }, [])

  // Filtering
  const filtered = useMemo(() => {
    const list = vocData.filter(v => {
      // 1. Source filter
      const platform = (v as DiagnosedVoC & { platform?: string }).platform ?? v.source
      if (!sourcesChecked[platform]) return false

      // 2. Sentiment filter
      const group = getSentimentGroup(v)
      if (!sentimentChecked[group]) return false

      // 3. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (!v.raw_text.toLowerCase().includes(q)) return false
      }

      // 4. Domain filter
      if (domainFilter !== '전체') {
        const hasDomain = v.issues.some(i => i.domain === domainFilter)
        if (!hasDomain) return false
      }

      return true
    })

    if (sortBy === 'latest') {
      list.sort((a, b) => {
        const da = (a as any).post_date || (a as any).diagnosed_at || ''
        const db = (b as any).post_date || (b as any).diagnosed_at || ''
        return db.localeCompare(da)
      })
    }
    return list
  }, [vocData, sourcesChecked, sentimentChecked, searchQuery, domainFilter, sortBy])

  // Domain tab counts (filtered by source + sentiment + search, but NOT by domain)
  const domainCounts = useMemo(() => {
    const baseFiltered = vocData.filter(v => {
      const platform = (v as DiagnosedVoC & { platform?: string }).platform ?? v.source
      if (!sourcesChecked[platform]) return false
      const group = getSentimentGroup(v)
      if (!sentimentChecked[group]) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (!v.raw_text.toLowerCase().includes(q)) return false
      }
      return true
    })
    const counts: Record<string, number> = { '전체': baseFiltered.length }
    for (const d of DOMAINS) {
      counts[d] = baseFiltered.filter(v => v.issues.some(i => i.domain === d)).length
    }
    return counts
  }, [vocData, sourcesChecked, sentimentChecked, searchQuery])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedItems = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, domainFilter, sortBy])

  if (loading) {
    return (
      <div className="size-full flex flex-col items-center justify-center min-h-screen" style={{ background: '#0E0F0E' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.64 }}
          animate={{ opacity: 1, scale: 0.8 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center gap-0"
        >
          <div className="relative">
            <svg width="312" height="312" viewBox="0 0 312 312" fill="none"
              className="absolute inset-0 z-0">
              <path d="M 12 36 Q 132 24 252 36 Q 264 108 252 180 Q 132 192 12 180 Q 0 108 12 36 Z"
                stroke="rgba(94, 232, 106, 0.3)" strokeWidth="2" fill="#000000"/>
            </svg>
            <div className="relative z-10 flex items-center justify-center"
              style={{ width: 264, height: 216 }}>
              <img src={minerLoaderGif} alt="Loading"
                className="w-[160px] h-[120px] object-contain ml-[18px]"
                style={{ imageRendering: "pixelated" }}/>
            </div>
          </div>
          <motion.div className="flex items-center gap-2 -mt-[6px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}>
            <span className="text-[#5EE86A] text-[18px] font-mono tracking-wider">
              {['진짜 보이스 채굴 중', '지하 깊은 곳까지 탐색중', '묻힌 보이스 수집중'][Math.floor(Math.random() * 3)]}
            </span>
            <motion.span className="text-[#5EE86A] text-[18px] font-mono"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
              ...
            </motion.span>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <main className="max-w-[1600px] mx-auto px-6 py-6 flex items-center justify-center" style={{ minHeight: 400, background: '#0E0F0E' }}>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">&#9888;&#65039;</span>
          <p className="text-sm font-semibold" style={{ color: '#E8EDE0' }}>데이터 로드 실패</p>
          <p className="text-xs" style={{ color: '#8A9980' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 text-white text-sm rounded-lg hover:opacity-90 transition-colors"
            style={{ background: '#5EE86A', color: '#0E0F0E' }}
          >
            다시 시도
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-[1600px] mx-auto px-6 py-6" style={{ minWidth: 1280, background: '#0E0F0E' }}>
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: '#E8EDE0' }}>VoC 피드</h1>
        <p className="text-sm font-mono mt-1" style={{ color: '#8A9980' }}>총 <span className="font-mono">{vocData.length.toLocaleString()}</span>건</p>
      </div>

      {/* 2-column layout */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '280px 1fr' }}>
        {/* Left: Filter panel */}
        <div className="shrink-0">
          <div className="sticky top-6">
            <div className="rounded-lg p-4" style={{ background: '#1A1D18', border: '1px solid #2E3329', boxShadow: '0 0 8px rgba(94, 232, 106, 0.08)' }}>
              <p className="text-sm font-bold mb-4" style={{ color: '#E8EDE0' }}>Filters</p>

              {/* Source section */}
              <div className="mb-5">
                <p className="text-xs font-medium mb-2" style={{ color: '#8A9980' }}>출처</p>
                <label className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSourcesChecked}
                    ref={el => {
                      if (el) el.indeterminate = someSourcesChecked
                    }}
                    onChange={toggleAllSources}
                    className="accent-[#5EE86A] w-4 h-4 rounded"
                    style={{ borderColor: '#2E3329', backgroundColor: '#111410' }}
                  />
                  <span className="text-sm" style={{ color: '#E8EDE0' }}>전체</span>
                </label>
                {PLATFORMS.map(p => (
                  <label key={p} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!sourcesChecked[p]}
                      onChange={() => toggleSource(p)}
                      className="accent-[#5EE86A] w-4 h-4 rounded"
                      style={{ borderColor: '#2E3329', backgroundColor: '#111410' }}
                    />
                    <span className="text-sm" style={{ color: '#E8EDE0' }}>{PLATFORM_MAP[p] ?? p}</span>
                  </label>
                ))}
              </div>

              {/* Sentiment section */}
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: '#8A9980' }}>감성</p>
                {SENTIMENT_GROUPS.map(g => (
                  <label key={g} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!sentimentChecked[g]}
                      onChange={() => toggleSentiment(g)}
                      className="accent-[#5EE86A] w-4 h-4 rounded"
                      style={{ borderColor: '#2E3329', backgroundColor: '#111410' }}
                    />
                    <span className="text-sm" style={{ color: '#E8EDE0' }}>{g}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Content area */}
        <div className="flex-1 min-w-0" ref={contentRef}>
          {/* Search bar - sticky */}
          <div className="sticky top-0 z-20 pb-2" style={{ background: '#0E0F0E' }}>
            <input
              type="text"
              placeholder="원문 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 text-sm rounded-lg focus:outline-none focus:border-[#5EE86A]/50"
              style={{ background: '#1A1D18', border: '1px solid #2E3329', color: '#E8EDE0' }}
            />
          </div>

          {/* Domain tab bar - sticky below search */}
          <div className="sticky top-[44px] z-20 pb-2" style={{ background: '#0E0F0E' }}>
            <div className="flex items-center gap-6" style={{ borderBottom: '1px solid #2E3329' }}>
              {DOMAIN_FILTERS.map(d => {
                const isActive = domainFilter === d
                return (
                  <button
                    key={d}
                    onClick={() => setDomainFilter(d)}
                    className="px-0 py-2 text-sm font-medium transition-colors relative"
                    style={{ color: isActive ? '#5EE86A' : '#8A9980' }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#E8EDE0' }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#8A9980' }}
                  >
                    {d} <span className="font-mono text-xs ml-1">{domainCounts[d] ?? 0}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#5EE86A' }} />
                    )}
                  </button>
                )
              })}

              {/* Sort buttons - right side */}
              <div className="ml-auto flex items-center gap-1.5 pb-1">
                {([['default', '진단순'], ['latest', '최신순']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      sortBy === key
                        ? 'border'
                        : ''
                    }`}
                    style={sortBy === key
                      ? { background: '#1A1D18', color: '#5EE86A', borderColor: 'rgba(94, 232, 106, 0.3)' }
                      : { background: '#2E3329', color: '#8A9980' }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Empty states */}
          {allSourcesUnchecked ? (
            <div className="text-center py-16" style={{ color: '#8A9980' }}>
              <p className="text-sm">수신 채널 없음. 출처를 선택하십시오</p>
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="text-center py-16" style={{ color: '#8A9980' }}>
              <p className="text-sm">탐지된 VoC 없음. 키워드 또는 필터를 재조정하십시오</p>
            </div>
          ) : (
            <>
              {/* Feed cards - 1 column */}
              <div className="flex flex-col gap-3 mt-2">
                {paginatedItems.map(v => (
                  <VocCard
                    key={v.id}
                    voc={v}
                    onClick={() => setSelectedVoC(v)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 mb-2">
                  {safePage > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentPage(1)}
                        className="px-2 py-1 rounded text-sm hover:opacity-80"
                        style={{ background: '#2E3329', color: '#8A9980' }}
                      >
                        &laquo;
                      </button>
                      <button
                        onClick={() => setCurrentPage(safePage - 1)}
                        className="px-2 py-1 rounded text-sm hover:opacity-80"
                        style={{ background: '#2E3329', color: '#8A9980' }}
                      >
                        &lsaquo;
                      </button>
                    </>
                  )}
                  <span className="text-sm font-mono" style={{ color: '#8A9980' }}>
                    Page <span style={{ color: '#E8EDE0' }}>{safePage}</span> of {totalPages}
                  </span>
                  {safePage < totalPages && (
                    <>
                      <button
                        onClick={() => setCurrentPage(safePage + 1)}
                        className="px-2 py-1 rounded text-sm hover:opacity-80"
                        style={{ background: '#2E3329', color: '#8A9980' }}
                      >
                        &rsaquo;
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className="px-2 py-1 rounded text-sm hover:opacity-80"
                        style={{ background: '#2E3329', color: '#8A9980' }}
                      >
                        &raquo;
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Scroll-to-top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-lg"
          style={{ background: '#1A1D18', border: '1px solid #2E3329', color: '#5EE86A' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 14V2M2 8l6-6 6 6"/>
          </svg>
        </button>
      )}

      {/* Drilldown panel */}
      {selectedVoC && (
        <DrilldownPanel
          voc={selectedVoC}
          onClose={() => setSelectedVoC(null)}
        />
      )}
    </main>
  )
}

function VocCard({ voc, onClick }: { voc: DiagnosedVoC; onClick: () => void }) {
  const domains = [...new Set(voc.issues.map(i => i.domain))]
  const platform = (voc as DiagnosedVoC & { platform?: string }).platform ?? voc.source
  const channelDetail = (voc as DiagnosedVoC & { channel_detail?: string }).channel_detail
  const dateStr = (voc as any).post_date || (voc as any).diagnosed_at || voc.collected_at

  // Issue sentiment counts
  const posCount = voc.issues.filter(i => i.sentiment === '긍정' || i.sentiment === '매우 긍정').length
  const neuCount = voc.issues.filter(i => i.sentiment === '중립').length
  const negCount = voc.issues.filter(i => i.sentiment === '부정' || i.sentiment === '매우 부정').length

  // Final sentiment
  const finalSentiment = getVocFinalSentiment(voc)

  return (
    <button
      onClick={onClick}
      className="p-4 rounded-lg text-left hover:border-[#5EE86A]/25 transition-all group w-full"
      style={{ background: '#1A1D18', border: '1px solid #2E3329', boxShadow: '0 0 8px rgba(94, 232, 106, 0.08)' }}
    >
      {/* Top: Meta */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MutedChip label={PLATFORM_MAP[platform] ?? platform} variant="solid" />
          {isAppOrPlayStore(platform) && channelDetail && (
            <span className="text-xs" style={{ color: '#8A9980' }}>
              {formatServiceRating(channelDetail)}
            </span>
          )}
        </div>
        <span className="text-xs font-mono shrink-0" style={{ color: '#8A9980' }}>
          {formatDate(dateStr)}
        </span>
      </div>

      {/* Body: VoC Text */}
      <p className="text-sm mb-3 line-clamp-2" style={{ color: '#E8EDE0' }}>
        {voc.raw_text}
      </p>

      {/* Bottom: Tags and Counts */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {domains.map(d => (
            <DomainTag key={d} domain={d as any} />
          ))}
          <SentimentTag sentiment={finalSentiment as any} />
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span style={{ color: '#8A9980' }}>
            이슈 <span style={{ color: '#E8EDE0' }}>{voc.issues.length}건</span>
          </span>
          <span style={{ color: '#8A9980' }}>
            긍정<span style={{ color: '#5EE86A' }}>{posCount}</span>
          </span>
          <span style={{ color: '#8A9980' }}>
            중립<span style={{ color: '#4A5540' }}>{neuCount}</span>
          </span>
          <span style={{ color: '#8A9980' }}>
            부정<span style={{ color: '#EF4444' }}>{negCount}</span>
          </span>
        </div>
      </div>
    </button>
  )
}

function DrilldownPanel({ voc, onClose }: { voc: DiagnosedVoC; onClose: () => void }) {
  const platform = (voc as DiagnosedVoC & { platform?: string }).platform ?? voc.source
  const channelDetail = (voc as DiagnosedVoC & { channel_detail?: string }).channel_detail
  const dateStr = (voc as any).post_date || (voc as any).diagnosed_at || voc.collected_at

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="flex-1 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Slide panel */}
      <div className="w-[560px] shadow-2xl overflow-y-auto flex flex-col" style={{ background: '#1A1D18' }}>
        {/* Meta area (no title) */}
        <div className="sticky top-0 px-6 py-4 flex items-center justify-between z-10" style={{ background: '#1A1D18', borderBottom: '1px solid #2E3329' }}>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Source tag - MutedChip solid */}
            <MutedChip label={PLATFORM_MAP[platform] ?? platform} variant="solid" />
            {/* Service + rating conditional */}
            {isAppOrPlayStore(platform) && channelDetail && (
              <span className="text-xs" style={{ color: '#8A9980' }}>
                {channelDetail}
              </span>
            )}
            {/* Date */}
            <span className="text-xs font-mono" style={{ color: '#8A9980' }}>
              {formatDate(dateStr)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none hover:opacity-80"
            style={{ color: '#8A9980' }}
          >
            &#10005;
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* VoC 원문 */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#8A9980' }}>VoC 원문</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap rounded-lg p-4" style={{ color: '#E8EDE0', background: '#0E0F0E', border: '1px solid #2E3329' }}>
              {voc.raw_text}
            </p>
          </div>

          {/* Section divider */}
          <div style={{ borderTop: '1px dashed #2E3329' }} />

          {/* 이슈 분석 */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#8A9980' }}>
              이슈 분석 (<span className="font-mono">{voc.issues.length}</span>건)
            </h3>
            <div className="flex flex-col gap-2">
              {voc.issues.map((issue, idx) => (
                <IssueRow key={idx} issue={issue} />
              ))}
            </div>
          </div>

          {/* Section divider */}
          <div style={{ borderTop: '1px dashed #2E3329' }} />

          {/* AI 종합 코멘트 */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#8A9980' }}>AI 종합 코멘트</h3>
            <p className="text-sm leading-relaxed rounded-lg p-4" style={{ color: '#E8EDE0', background: 'rgba(94,232,106,0.08)', border: '1px solid rgba(94,232,106,0.15)' }}>
              {voc.overall_summary}
            </p>
          </div>

          {/* Section divider */}
          <div style={{ borderTop: '1px dashed #2E3329' }} />

          {/* 액션 힌트 */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#8A9980' }}>액션 힌트</h3>
            <div className="flex flex-col gap-2">
              {voc.issues.filter(i => i.action_hint).map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm rounded-lg p-3" style={{ background: 'rgba(13,119,238,0.1)', border: '1px solid rgba(13,119,238,0.2)' }}>
                  <span className="shrink-0 mt-0.5">
                    <DomainTag domain={issue.domain as any} />
                  </span>
                  <span style={{ color: '#0D77EE' }}>{issue.action_hint}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function IssueRow({ issue }: { issue: DiagnosisIssue }) {
  const gapType = issue.gap > 5 ? '기대 초과' : issue.gap < -5 ? '기대 이하' : '기대 충족'

  return (
    <div className="rounded-lg p-3 flex flex-col gap-2" style={{ border: '1px solid #2E3329' }}>
      <div className="flex items-center gap-2 flex-wrap">
        <DomainTag domain={issue.domain as any} />
        {issue.attributes.length > 0 && issue.attributes.map((attr, idx) => (
          <MutedChip key={idx} label={attr} variant="outline" />
        ))}
        <SentimentTag sentiment={issue.sentiment as any} />
        <GapTag type={gapType} value={issue.gap} />
      </div>
      <p className="text-xs" style={{ color: '#E8EDE0' }}>{issue.issue_summary}</p>
    </div>
  )
}
