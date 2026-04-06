import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'

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
    ? new Date(summary.last_diagnosed_at).toLocaleDateString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).replace(/\. /g, '.').replace(/\.$/, '')
    : '-'

  return (
    <header
      className="sticky top-0 z-50 bg-white border-b border-gray-200"
      style={{ minWidth: 1280 }}
    >
      <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between gap-6">
        {/* 좌: 로고 */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col leading-tight">
            <span className="text-base font-bold text-gray-900 tracking-tight">언더그라운드</span>
            <span className="text-[10px] text-gray-400 leading-none">수면 아래 진짜 보이스 탐지기</span>
          </div>
        </div>

        {/* 중: 탭 네비게이션 */}
        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            종합 진단
          </NavLink>
          <NavLink
            to="/voc-feed"
            className={({ isActive }) =>
              `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            VoC 피드
          </NavLink>
          <NavLink
            to="/guide"
            className={({ isActive }) =>
              `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            분석 기준 가이드
          </NavLink>
        </nav>

        {/* 우: 전체 지표 */}
        <div className="flex items-center gap-4 shrink-0 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <span className="text-gray-400">VoC</span>
            <span className="font-semibold text-gray-800">{totalVoC.toLocaleString()}건</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1">
            <span className="text-gray-400">이슈</span>
            <span className="font-semibold text-gray-800">{totalIssues.toLocaleString()}건</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1">
            <span className="text-gray-400">기준</span>
            <span className="font-semibold text-gray-800">{baseDate}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
