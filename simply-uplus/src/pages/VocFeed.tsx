import { useState, useMemo, useEffect } from 'react'
import { DiagnosedVoC, DiagnosisIssue } from '../types'
import { getPriorityLevel } from '../utils/analysisUtils'
import {
  DOMAIN_COLORS, SOURCE_LABELS, SOURCE_COLORS,
  SENTIMENT_COLORS, SENTIMENT_BG, GAP_STATUS_COLORS,
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

  const allIssues = useMemo(() => vocData.flatMap(v => v.issues), [vocData])

  const filtered = useMemo(() => {
    return vocData.filter(v => {
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
  }, [vocData, sourceFilter, domainFilter, searchQuery])

  if (loading) {
    return (
      <main className="max-w-[1600px] mx-auto px-6 py-6 flex items-center justify-center" style={{ minHeight: 400 }}>
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm">VoC 데이터를 불러오는 중...</span>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="max-w-[1600px] mx-auto px-6 py-6 flex items-center justify-center" style={{ minHeight: 400 }}>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm font-semibold text-gray-700">데이터 로드 실패</p>
          <p className="text-xs text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
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
        <h1 className="text-xl font-bold text-gray-900">VoC 원문 피드</h1>
        <p className="text-sm text-gray-500 mt-1">진단 완료된 VoC 원문 전체 열람 · {vocData.length}건</p>
      </div>

      {/* 필터 바 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex items-center gap-4 flex-wrap">
        {/* 출처 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium shrink-0">출처</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sourceFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            {PLATFORMS.map(p => (
              <button
                key={p}
                onClick={() => setSourceFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sourceFilter === p ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={sourceFilter === p ? { backgroundColor: SOURCE_COLORS[p] ?? '#9CA3AF' } : {}}
              >
                {PLATFORM_MAP[p] ?? p}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* 도메인 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium shrink-0">도메인</span>
          <div className="flex gap-1.5">
            {DOMAIN_FILTERS.map(d => (
              <button
                key={d}
                onClick={() => setDomainFilter(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  domainFilter === d
                    ? d === '전체' ? 'bg-gray-900 text-white' : 'text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={domainFilter === d && d !== '전체' ? { backgroundColor: DOMAIN_COLORS[d] } : {}}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-gray-200" />

        {/* 검색 */}
        <div className="flex-1 min-w-48">
          <input
            type="text"
            placeholder="원문 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50"
          />
        </div>

        <span className="text-xs text-gray-400 shrink-0">{filtered.length}건</span>
      </div>

      {/* VoC 카드 리스트 */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map(v => (
          <VocCard
            key={v.id}
            voc={v}
            allIssues={allIssues}
            onClick={() => setSelectedVoC(v)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-16 text-gray-400">
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

function VocCard({ voc, allIssues, onClick }: { voc: DiagnosedVoC; allIssues: DiagnosisIssue[]; onClick: () => void }) {
  const domains = [...new Set(voc.issues.map(i => i.domain))]
  const hasHigh = voc.issues.some(i => getPriorityLevel(i, allIssues) === 'High')
  const negCount = voc.issues.filter(i => i.sentiment === '부정' || i.sentiment === '매우 부정').length
  const platform = (voc as DiagnosedVoC & { platform?: string }).platform ?? voc.source
  const channelDetail = (voc as DiagnosedVoC & { channel_detail?: string }).channel_detail

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-blue-300 hover:shadow-sm transition-all group"
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
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {channelDetail}
            </span>
          )}
          {voc.collected_at && (
            <span className="text-xs text-gray-400">
              {new Date(voc.collected_at).toLocaleDateString('ko-KR', {
                month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
              })}
            </span>
          )}
          {hasHigh && (
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600">
              High
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>이슈 {voc.issues.length}건</span>
          {negCount > 0 && <span className="text-red-500">부정 {negCount}</span>}
        </div>
      </div>

      {/* 원문 */}
      <p className="text-sm text-gray-800 leading-relaxed line-clamp-3 mb-3 group-hover:text-gray-900">
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
        className="flex-1 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* 슬라이드 패널 */}
      <div className="w-[560px] bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="px-2 py-0.5 rounded text-xs font-bold text-white"
              style={{ backgroundColor: SOURCE_COLORS[platform] ?? '#9CA3AF' }}
            >
              {SOURCE_LABELS[platform] ?? platform}
            </span>
            {channelDetail && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {channelDetail}
              </span>
            )}
            {voc.collected_at && (
              <span className="text-xs text-gray-400">
                {new Date(voc.collected_at).toLocaleString('ko-KR')}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* 원문 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">원문</h3>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4 border border-gray-100">
              {voc.raw_text}
            </p>
          </div>

          {/* 분해 이슈 목록 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              분해 이슈 ({voc.issues.length}건)
            </h3>
            <div className="flex flex-col gap-2">
              {voc.issues.map((issue, idx) => (
                <IssueRow key={idx} issue={issue} />
              ))}
            </div>
          </div>

          {/* AI 종합 코멘트 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">AI 종합 코멘트</h3>
            <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 rounded-xl p-4 border border-blue-100">
              {voc.overall_summary}
            </p>
          </div>

          {/* 액션 힌트 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">액션 힌트</h3>
            <div className="flex flex-col gap-2">
              {voc.issues.filter(i => i.action_hint).map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span
                    className="shrink-0 px-2 py-0.5 rounded text-xs font-bold text-white mt-0.5"
                    style={{ backgroundColor: DOMAIN_COLORS[issue.domain] }}
                  >
                    {issue.domain}
                  </span>
                  <span className="text-gray-700">{issue.action_hint}</span>
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
  const gapColor = issue.gap > 5 ? GAP_STATUS_COLORS['Exceeding']
    : issue.gap >= -5 ? GAP_STATUS_COLORS['Alignment']
    : GAP_STATUS_COLORS['Gap']

  return (
    <div className="rounded-lg border border-gray-100 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="px-2 py-0.5 rounded text-xs font-bold text-white"
          style={{ backgroundColor: DOMAIN_COLORS[issue.domain] }}
        >
          {issue.domain}
        </span>
        {issue.attributes.map(attr => (
          <span key={attr} className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
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
          Gap {issue.gap > 0 ? '+' : ''}{issue.gap}
        </span>
        <span
          className="px-2 py-0.5 rounded text-xs font-medium text-white"
          style={{ backgroundColor: gapColor }}
        >
          {issue.status}
        </span>
      </div>
      <p className="text-xs text-gray-700">{issue.issue_summary}</p>
    </div>
  )
}