import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import logoImage from '../assets/logo.png'

const API_BASE = 'https://voc-api-production.up.railway.app'

interface SummaryData {
  total_voc: number
  total_issues: number
  last_diagnosed_at: string | null
}

export default function GNB() {
  const [summary, setSummary] = useState<SummaryData | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/summary`)
      .then(res => res.json())
      .then(data => setSummary(data))
      .catch(() => {})
  }, [])

  const totalVoC = summary?.total_voc ?? 0
  const totalIssues = summary?.total_issues ?? 0
  const baseDate = summary?.last_diagnosed_at
    ? (() => {
        const d = new Date(summary.last_diagnosed_at)
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
      })()
    : '-'

  return (
    <header
      className="sticky top-0 z-50 bg-surface border-b border-surface-border"
      style={{ minWidth: 1280 }}
    >
      <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between gap-6">
        {/* 좌: 로고 */}
        <div className="flex items-center gap-3 shrink-0">
          <img src={logoImage} alt="Underground Logo" className="w-10 h-10" />
          <div className="flex flex-col leading-tight">
            <span className="text-base font-bold text-txt-primary tracking-tight">언더그라운드</span>
            <span className="text-[10px] text-txt-muted leading-none">수면 아래 전략 보이스 탐지기</span>
          </div>
        </div>

        {/* 중: 탭 네비게이션 */}
        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                isActive
                  ? 'text-accent-green border-accent-green'
                  : 'text-txt-muted border-transparent hover:text-txt-primary'
              }`
            }
          >
            종합 진단
          </NavLink>
          <NavLink
            to="/voc-feed"
            className={({ isActive }) =>
              `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                isActive
                  ? 'text-accent-green border-accent-green'
                  : 'text-txt-muted border-transparent hover:text-txt-primary'
              }`
            }
          >
            VoC 피드
          </NavLink>
          <NavLink
            to="/guide"
            className={({ isActive }) =>
              `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                isActive
                  ? 'text-accent-green border-accent-green'
                  : 'text-txt-muted border-transparent hover:text-txt-primary'
              }`
            }
          >
            분석 기준 가이드
          </NavLink>
        </nav>

        {/* 우: 전체 지표 */}
        <div className="flex items-center gap-4 shrink-0 text-sm text-txt-muted">
          <div className="flex items-center gap-1">
            <span className="text-accent-green">●</span>
            <span>VoC</span>
            <span className="font-mono font-semibold text-txt-primary">{totalVoC.toLocaleString()}건</span>
          </div>
          <div className="w-px h-4 bg-surface-border" />
          <div className="flex items-center gap-1">
            <span>이슈</span>
            <span className="font-mono font-semibold text-txt-primary">{totalIssues.toLocaleString()}건</span>
          </div>
          <div className="w-px h-4 bg-surface-border" />
          <div className="flex items-center gap-1">
            <span>기준</span>
            <span className="font-mono font-semibold text-txt-primary">{baseDate}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
