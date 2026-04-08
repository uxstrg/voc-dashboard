import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea,
} from 'recharts'
import { DiagnosedVoC, DiagnosisIssue } from '../types'
import {
  calcDomainScore, calcOverallScore, getStatusLabel, getStatusColor,
  calcPositiveRate, calcChannelSentiment, getTopNegativeAttributes,
  getRadarData, generate4WeekTrend, getPriorityLevel,
} from '../utils/analysisUtils'
import { DOMAIN_COLORS, SOURCE_LABELS, SOURCE_COLORS, SENTIMENT_COLORS, SENTIMENT_BG } from '../constants/colors'
import { DOMAINS, DOMAIN_ATTRIBUTES, DOMAIN_AI_TRIGGERS, type Domain } from '../constants/platforms'

const API_BASE = 'https://voc-api-production.up.railway.app'

interface SummaryData {
  total_voc: number
  total_issues: number
  overall_score: number
  domain_scores: Record<string, number>
  status_counts: Record<string, number>
  positive_rate: number
  last_diagnosed_at: string | null
  earliest_collected_at: string | null
  weekly_scores: { week: string; [domain: string]: string | number }[]
  domain_detail: Record<string, {
    score: number | null
    prev_score: number | null
    diff: number | null
    pos: number
    neg: number
    pos_rate: number
  }>
}

type VoCWithPlatform = DiagnosedVoC & { platform?: string; channel_detail?: string }

// platform → source 필드 정규화
function normalizeVoC(raw: Record<string, unknown>): VoCWithPlatform {
  return {
    ...raw,
    source: (raw.platform ?? raw.source) as DiagnosedVoC['source'],
    platform: (raw.platform ?? raw.source) as string,
    channel_detail: (raw.channel_detail ?? '') as string,
  } as VoCWithPlatform
}

function getPlatformLabel(voc: VoCWithPlatform): string {
  const key = voc.platform ?? voc.source
  return SOURCE_LABELS[key] ?? key
}

function getPlatformColor(voc: VoCWithPlatform): string {
  const key = voc.platform ?? voc.source
  return SOURCE_COLORS[key] ?? '#9CA3AF'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [openDomain, setOpenDomain] = useState<Domain | null>(null)
  const [expandedIssueIdx, setExpandedIssueIdx] = useState<number | null>(null)

  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [vocData, setVocData] = useState<VoCWithPlatform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      setError(null)
      try {
        const [summaryRes, vocRes] = await Promise.all([
          fetch(`${API_BASE}/api/summary`),
          fetch(`${API_BASE}/api/voc`),
        ])
        if (!summaryRes.ok) throw new Error(`summary API 오류: ${summaryRes.status}`)
        if (!vocRes.ok) throw new Error(`voc API 오류: ${vocRes.status}`)
        const summaryJson: SummaryData = await summaryRes.json()
        const vocJson: Record<string, unknown>[] = await vocRes.json()
        setSummary(summaryJson)
        setVocData(vocJson.map(normalizeVoC))
      } catch (e) {
        setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const allIssues = useMemo(() => vocData.flatMap(v => v.issues), [vocData])

  const overallScore = useMemo(() =>
    summary ? summary.overall_score : calcOverallScore(allIssues),
    [summary, allIssues]
  )

  const positiveRate = useMemo(() =>
    summary ? summary.positive_rate : calcPositiveRate(allIssues),
    [summary, allIssues]
  )

  const channelSentiment = useMemo(() => calcChannelSentiment(vocData), [vocData])

  const domainScores = useMemo(() => {
    if (summary?.domain_scores) {
      return summary.domain_scores as Record<Domain, number>
    }
    return DOMAINS.reduce((acc, d) => ({ ...acc, [d]: calcDomainScore(allIssues, d) }), {} as Record<Domain, number>)
  }, [summary, allIssues])

  const trendData = useMemo(() => {
    const labels = ['2주 전', '1주 전', '이번 주', '다음 주'] as const
    const now = new Date()
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() - now.getDay() + 1)
    const pad = (n: number) => String(n).padStart(2, '0')
    const fmtRange = (mon: Date) => {
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      return `${pad(mon.getMonth() + 1)}.${pad(mon.getDate())}~${pad(sun.getMonth() + 1)}.${pad(sun.getDate())}`
    }

    // 2주 전, 1주 전, 이번 주, 다음 주의 월요일
    const weekMondays = Array.from({ length: 4 }, (_, i) => {
      const d = new Date(thisMonday)
      d.setDate(d.getDate() + (i - 2) * 7)
      return d
    })
    const weekKeys = weekMondays.map(d => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`)

    const scoresMap = new Map<string, Record<string, number>>()
    if (summary?.weekly_scores) {
      for (const w of summary.weekly_scores) {
        scoresMap.set(w.week as string, w as Record<string, number>)
      }
    }

    return weekMondays.map((mon, i) => {
      const key = weekKeys[i]
      const data = scoresMap.get(key)
      const isNext = i === 3
      const hasData = !!data && !isNext
      return {
        week: `${labels[i]}\n${fmtRange(mon)}`,
        전략: hasData ? (data['전략'] ?? null) : null,
        UX: hasData ? (data['UX'] ?? null) : null,
        운영: hasData ? (data['운영'] ?? null) : null,
        기술: hasData ? (data['기술'] ?? null) : null,
        _noData: !hasData,
      }
    })
  }, [summary])

  const urgentIssues = useMemo(() =>
    [...allIssues]
      .filter(i => i.sentiment === '부정' || i.sentiment === '매우 부정')
      .sort((a, b) => a.gap - b.gap)
      .slice(0, 3),
    [allIssues]
  )

  const domainCounts = useMemo(() =>
    DOMAINS.reduce((acc, d) => {
      const issues = allIssues.filter(i => i.domain === d)
      const pos = issues.filter(i => i.sentiment === '긍정' || i.sentiment === '매우 긍정').length
      const neg = issues.filter(i => i.sentiment === '부정' || i.sentiment === '매우 부정').length
      return { ...acc, [d]: { pos, neg, total: issues.length } }
    }, {} as Record<Domain, { pos: number; neg: number; total: number }>),
    [allIssues]
  )

  const handleDomainToggle = (domain: Domain) => {
    setOpenDomain(prev => prev === domain ? null : domain)
    setExpandedIssueIdx(null)
  }

  if (loading) {
    return (
      <main className="max-w-[1600px] mx-auto px-6 py-6 flex items-center justify-center" style={{ minHeight: 400 }}>
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm">데이터를 불러오는 중...</span>
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
      {/* [A] 진단 헤더 */}
      <DiagnosisHeader
        overallScore={overallScore}
        positiveRate={positiveRate}
        totalVoC={summary?.total_voc ?? vocData.length}
        totalIssues={summary?.total_issues ?? allIssues.length}
        lastDiagnosedAt={summary?.last_diagnosed_at ?? null}
        earliestCollectedAt={summary?.earliest_collected_at ?? null}
        urgentIssues={urgentIssues}
        onUrgentClick={(domain) => {
          setOpenDomain(domain as Domain)
          setExpandedIssueIdx(null)
          setTimeout(() => {
            document.getElementById(`domain-card-${domain}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 100)
        }}
      />

      {/* [B] 도메인 카드 4개 */}
      <section className="mt-6 grid grid-cols-4 gap-4">
        {DOMAINS.map(domain => (
          <DomainCard
            key={domain}
            domain={domain}
            score={domainScores[domain] ?? 0}
            counts={domainCounts[domain]}
            detail={summary?.domain_detail?.[domain] ?? null}
            issues={allIssues}
            isOpen={openDomain === domain}
            onToggle={() => handleDomainToggle(domain)}
          />
        ))}
      </section>

      {/* [C] 도메인 상세 패널 (아코디언) */}
      {openDomain && (
        <DomainDetailPanel
          domain={openDomain}
          issues={allIssues}
          vocData={vocData}
          attributes={DOMAIN_ATTRIBUTES[openDomain]}
          aiTrigger={DOMAIN_AI_TRIGGERS[openDomain]}
          expandedIssueIdx={expandedIssueIdx}
          onExpandIssue={setExpandedIssueIdx}
          onNavigateToFeed={() => navigate('/voc-feed')}
        />
      )}

      {/* [D] 채널 + 트렌드 */}
      <section className="mt-6 grid grid-cols-[35%_65%] gap-4">
        <ChannelSentimentChart data={channelSentiment} />
        <DomainTrendChart data={trendData} domainScores={domainScores as Record<Domain, number>} />
      </section>
    </main>
  )
}

// ─── [A] 진단 헤더 ───────────────────────────────────────────────────────────
function DiagnosisHeader({
  overallScore, positiveRate, totalVoC, totalIssues, lastDiagnosedAt, earliestCollectedAt, urgentIssues, onUrgentClick
}: {
  overallScore: number
  positiveRate: number
  totalVoC: number
  totalIssues: number
  lastDiagnosedAt: string | null
  earliestCollectedAt: string | null
  urgentIssues: DiagnosisIssue[]
  onUrgentClick: (domain: string) => void
}) {
  const statusLabel = getStatusLabel(overallScore)
  const statusColor = getStatusColor(overallScore)

  // 분석 기간: 가장 오래된 수집일 ~ 가장 최근 진단일
  const endDate = lastDiagnosedAt ? new Date(lastDiagnosedAt) : new Date()
  const startDate = earliestCollectedAt ? new Date(earliestCollectedAt) : new Date(endDate)
  const diffDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
  const fmt = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  const periodText = `${fmt(startDate)} – ${fmt(endDate).slice(5)}`

  return (
    <section className="rounded-xl border border-gray-200 overflow-hidden bg-white">
      {/* 상단 메타 행 */}
      <div className="bg-[#F9FAFB] border-b border-gray-200 px-6 py-3 flex items-center gap-6 text-sm text-gray-600">
        <span><span className="text-gray-400">분석 기간</span> <strong className="text-gray-800">{periodText}</strong> · {diffDays}일</span>
        <span className="text-gray-300">|</span>
        <span><span className="text-gray-400">수집 VoC</span> <strong className="text-gray-800">{totalVoC}건</strong></span>
        <span className="text-gray-300">|</span>
        <span><span className="text-gray-400">분해 이슈</span> <strong className="text-gray-800">{totalIssues}건</strong></span>
        <span className="text-gray-300">|</span>
        <span><span className="text-gray-400">긍정 반응</span> <strong className="text-gray-800">{positiveRate}%</strong></span>
      </div>

      {/* 하단 3칸 */}
      <div className="grid grid-cols-3 divide-x divide-gray-200">
        {/* 좌: 종합 점수 */}
        <div className="px-6 py-5 flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">종합 점수</span>
          <div className="flex items-center gap-3">
            <span className="text-5xl font-bold text-gray-900">{overallScore}</span>
            <div className="flex flex-col gap-1">
              <span className="text-lg text-gray-400 font-light">/ 100</span>
              <span
                className="px-3 py-1 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: statusColor }}
              >
                {statusLabel}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">4개 도메인 가중 평균 기준</p>
        </div>

        {/* 중: 이번 주 전체 패턴 */}
        <div className="px-6 py-5 flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">이번 주 전체 패턴</span>
          <p className="text-sm font-semibold text-gray-800 leading-relaxed">
            UX 탐색 불편이 운영 CS 유입으로 연결되는 연쇄 패턴 감지
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            앱 내 정보 구조 혼란 → 고객센터 문의 증가 → 처리 지연 불만으로 이어지는 도메인 간 연쇄 신호가 반복되고 있습니다. UX·운영 담당팀 공동 대응이 필요합니다.
          </p>
        </div>

        {/* 우: 지금 당장 */}
        <div className="px-6 py-5 flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">지금 당장</span>
          <div className="flex flex-col gap-2">
            {urgentIssues.map((issue, i) => (
              <button
                key={i}
                onClick={() => onUrgentClick(issue.domain)}
                className="flex items-start gap-2 text-left hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors group"
              >
                <span
                  className="shrink-0 mt-0.5 px-2 py-0.5 rounded text-xs font-bold text-white"
                  style={{ backgroundColor: DOMAIN_COLORS[issue.domain] }}
                >
                  {issue.domain}
                </span>
                <span className="text-xs text-gray-700 leading-relaxed group-hover:text-gray-900 line-clamp-2">
                  {issue.issue_summary}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── [B] 도메인 카드 ─────────────────────────────────────────────────────────
function DomainCard({
  domain, score, counts, detail, issues, isOpen, onToggle
}: {
  domain: Domain
  score: number
  counts: { pos: number; neg: number; total: number }
  detail: { score: number | null; prev_score: number | null; diff: number | null; pos: number; neg: number; pos_rate: number } | null
  issues: DiagnosisIssue[]
  isOpen: boolean
  onToggle: () => void
}) {
  const statusLabel = getStatusLabel(score)
  const statusColor = getStatusColor(score)
  const domainColor = DOMAIN_COLORS[domain]
  const topAttrs = useMemo(() => getTopNegativeAttributes(issues, domain, 2), [issues, domain])
  const aiTrigger = DOMAIN_AI_TRIGGERS[domain]

  const diff = detail?.diff ?? null

  return (
    <div
      id={`domain-card-${domain}`}
      className={`bg-white rounded-xl border transition-all ${
        isOpen ? 'border-2 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
      style={{ borderColor: isOpen ? domainColor : undefined }}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-800">{domain}</span>
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: statusColor }}
          >
            {statusLabel}
          </span>
        </div>

        {/* 점수 + 등락 */}
        <div className="flex items-end gap-2">
          <span className="text-[28px] font-bold text-gray-900 leading-none">{score}</span>
          <span className="text-sm text-gray-400 mb-0.5">점</span>
          {diff != null && diff !== 0 && (
            <span
              className="text-xs font-semibold mb-0.5"
              style={{ color: diff > 0 ? '#22C55E' : '#EF4444' }}
            >
              전주 대비 {diff > 0 ? '▲' : '▼'}{Math.abs(diff)}pt
            </span>
          )}
        </div>

        {/* 바 게이지 */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${score}%`, backgroundColor: domainColor }}
          />
        </div>

        {/* 속성 태그 */}
        <div className="flex flex-wrap gap-1.5">
          {topAttrs.map(attr => (
            <span
              key={attr}
              className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 whitespace-nowrap"
            >
              #{attr.replace(/ /g, '')}↓
            </span>
          ))}
          {topAttrs.length === 0 && (
            <span className="text-xs text-gray-400">주요 부정 속성 없음</span>
          )}
        </div>

        {/* AI 트리거 */}
        <p className="text-xs text-gray-500 italic truncate">{aiTrigger}</p>

        {/* 하단 카운트 + 탐색 버튼 */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-600 font-medium">긍정 {detail?.pos ?? counts.pos}건</span>
            <span className="text-red-500 font-medium">부정 {detail?.neg ?? counts.neg}건</span>
            <span className="text-gray-400">(긍정 {detail?.pos_rate ?? (counts.pos + counts.neg > 0 ? Math.round(counts.pos / (counts.pos + counts.neg) * 100) : 0)}%)</span>
          </div>
          <button
            onClick={onToggle}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: isOpen ? domainColor : '#F3F4F6',
              color: isOpen ? '#fff' : '#374151',
            }}
          >
            {isOpen ? '▲ 닫기' : '▼ 탐색'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── [C] 도메인 상세 패널 ────────────────────────────────────────────────────
function DomainDetailPanel({
  domain, issues, vocData, attributes, aiTrigger, expandedIssueIdx, onExpandIssue, onNavigateToFeed
}: {
  domain: Domain
  issues: DiagnosisIssue[]
  vocData: VoCWithPlatform[]
  attributes: string[]
  aiTrigger: string
  expandedIssueIdx: number | null
  onExpandIssue: (idx: number | null) => void
  onNavigateToFeed: () => void
}) {
  const domainColor = DOMAIN_COLORS[domain]
  const domainIssues = useMemo(() => {
    return [...issues.filter(i => i.domain === domain)]
      .sort((a, b) => {
        const negA = a.sentiment === '부정' || a.sentiment === '매우 부정' ? 0 : 1
        const negB = b.sentiment === '부정' || b.sentiment === '매우 부정' ? 0 : 1
        if (negA !== negB) return negA - negB
        const prioA = getPriorityLevel(a, issues) === 'High' ? 0 : 1
        const prioB = getPriorityLevel(b, issues) === 'High' ? 0 : 1
        return prioA - prioB
      })
      .slice(0, 7)
  }, [issues, domain])

  const radarData = useMemo(() => getRadarData(issues, domain, attributes), [issues, domain, attributes])

  const representativeVoices = useMemo(() => {
    return vocData.filter(v =>
      v.issues.some(i =>
        i.domain === domain &&
        (i.sentiment === '부정' || i.sentiment === '매우 부정') &&
        getPriorityLevel(i, issues) === 'High'
      )
    ).slice(0, 2)
  }, [domain, issues, vocData])

  const renderCustomLabel = ({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
    return (
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="#6B7280">
        {payload.value}
      </text>
    )
  }

  return (
    <div
      className="mt-4 rounded-xl border-2 overflow-hidden bg-white"
      style={{ borderColor: domainColor }}
    >
      {/* 패널 헤더 */}
      <div
        className="px-6 py-3 flex items-center gap-3"
        style={{ backgroundColor: domainColor + '15' }}
      >
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: domainColor }}
        />
        <span className="text-sm font-bold text-gray-800">{domain} 도메인 상세 분석</span>
      </div>

      <div className="grid grid-cols-[40%_60%]">
        {/* C-1: 레이더 차트 */}
        <div className="border-r border-gray-200 p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-gray-700">속성별 기대치 vs 실제 경험</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="attr" tick={renderCustomLabel} />
                <Radar
                  name="기대치"
                  dataKey="expectation"
                  stroke="#9CA3AF"
                  strokeDasharray="4 4"
                  fill="#9CA3AF"
                  fillOpacity={0.05}
                />
                <Radar
                  name="실제 경험"
                  dataKey="reality"
                  stroke={domainColor}
                  fill={domainColor}
                  fillOpacity={0.2}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* AI 트리거 박스 */}
          <div
            className="rounded-lg px-4 py-3 text-sm font-medium"
            style={{ backgroundColor: domainColor + '15', color: domainColor }}
          >
            💡 {aiTrigger}
          </div>
        </div>

        {/* C-2: VoC 이슈 테이블 */}
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">VoC 이슈 목록 (상위 7건)</h3>
            <button
              onClick={onNavigateToFeed}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              전체 보기 →
            </button>
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: 320 }}>
            {domainIssues.map((issue, idx) => {
              const priority = getPriorityLevel(issue, issues)
              const isExpanded = expandedIssueIdx === idx
              const vocItem = vocData.find(v => v.issues.includes(issue))

              return (
                <div key={idx} className="rounded-lg border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => onExpandIssue(isExpanded ? null : idx)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* 우선순위 */}
                    <span
                      className="shrink-0 px-2 py-0.5 rounded text-xs font-bold"
                      style={{
                        backgroundColor: priority === 'High' ? '#FEE2E2' : priority === 'Mid' ? '#FEF3C7' : '#F3F4F6',
                        color: priority === 'High' ? '#DC2626' : priority === 'Mid' ? '#D97706' : '#6B7280',
                      }}
                    >
                      {priority}
                    </span>
                    {/* 속성명 */}
                    <span className="shrink-0 text-xs text-gray-500 w-16 truncate">
                      {issue.attributes[0]}
                    </span>
                    {/* 감성 뱃지 */}
                    <span
                      className="shrink-0 px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: SENTIMENT_BG[issue.sentiment],
                        color: SENTIMENT_COLORS[issue.sentiment],
                      }}
                    >
                      {issue.sentiment}
                    </span>
                    {/* 핵심 내용 */}
                    <span className="flex-1 text-xs text-gray-700 truncate">
                      {issue.issue_summary}
                    </span>
                    <span className="shrink-0 text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {isExpanded && vocItem && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
                      <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {vocItem.raw_text}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        <span>출처: <strong>{getPlatformLabel(vocItem)}</strong></span>
                        {vocItem.channel_detail && (
                          <span>채널: <strong>{vocItem.channel_detail}</strong></span>
                        )}
                        {vocItem.service && <span>서비스: <strong>{vocItem.service}</strong></span>}
                      </div>
                      <div className="text-xs text-blue-700 bg-blue-50 rounded px-3 py-2">
                        💼 {issue.action_hint}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* C-3: 대표 보이스 */}
      {representativeVoices.length > 0 && (
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            이번 주 대표 보이스
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {representativeVoices.map(v => (
              <blockquote
                key={v.id}
                className="bg-white rounded-xl border border-gray-200 px-5 py-4 relative"
              >
                <span
                  className="absolute top-3 left-4 text-4xl leading-none font-serif"
                  style={{ color: domainColor, opacity: 0.3 }}
                >
                  "
                </span>
                <p className="text-sm text-gray-700 leading-relaxed pl-4 pt-2 line-clamp-3">
                  {v.raw_text}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: getPlatformColor(v) }}
                  >
                    {getPlatformLabel(v)}
                  </span>
                  {v.channel_detail && (
                    <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                      {v.channel_detail}
                    </span>
                  )}
                  {v.collected_at && (
                    <span>{new Date(v.collected_at).toLocaleDateString('ko-KR')}</span>
                  )}
                </div>
              </blockquote>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── [D-1] 채널별 감성 분포 ──────────────────────────────────────────────────
function ChannelSentimentChart({ data }: { data: ReturnType<typeof calcChannelSentiment> }) {
  const visibleData = data.filter(item => item.vocCount > 0)
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">채널별 감성 분포</h3>
      <div className="flex flex-col gap-3">
        {visibleData.map(item => (
          <div key={item.source} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: SOURCE_COLORS[item.source] ?? '#9CA3AF' }}
                />
                <span className="font-medium">{SOURCE_LABELS[item.source] ?? item.source}</span>
              </div>
              <span className="text-gray-400">{item.vocCount}건</span>
            </div>
            <div className="flex h-5 rounded-full overflow-hidden bg-gray-100">
              {item.positive > 0 && (
                <div
                  className="h-full flex items-center justify-center text-[10px] text-white font-medium"
                  style={{ width: `${item.positive}%`, backgroundColor: '#22C55E' }}
                >
                  {item.positive >= 10 ? `${item.positive}%` : ''}
                </div>
              )}
              {item.neutral > 0 && (
                <div
                  className="h-full flex items-center justify-center text-[10px] text-white font-medium"
                  style={{ width: `${item.neutral}%`, backgroundColor: '#9CA3AF' }}
                >
                  {item.neutral >= 10 ? `${item.neutral}%` : ''}
                </div>
              )}
              {item.negative > 0 && (
                <div
                  className="h-full flex items-center justify-center text-[10px] text-white font-medium"
                  style={{ width: `${item.negative}%`, backgroundColor: '#EF4444' }}
                >
                  {item.negative >= 10 ? `${item.negative}%` : ''}
                </div>
              )}
            </div>
            <div className="flex gap-3 text-[10px] text-gray-500">
              <span className="text-green-600">긍정 {item.positive}%</span>
              <span className="text-gray-400">중립 {item.neutral}%</span>
              <span className="text-red-500">부정 {item.negative}%</span>
            </div>
          </div>
        ))}
      </div>
      {/* 범례 */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />긍정</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-400 inline-block" />중립</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />부정</span>
      </div>
    </div>
  )
}

// ─── [D-2] 도메인 점수 추이 ──────────────────────────────────────────────────
function DomainTrendChart({
  data, domainScores
}: {
  data: { week: string; 전략: number | null; UX: number | null; 운영: number | null; 기술: number | null; _noData?: boolean }[]
  domainScores: Record<Domain, number>
}) {
  // 데이터 없는 구간 찾기
  const noDataRanges: { x1: string; x2: string }[] = []
  for (let i = 0; i < data.length; i++) {
    if (data[i]._noData) {
      const start = data[i].week
      let end = start
      while (i + 1 < data.length && data[i + 1]._noData) {
        end = data[++i].week
      }
      noDataRanges.push({ x1: start, x2: end })
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">도메인 점수 추이 (최근 4주)</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="week"
              tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
                const [label, range] = (payload.value || '').split('\n')
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text x={0} y={0} dy={12} textAnchor="middle" fontSize={11} fill="#6B7280" fontWeight={500}>{label}</text>
                    <text x={0} y={0} dy={26} textAnchor="middle" fontSize={9} fill="#9CA3AF">{range}</text>
                  </g>
                )
              }}
              height={45}
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
              formatter={(value: number | null, name: string) => value != null ? [`${value}점`, name] : ['데이터 없음', name]}
            />
            <Legend formatter={(value) => <span style={{ fontSize: 12, color: '#6B7280' }}>{value}</span>} />
            {noDataRanges.map((range, i) => (
              <ReferenceArea
                key={i}
                x1={range.x1}
                x2={range.x2}
                fill="#F3F4F6"
                fillOpacity={0.8}
                label={undefined}
              />
            ))}
            {DOMAINS.map(d => (
              <Line
                key={d}
                type="monotone"
                dataKey={d}
                stroke={DOMAIN_COLORS[d]}
                strokeWidth={2}
                dot={{ r: 4, fill: DOMAIN_COLORS[d] }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* 현재 점수 요약 */}
      <div className="mt-4 grid grid-cols-4 gap-3">
        {DOMAINS.map(d => {
          const score = domainScores[d] ?? 0
          const statusLabel = getStatusLabel(score)
          const statusColor = getStatusColor(score)
          return (
            <div key={d} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-gray-50">
              <span className="text-xs text-gray-500">{d}</span>
              <span className="text-lg font-bold text-gray-900">{score}</span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: statusColor }}
              >
                {statusLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}