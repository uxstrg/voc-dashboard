import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DiagnosedVoC, DiagnosisIssue } from '../types'
import { getGapDisplayLabel, getGapStatusColor } from '../utils/analysisUtils'
import minerLoaderGif from '../assets/image-1.gif'
import {
  DOMAIN_COLORS, SOURCE_LABELS, SOURCE_COLORS,
  SENTIMENT_COLORS, SENTIMENT_BG,
} from '../constants/colors'
import { PLATFORM_MAP, PLATFORMS, DOMAINS } from '../constants/platforms'

const API_BASE = 'https://voc-api-production.up.railway.app'

const DOMAIN_FILTERS = ['전체', ...DOMAINS] as const

// platform → source 필드 정규화
function normalizeVoC(raw: Record<string, unknown>): DiagnosedVoC {
  return {
    ...raw,
    source: (raw.platform ?? raw.source) as DiagnosedVoC['source'],
    platform: (raw.platform ?? raw.source) as string,
    channel_detail: (raw.channel_detail ?? '') as string,
  } as DiagnosedVoC
}

export default function VocFeed() {
  const [vocData, setVocData] = useState<DiagnosedVoC[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [domainFilter, setDomainFilter] = useState<string>('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'default' | 'latest'>('default')
  const [selectedVoC, setSelectedVoC] = useState<DiagnosedVoC | null>(null)

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

  const filtered = useMemo(() => {
    const list = vocData.filter(v => {
      const platform = (v as DiagnosedVoC & { platform?: string }).platform ?? v.source
      if (sourceFilter !== 'all' && platform !== sourceFilter) return false
      if (domainFilter !== '전체') {
        const hasDomain = v.issues.some(i => i.domain === domainFilter)
        if (!hasDomain) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (!v.raw_text.toLowerCase().includes(q)) return false
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
  }, [vocData, sourceFilter, domainFilter, searchQuery, sortBy])

  if (loading) {
    return (
      <div className="size-full flex flex-col items-center justify-center min-h-[400px]">
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
      <main className="max-w-[1600px] mx-auto px-6 py-6 flex items-center justify-center" style={{ minHeight: 400 }}>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm font-semibold text-txt-primary">데이터 로드 실패</p>
          <p className="text-xs text-txt-muted">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-signal-blue text-white text-sm rounded-lg hover:opacity-90 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-[1600px] mx-auto px-6 py-6" style={{ minWidth: 1280 }}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-txt-primary">VoC 원문 피드</h1>
        <p className="text-sm text-txt-muted mt-1">진단 완료된 VoC 원문 전체 열람 · <span className="font-mono">{vocData.length}</span>건</p>
      </div>

      {/* 필터 바 */}
      <div className="bg-surface-card rounded-xl border border-surface-border p-4 mb-5 flex items-center gap-4 flex-wrap">
        {/* 출처 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-txt-muted font-medium shrink-0">출처</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sourceFilter === 'all' ? 'bg-surface-card text-accent-green border border-accent-green/30' : 'bg-surface-border text-txt-muted hover:opacity-80'
              }`}
            >
              전체
            </button>
            {PLATFORMS.map(p => (
              <button
                key={p}
                onClick={() => setSourceFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sourceFilter === p ? 'text-white' : 'bg-surface-border text-txt-muted hover:opacity-80'
                }`}
                style={sourceFilter === p ? { backgroundColor: SOURCE_COLORS[p] ?? '#9CA3AF' } : {}}
              >
                {PLATFORM_MAP[p] ?? p}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-surface-border" />

        {/* 도메인 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-txt-muted font-medium shrink-0">도메인</span>
          <div className="flex gap-1.5">
            {DOMAIN_FILTERS.map(d => (
              <button
                key={d}
                onClick={() => setDomainFilter(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  domainFilter === d
                    ? d === '전체' ? 'bg-surface-card text-accent-green border border-accent-green/30' : 'text-white'
                    : 'bg-surface-border text-txt-muted hover:opacity-80'
                }`}
                style={domainFilter === d && d !== '전체' ? { backgroundColor: DOMAIN_COLORS[d] } : {}}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-surface-border" />

        {/* 검색 */}
        <div className="flex-1 min-w-48">
          <input
            type="text"
            placeholder="원문 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-surface-border rounded-lg focus:outline-none focus:border-accent-green/50 bg-surface text-txt-primary placeholder:text-txt-muted"
          />
        </div>

        <div className="w-px h-6 bg-surface-border" />

        {/* 정렬 */}
        <div className="flex items-center gap-1.5 shrink-0">
          {([['default', '진단순'], ['latest', '최신순']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sortBy === key
                  ? 'bg-surface-card text-accent-green border border-accent-green/30'
                  : 'bg-surface-border text-txt-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="text-xs text-txt-muted shrink-0 font-mono">{filtered.length}건</span>
      </div>

      {/* VoC 카드 리스트 */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map(v => (
          <VocCard
            key={v.id}
            voc={v}
            onClick={() => setSelectedVoC(v)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-16 text-txt-muted">
            <p className="text-lg">검색 결과가 없습니다</p>
            <p className="text-sm mt-1">필터 조건을 변경해 보세요</p>
          </div>
        )}
      </div>

      {/* 드릴다운 패널 */}
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
  const negCount = voc.issues.filter(i => i.sentiment === '부정' || i.sentiment === '매우 부정').length
  const platform = (voc as DiagnosedVoC & { platform?: string }).platform ?? voc.source
  const channelDetail = (voc as DiagnosedVoC & { channel_detail?: string }).channel_detail

  return (
    <button
      onClick={onClick}
      className="bg-surface-card rounded-xl border border-surface-border p-5 text-left hover:border-accent-green/30 hover:shadow-sm transition-all group"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="px-2 py-0.5 rounded text-xs font-bold text-white"
            style={{ backgroundColor: SOURCE_COLORS[platform] ?? '#9CA3AF' }}
          >
            {SOURCE_LABELS[platform] ?? platform}
          </span>
          {channelDetail && (
            <span className="text-xs text-txt-muted bg-surface-border px-2 py-0.5 rounded">
              {channelDetail}
            </span>
          )}
          {voc.collected_at && (
            <span className="text-xs text-txt-muted">
              {new Date(voc.collected_at).toLocaleDateString('ko-KR', {
                month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-txt-muted">
          <span>이슈 <span className="font-mono">{voc.issues.length}</span>건</span>
          {negCount > 0 && <span className="text-red-500">부정 <span className="font-mono">{negCount}</span></span>}
        </div>
      </div>

      {/* 원문 */}
      <p className="text-sm text-txt-primary leading-relaxed line-clamp-3 mb-3">
        {voc.raw_text}
      </p>

      {/* 도메인 뱃지 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {domains.map(d => (
          <span
            key={d}
            className="px-2 py-0.5 rounded text-xs font-medium text-white"
            style={{ backgroundColor: DOMAIN_COLORS[d] }}
          >
            {d}
          </span>
        ))}
      </div>
    </button>
  )
}

function DrilldownPanel({ voc, onClose }: { voc: DiagnosedVoC; onClose: () => void }) {
  const platform = (voc as DiagnosedVoC & { platform?: string }).platform ?? voc.source
  const channelDetail = (voc as DiagnosedVoC & { channel_detail?: string }).channel_detail

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* 배경 오버레이 */}
      <div
        className="flex-1 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* 슬라이드 패널 */}
      <div className="w-[560px] bg-surface-card shadow-2xl overflow-y-auto flex flex-col">
        {/* 헤더 */}
        <div className="sticky top-0 bg-surface-card border-b border-surface-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="px-2 py-0.5 rounded text-xs font-bold text-white"
              style={{ backgroundColor: SOURCE_COLORS[platform] ?? '#9CA3AF' }}
            >
              {SOURCE_LABELS[platform] ?? platform}
            </span>
            {channelDetail && (
              <span className="text-xs text-txt-muted bg-surface-border px-2 py-0.5 rounded">
                {channelDetail}
              </span>
            )}
            {voc.collected_at && (
              <span className="text-xs text-txt-muted">
                {new Date(voc.collected_at).toLocaleString('ko-KR')}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-txt-muted hover:text-txt-primary text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* 원문 */}
          <div>
            <h3 className="text-xs font-semibold text-txt-muted uppercase tracking-wide mb-2">원문</h3>
            <p className="text-sm text-txt-primary leading-relaxed whitespace-pre-wrap bg-surface rounded-xl p-4 border border-surface-border">
              {voc.raw_text}
            </p>
          </div>

          {/* 분해 이슈 목록 */}
          <div>
            <h3 className="text-xs font-semibold text-txt-muted uppercase tracking-wide mb-3">
              분해 이슈 (<span className="font-mono">{voc.issues.length}</span>건)
            </h3>
            <div className="flex flex-col gap-2">
              {voc.issues.map((issue, idx) => (
                <IssueRow key={idx} issue={issue} />
              ))}
            </div>
          </div>

          {/* AI 종합 코멘트 */}
          <div>
            <h3 className="text-xs font-semibold text-txt-muted uppercase tracking-wide mb-2">AI 종합 코멘트</h3>
            <p className="text-sm text-txt-primary leading-relaxed bg-[rgba(94,232,106,0.08)] rounded-xl p-4 border border-[rgba(94,232,106,0.15)]">
              {voc.overall_summary}
            </p>
          </div>

          {/* 액션 힌트 */}
          <div>
            <h3 className="text-xs font-semibold text-txt-muted uppercase tracking-wide mb-2">액션 힌트</h3>
            <div className="flex flex-col gap-2">
              {voc.issues.filter(i => i.action_hint).map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm bg-[rgba(13,119,238,0.1)] rounded-lg p-3 border border-[rgba(13,119,238,0.2)]">
                  <span
                    className="shrink-0 px-2 py-0.5 rounded text-xs font-bold text-white mt-0.5"
                    style={{ backgroundColor: DOMAIN_COLORS[issue.domain] }}
                  >
                    {issue.domain}
                  </span>
                  <span className="text-signal-blue">{issue.action_hint}</span>
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
  const gapColor = getGapStatusColor(issue.gap)
  const gapLabel = getGapDisplayLabel(issue.gap)

  return (
    <div className="rounded-lg border border-surface-border p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="px-2 py-0.5 rounded text-xs font-bold text-white"
          style={{ backgroundColor: DOMAIN_COLORS[issue.domain] }}
        >
          {issue.domain}
        </span>
        {issue.attributes.map(attr => (
          <span key={attr} className="px-2 py-0.5 rounded text-xs bg-surface-border text-txt-muted">
            {attr}
          </span>
        ))}
        <span
          className="px-2 py-0.5 rounded text-xs font-medium"
          style={{ backgroundColor: SENTIMENT_BG[issue.sentiment], color: SENTIMENT_COLORS[issue.sentiment] }}
        >
          {issue.sentiment}
        </span>
        <span
          className="px-2 py-0.5 rounded text-xs font-bold text-white"
          style={{ backgroundColor: gapColor }}
        >
          {gapLabel}
        </span>
        <span
          className="px-2 py-0.5 rounded text-xs font-medium text-white"
          style={{ backgroundColor: gapColor }}
        >
          {issue.status}
        </span>
      </div>
      <p className="text-xs text-txt-primary">{issue.issue_summary}</p>
    </div>
  )
}
