import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import minerLoaderGif from '../assets/image-1.gif'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea, ReferenceLine,
} from 'recharts'
import { DiagnosedVoC, DiagnosisIssue } from '../types'
import {
  calcDomainScore, calcOverallScore, getStatusLabel, getStatusColor,
  calcPositiveRate, calcChannelSentiment, getTopNegativeAttributes,
  getRadarData, generate4WeekTrend, getGapDisplayLabel, getGapStatusColor,
} from '../utils/analysisUtils'
import { DOMAIN_COLORS, SOURCE_LABELS, SOURCE_COLORS } from '../constants/colors'
import { DOMAINS, DOMAIN_ATTRIBUTES, type Domain } from '../constants/platforms'
import { StatusBadge, DomainTag, SentimentTag, GapTag, MutedChip, HashAttributeTag } from '../components/tags'
import { PixelBar } from '../components/pixel-bar'
import { MultiSegmentPixelBar } from '../components/multi-segment-pixel-bar'

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
  daily_scores: { day: string; [domain: string]: string | number }[]
  events: {
    id: number
    event_date: string
    title: string
    type: string
    description: string
    daily_impacts: Record<string, number>
    weekly_impacts: Record<string, number>
  }[]
  domain_insights: Record<string, { insight: string; top_attributes: string[] }>
  weekly_pattern: { title: string; body: string } | null
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
    const labels = ['2주 전', '1주 전', '이번 주'] as const
    const now = new Date()
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() - now.getDay() + 1)
    const pad = (n: number) => String(n).padStart(2, '0')
    const fmtRange = (mon: Date) => {
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      return `${pad(mon.getMonth() + 1)}.${pad(mon.getDate())}~${pad(sun.getMonth() + 1)}.${pad(sun.getDate())}`
    }

    // 2주 전, 1주 전, 이번 주의 월요일
    const weekMondays = Array.from({ length: 3 }, (_, i) => {
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
      const hasData = !!data
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
      <div className="size-full flex flex-col items-center justify-center min-h-screen">
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
          <span className="text-4xl">&#x26A0;&#xFE0F;</span>
          <p className="text-sm font-semibold" style={{ color: '#E8EDE0' }}>데이터 로드 실패</p>
          <p className="text-xs" style={{ color: '#8A9980' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 text-white text-sm rounded-lg hover:brightness-110 transition-colors"
            style={{ backgroundColor: '#0D77EE' }}
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
        weeklyPattern={summary?.weekly_pattern ?? null}
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
            insight={summary?.domain_insights?.[domain]?.insight ?? ''}
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
          aiTrigger={summary?.domain_insights?.[openDomain]?.insight ?? ''}
          expandedIssueIdx={expandedIssueIdx}
          onExpandIssue={setExpandedIssueIdx}
          onNavigateToFeed={() => navigate('/voc-feed')}
        />
      )}

      {/* [D] 채널 + 트렌드 */}
      <section className="mt-6 grid grid-cols-[35%_65%] gap-4">
        <ChannelSentimentChart data={channelSentiment} />
        <DomainTrendChart data={trendData} dailyData={summary?.daily_scores ?? []} events={summary?.events ?? []} domainScores={domainScores as Record<Domain, number>} />
      </section>
    </main>
  )
}

// ─── [A] 진단 헤더 ───────────────────────────────────────────────────────────
function DiagnosisHeader({
  overallScore, positiveRate, totalVoC, totalIssues, lastDiagnosedAt, earliestCollectedAt, weeklyPattern, urgentIssues, onUrgentClick
}: {
  overallScore: number
  positiveRate: number
  totalVoC: number
  totalIssues: number
  lastDiagnosedAt: string | null
  earliestCollectedAt: string | null
  weeklyPattern: { title: string; body: string } | null
  urgentIssues: DiagnosisIssue[]
  onUrgentClick: (domain: string) => void
}) {
  const statusLabel = getStatusLabel(overallScore)

  // 분석 기간: 가장 오래된 수집일 ~ 가장 최근 진단일
  const endDate = lastDiagnosedAt ? new Date(lastDiagnosedAt) : new Date()
  const startDate = earliestCollectedAt ? new Date(earliestCollectedAt) : new Date(endDate)
  const diffDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
  const fmt = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  const periodText = `${fmt(startDate)} – ${fmt(endDate).slice(5)}`

  return (
    <section
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: '#1A1D18',
        border: '1px solid #2E3329',
        boxShadow: '0 0 8px rgba(94, 232, 106, 0.08)',
      }}
    >
      {/* 상단 메타 행 */}
      <div className="px-6 py-4 flex items-center gap-6 text-sm border-b border-[#2E3329]">
        <span>
          <span style={{ color: '#8A9980' }}>분석 기간</span>{' '}
          <strong className="font-mono" style={{ color: '#5EE86A' }}>{periodText}</strong>
          <span style={{ color: '#8A9980' }}> · {diffDays}일</span>
        </span>
        <span style={{ color: '#2E3329' }}>|</span>
        <span>
          <span style={{ color: '#8A9980' }}>수집 VoC</span>{' '}
          <strong className="font-mono" style={{ color: '#5EE86A' }}>{totalVoC}건</strong>
        </span>
        <span style={{ color: '#2E3329' }}>|</span>
        <span>
          <span style={{ color: '#8A9980' }}>진단 이슈</span>{' '}
          <strong className="font-mono" style={{ color: '#5EE86A' }}>{totalIssues}건</strong>
        </span>
        <span style={{ color: '#2E3329' }}>|</span>
        <span>
          <span style={{ color: '#8A9980' }}>긍정 반응</span>{' '}
          <strong className="font-mono" style={{ color: '#5EE86A' }}>{positiveRate}%</strong>
        </span>
      </div>

      {/* 하단 3칸 */}
      <div className="grid grid-cols-3 divide-x divide-[#2E3329]">
        {/* 좌: 종합 점수 */}
        <div className="p-6 relative overflow-hidden">
          {/* dot-grid overlay */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(94,232,106,0.15) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />
          <div className="relative z-10">
            <h3 className="text-sm font-medium font-bold mb-4" style={{ color: '#8A9980' }}>종합 점수</h3>
            <div className="flex items-baseline gap-3 mb-2">
              <div className="text-5xl font-bold font-mono" style={{ color: '#E8EDE0' }}>{overallScore}</div>
              <div className="text-lg" style={{ color: '#8A9980' }}>/ 100</div>
            </div>
            <div className="mb-3">
              <StatusBadge status={statusLabel as '탁월' | '보통' | '주의' | '위험'} />
            </div>
            <p className="text-sm" style={{ color: '#8A9980' }}>4개 도메인 가중 평균 기준</p>
          </div>
        </div>

        {/* 중: 이번 주 진짜 패턴 */}
        <div className="p-6">
          <h3 className="text-sm font-medium font-bold mb-4" style={{ color: '#8A9980' }}>이번 주 진짜 패턴</h3>
          <h4 className="font-medium mb-3" style={{ color: '#E8EDE0' }}>
            {weeklyPattern?.title ?? '패턴 분석 대기 중'}
          </h4>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#8A9980' }}>
            {weeklyPattern?.body ?? '다음 진단 실행 시 자동으로 생성됩니다.'}
          </p>
        </div>

        {/* 우: 지금 당장 */}
        <div className="p-6">
          <h3 className="text-sm font-medium font-bold mb-4" style={{ color: '#8A9980' }}>지금 당장</h3>
          <div className="flex flex-col gap-2">
            {urgentIssues.map((issue, i) => (
              <button
                key={i}
                onClick={() => onUrgentClick(issue.domain)}
                className="flex items-start gap-2 text-left rounded-lg p-2 -mx-2 transition-colors group"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#111410')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <DomainTag domain={issue.domain as '전략' | 'UX' | '운영' | '기술'} />
                <span className="text-xs leading-relaxed line-clamp-2" style={{ color: '#E8EDE0' }}>
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
  domain, score, counts, detail, insight, issues, isOpen, onToggle
}: {
  domain: Domain
  score: number
  counts: { pos: number; neg: number; total: number }
  detail: { score: number | null; prev_score: number | null; diff: number | null; pos: number; neg: number; pos_rate: number } | null
  insight: string
  issues: DiagnosisIssue[]
  isOpen: boolean
  onToggle: () => void
}) {
  const statusLabel = getStatusLabel(score)
  const domainColor = DOMAIN_COLORS[domain]
  const topAttrs = useMemo(() => getTopNegativeAttributes(issues, domain, 2), [issues, domain])
  const aiTrigger = insight

  const diff = detail?.diff ?? null

  return (
    <div
      id={`domain-card-${domain}`}
      className="p-6 rounded-lg transition-all"
      style={{
        backgroundColor: '#1A1D18',
        border: isOpen ? `1px solid ${domainColor}` : '1px solid #2E3329',
        boxShadow: isOpen ? `0 0 8px ${domainColor}33` : '0 0 8px rgba(94, 232, 106, 0.08)',
      }}
    >
      <div className="flex flex-col gap-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: domainColor }} />
            <span className="text-lg font-bold" style={{ color: '#E8EDE0' }}>{domain}</span>
          </div>
          <StatusBadge status={statusLabel as '탁월' | '보통' | '주의' | '위험'} />
        </div>

        {/* 점수 + 등락 */}
        <div className="flex items-baseline gap-2 mb-2">
          <div className="text-3xl font-bold font-mono" style={{ color: '#E8EDE0' }}>{score}</div>
          <div className="text-lg" style={{ color: '#8A9980' }}>점</div>
          {diff != null && diff !== 0 && (
            <div className="text-sm" style={{ color: '#8A9980' }}>
              전주 대비{' '}
              <span style={{ color: diff > 0 ? '#5EE86A' : '#EF4444' }}>
                {diff > 0 ? '▲' : '▼'}{Math.abs(diff)}pt
              </span>
            </div>
          )}
        </div>

        {/* 픽셀 바 게이지 */}
        <PixelBar value={score} color={domainColor} height={8} blockSize={12} gap={3} />

        {/* 속성 태그 */}
        <div className="flex flex-wrap gap-1.5">
          {topAttrs.map(attr => (
            <HashAttributeTag key={attr} attribute={attr.replace(/ /g, '')} direction="down" />
          ))}
          {topAttrs.length === 0 && (
            <span className="text-xs" style={{ color: '#8A9980' }}>주요 부정 속성 없음</span>
          )}
        </div>

        {/* AI 트리거 */}
        <p
          className="p-3 rounded text-sm font-medium truncate"
          style={{ backgroundColor: '#111410', color: '#E8EDE0' }}
        >
          {aiTrigger}
        </p>

        {/* 하단 카운트 + 탐색 버튼 */}
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-mono whitespace-nowrap">
            <span style={{ color: '#8A9980' }}>
              긍정 <span style={{ color: '#5EE86A' }}>{detail?.pos ?? counts.pos}건</span>
            </span>
            <span style={{ color: '#8A9980' }}>
              부정 <span style={{ color: '#EF4444' }}>{detail?.neg ?? counts.neg}건</span>
            </span>
            <span style={{ color: '#8A9980' }}>
              (긍정 <span style={{ color: '#5EE86A' }}>{detail?.pos_rate ?? (counts.pos + counts.neg > 0 ? Math.round(counts.pos / (counts.pos + counts.neg) * 100) : 0)}%</span>)
            </span>
          </div>
          <button
            onClick={onToggle}
            className="flex items-center gap-1 text-sm font-medium whitespace-nowrap flex-shrink-0"
            style={{ color: '#5EE86A' }}
          >
            <span>{isOpen ? '접기' : '탐색'}</span>
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
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
        return a.gap - b.gap
      })
      .slice(0, 7)
  }, [issues, domain])

  const radarData = useMemo(() => getRadarData(issues, domain, attributes), [issues, domain, attributes])

  const representativeVoices = useMemo(() => {
    return vocData.filter(v =>
      v.issues.some(i =>
        i.domain === domain &&
        (i.sentiment === '부정' || i.sentiment === '매우 부정')
      )
    ).slice(0, 2)
  }, [domain, issues, vocData])

  const renderCustomLabel = ({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
    return (
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="#8A9980">
        {payload.value}
      </text>
    )
  }

  // Helper to get gap type from gap number
  const getGapType = (gap: number): '기대 초과' | '기대 충족' | '기대 이하' => {
    if (gap > 5) return '기대 초과'
    if (gap >= -5) return '기대 충족'
    return '기대 이하'
  }

  return (
    <div
      className="mt-4 rounded-b-lg overflow-hidden border-x border-b border-[#2E3329]"
      style={{ backgroundColor: '#111410' }}
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
        <span className="text-sm font-bold" style={{ color: '#E8EDE0' }}>{domain} 도메인 상세 분석</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* C-1: 레이더 차트 */}
        <div className="p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold" style={{ color: '#E8EDE0' }}>속성별 기대치 vs 실제 경험</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#2E3329" />
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
                  formatter={(value) => <span className="text-xs" style={{ color: '#8A9980' }}>{value}</span>}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* AI 코멘트 박스 */}
          <div
            className="rounded-lg px-4 py-3 text-sm font-medium bg-[rgba(94,232,106,0.08)] border border-[rgba(94,232,106,0.15)]"
            style={{ color: domainColor }}
          >
            {aiTrigger}
          </div>
        </div>

        {/* C-2: VoC 이슈 테이블 */}
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: '#E8EDE0' }}>VoC 이슈 목록 (상위 7건)</h3>
            <button
              onClick={onNavigateToFeed}
              className="text-xs font-medium"
              style={{ color: '#8A9980' }}
            >
              전체 보기 →
            </button>
          </div>

          <div className="space-y-2 w-full">
            {domainIssues.map((issue, idx) => {
              const isExpanded = expandedIssueIdx === idx
              const vocItem = vocData.find(v => v.issues.includes(issue))
              const gapType = getGapType(issue.gap)

              return (
                <div key={idx} className="w-full" style={{ minWidth: 0 }}>
                  <div
                    className="p-3 rounded border cursor-pointer hover:border-[#5EE86A]/25 transition-colors w-full"
                    style={{ background: '#1A1D18', borderColor: '#2E3329' }}
                    onClick={() => onExpandIssue(isExpanded ? null : idx)}
                  >
                    {/* Single Row Layout */}
                    <div className="flex flex-row items-center gap-2 w-full" style={{ minWidth: 0 }}>
                      <div className="flex-shrink-0">
                        <MutedChip label={issue.attributes[0] || ''} variant="solid" />
                      </div>
                      <div className="flex-shrink-0">
                        <SentimentTag sentiment={issue.sentiment as '매우 긍정' | '긍정' | '중립' | '부정' | '매우 부정'} />
                      </div>
                      <div className="flex-shrink-0">
                        <GapTag type={gapType} value={issue.gap} />
                      </div>
                      <p className="text-sm flex-1 overflow-hidden text-ellipsis" style={{ color: '#E8EDE0', minWidth: 0 }}>
                        {issue.issue_summary}
                      </p>
                      <svg
                        className={`w-4 h-4 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        style={{ color: '#8A9980' }}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && vocItem && (
                      <div className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px dashed #2E3329' }}>
                        <div>
                          <div className="text-xs font-medium mb-1" style={{ color: '#8A9980' }}>원본 VoC</div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#E8EDE0' }}>
                            {vocItem.raw_text}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span style={{ color: '#8A9980' }}>출처:</span>
                          <MutedChip label={getPlatformLabel(vocItem)} variant="outline" />
                          {vocItem.channel_detail && (
                            <MutedChip label={vocItem.channel_detail} variant="outline" />
                          )}
                        </div>

                        <div className="p-3 rounded" style={{ background: '#0E0F0E' }}>
                          <div className="text-xs font-medium mb-1" style={{ color: '#8A9980' }}>액션 힌트</div>
                          <p className="text-sm" style={{ color: '#E8EDE0' }}>{issue.action_hint}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* C-3: 대표 보이스 */}
      {representativeVoices.length > 0 && (
        <div className="px-6 py-4 border-t border-[#2E3329]">
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#8A9980' }}>
            이번 주 대표 보이스
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {representativeVoices.map(v => (
              <div
                key={v.id}
                className="rounded-lg px-5 py-4"
                style={{
                  backgroundColor: '#1A1D18',
                  border: '1px solid #2E3329',
                  borderLeft: '2px solid #5EE86A',
                }}
              >
                <p className="text-sm leading-relaxed line-clamp-3" style={{ color: '#E8EDE0' }}>
                  {v.raw_text}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs flex-wrap" style={{ color: '#8A9980' }}>
                  <MutedChip label={getPlatformLabel(v)} variant="outline" />
                  {v.channel_detail && (
                    <MutedChip label={v.channel_detail} variant="outline" />
                  )}
                  {v.collected_at && (
                    <span>{new Date(v.collected_at).toLocaleDateString('ko-KR')}</span>
                  )}
                </div>
              </div>
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
    <div
      className="rounded-lg p-5"
      style={{
        backgroundColor: '#1A1D18',
        border: '1px solid #2E3329',
        boxShadow: '0 0 8px rgba(94, 232, 106, 0.08)',
      }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: '#E8EDE0' }}>채널별 감성 분포</h3>
      <div className="flex flex-col gap-4">
        {visibleData.map(item => (
          <div key={item.source} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: '#E8EDE0' }}>
                {SOURCE_LABELS[item.source] ?? item.source}
              </span>
              <span className="text-xs font-mono" style={{ color: '#8A9980' }}>{item.vocCount}건</span>
            </div>
            <MultiSegmentPixelBar
              segments={[
                { value: item.positive, color: '#5EE86A' },
                { value: item.neutral, color: '#4A5540' },
                { value: item.negative, color: '#EF4444' },
              ]}
              height={24}
              blockSize={8}
              gap={2}
            />
            <div className="flex gap-3 text-xs font-mono">
              <span><span style={{ color: '#8A9980' }}>긍정 </span><span style={{ color: '#5EE86A' }}>{item.positive}%</span></span>
              <span><span style={{ color: '#8A9980' }}>중립 </span><span style={{ color: '#4A5540' }}>{item.neutral}%</span></span>
              <span><span style={{ color: '#8A9980' }}>부정 </span><span style={{ color: '#EF4444' }}>{item.negative}%</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── [D-2] 도메인 점수 추이 ──────────────────────────────────────────────────
const EVENT_EMOJI: Record<string, string> = {
  '업데이트': '🔄',
  '장애': '⚠️',
  '프로모션': '📣',
  '기타': '📌',
}

function DomainTrendChart({
  data, dailyData, events, domainScores
}: {
  data: { week: string; 전략: number | null; UX: number | null; 운영: number | null; 기술: number | null; _noData?: boolean }[]
  dailyData: { day: string; [domain: string]: string | number }[]
  events: SummaryData['events']
  domainScores: Record<Domain, number>
}) {
  const [mode, setMode] = useState<'week' | 'day'>('week')

  const chartData = mode === 'week' ? data : dailyData.map(d => ({
    week: d.day as string,
    전략: (d['전략'] as number) ?? null,
    UX: (d['UX'] as number) ?? null,
    운영: (d['운영'] as number) ?? null,
    기술: (d['기술'] as number) ?? null,
    _noData: false,
  }))

  // 데이터 없는 구간 찾기 (주별만)
  const noDataRanges: { x1: string; x2: string }[] = []
  if (mode === 'week') {
    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i]._noData) {
        const start = chartData[i].week
        let end = start
        while (i + 1 < chartData.length && chartData[i + 1]._noData) {
          end = data[++i].week
        }
        noDataRanges.push({ x1: start, x2: end })
      }
    }
  }

  return (
    <div
      className="rounded-lg p-5"
      style={{
        backgroundColor: '#1A1D18',
        border: '1px solid #2E3329',
        boxShadow: '0 0 8px rgba(94, 232, 106, 0.08)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: '#E8EDE0' }}>
          도메인 점수 추이 ({mode === 'week' ? '최근 3주' : '최근 14일'})
        </h3>
        <div className="flex gap-1">
          {([['day', '일'], ['week', '주']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className="px-3 py-1 rounded text-xs font-medium transition-colors"
              style={{
                backgroundColor: mode === key ? '#2E3329' : 'transparent',
                color: mode === key ? '#5EE86A' : '#8A9980',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-80 rounded" style={{ backgroundColor: '#111410' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2218" />
            <XAxis
              dataKey="week"
              tick={mode === 'day'
                ? { fontSize: 11, fill: '#8A9980' }
                : (({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
                    const [label, range] = (payload.value || '').split('\n')
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text x={0} y={0} dy={12} textAnchor="middle" fontSize={11} fill="#8A9980" fontWeight={500}>{label}</text>
                        <text x={0} y={0} dy={26} textAnchor="middle" fontSize={9} fill="#8A9980">{range}</text>
                      </g>
                    )
                  }) as any}
              height={mode === 'day' ? 30 : 45}
            />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#8A9980' }} />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid #2E3329',
                backgroundColor: '#1A1D18',
                color: '#E8EDE0',
              }}
              formatter={(value: number | null, name: string) => value != null ? [`${value}점`, name] : ['데이터 없음', name]}
              content={({ active, payload, label }) => {
                if (!active || !payload) return null
                const ed = new Date()
                const matchedEvent = events.find(evt => {
                  const evtDate = new Date(evt.event_date)
                  const dayLabel = `${String(evtDate.getMonth() + 1).padStart(2, '0')}.${String(evtDate.getDate()).padStart(2, '0')}`
                  if (mode === 'day') return label === dayLabel
                  return (label || '').includes(dayLabel)
                })
                const impacts = matchedEvent ? (mode === 'day' ? matchedEvent.daily_impacts : matchedEvent.weekly_impacts) : null
                return (
                  <div style={{ backgroundColor: '#1A1D18', border: '1px solid #2E3329', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#E8EDE0' }}>
                    <div style={{ marginBottom: 4, color: '#8A9980' }}>{label}</div>
                    {payload.filter(p => p.value != null).map((p: any) => (
                      <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value}점</div>
                    ))}
                    {matchedEvent && (
                      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed #2E3329' }}>
                        <div style={{ color: '#5EE86A', fontWeight: 600 }}>
                          {EVENT_EMOJI[matchedEvent.type]} {matchedEvent.title}
                        </div>
                        {matchedEvent.description && (
                          <div style={{ color: '#8A9980', marginTop: 2 }}>{matchedEvent.description}</div>
                        )}
                        {impacts && Object.keys(impacts).length > 0 && (
                          <div style={{ marginTop: 4, color: '#8A9980' }}>
                            영향: {Object.entries(impacts).map(([d, v]) => `${d} ${v > 0 ? '+' : ''}${v}`).join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              }}
            />

            {/* 이벤트 마킹 */}
            {events.map(evt => {
              const ed = new Date(evt.event_date)
              const dayLabel = `${String(ed.getMonth() + 1).padStart(2, '0')}.${String(ed.getDate()).padStart(2, '0')}`
              // 주별: 해당 주의 week 라벨 매칭, 일별: dayLabel 직접 매칭
              const xKey = mode === 'day' ? dayLabel : chartData.find(d => {
                const range = (d.week || '').split('\n')[1] || ''
                return range.includes(dayLabel)
              })?.week
              if (!xKey) return null
              const impacts = mode === 'day' ? evt.daily_impacts : evt.weekly_impacts
              const emoji = EVENT_EMOJI[evt.type] || '📌'
              return (
                <ReferenceLine
                  key={evt.id}
                  x={xKey}
                  stroke="#5EE86A"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{
                    value: emoji,
                    position: 'top',
                    fontSize: 16,
                    offset: 5,
                  }}
                />
              )
            })}
            {noDataRanges.map((range, i) => (
              <ReferenceArea
                key={i}
                x1={range.x1}
                x2={range.x2}
                fill="#2E3329"
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
          const color = DOMAIN_COLORS[d]
          return (
            <div
              key={d}
              className="flex flex-col items-center gap-2 px-3 py-3 rounded-lg"
              style={{ backgroundColor: '#111410' }}
            >
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-sm font-medium" style={{ color }}>{d}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold font-mono" style={{ color: '#E8EDE0' }}>{score}</span>
                <StatusBadge status={statusLabel as '탁월' | '보통' | '주의' | '위험'} size="sm" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
