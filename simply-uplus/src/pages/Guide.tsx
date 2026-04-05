import { useState } from 'react'
import { DOMAIN_COLORS } from '../constants/colors'

const DOMAINS = ['전략', 'UX', '운영', '기술'] as const
type Domain = typeof DOMAINS[number]

const DOMAIN_ATTRIBUTES: Record<Domain, { name: string; experience: string; definition: string; keywords: string }[]> = {
  '전략': [
    { name: '가격 합리성', experience: '경제성', definition: '기능/품질/시장 대비 가격의 합리성', keywords: '"비싸다", "가격이 납득 안 된다", 타사 가격 비교' },
    { name: '혜택 체감성', experience: '경제성', definition: '포인트/할인 등 실질적 혜택 체감', keywords: '"혜택이 없다", "포인트가 안 쌓인다", "할인이 안 된다"' },
    { name: '지불 유연성', experience: '경제성', definition: '다양한 지불 옵션의 선택/변경 자유도', keywords: '"결합 변경이 안 된다", "약정 조건이 불합리하다"' },
    { name: '기능 보편성', experience: '적합성', definition: '업계 기본 기능을 빠짐없이 제공', keywords: '"이런 기능도 없나", "기본도 안 된다"' },
    { name: '타겟 적합성', experience: '적합성', definition: '사용자 특성 맞춤 설계', keywords: '"내 나이대에 안 맞는다", "노인용 UI 같다"' },
    { name: '맥락 적합성', experience: '적합성', definition: '현재 상황/위치/시간에 맞는 반응', keywords: '"지금 이 상황에 맞지 않는다"' },
    { name: '개인 맞춤화', experience: '적합성', definition: '개인 취향/이력 기반 경험 최적화', keywords: '"내 취향을 전혀 모른다", "개인화가 안 된다"' },
  ],
  'UX': [
    { name: '효율성', experience: '편의성', definition: '최소 행동으로 과업 완수', keywords: '"단계가 너무 많다", "찾는 데 오래 걸린다"' },
    { name: '간결성', experience: '편의성', definition: '핵심 정보 중심의 정돈된 상태', keywords: '"너무 복잡하다", "정보가 너무 많다", "지저분하다"' },
    { name: '오류방지성', experience: '편의성', definition: '실수 방지 및 쉬운 복구 설계', keywords: '"실수로 잘못 눌렀다", "취소가 안 된다", "되돌리기 없다"' },
    { name: '연동성', experience: '편의성', definition: '타 앱/기기와의 자연스러운 연결', keywords: '"다른 기기와 연결이 안 된다", "끊긴다"' },
    { name: '사용자 제어', experience: '편의성', definition: '본인 통제 하에 경험 조절', keywords: '"내 마음대로 설정이 안 된다", "강제로 된다"' },
    { name: '학습용이성', experience: '직관성', definition: '설명 없이도 기능 습득 가능', keywords: '"어떻게 쓰는지 모르겠다", "설명이 없다"' },
    { name: '정보가독성', experience: '직관성', definition: '텍스트/시각 정보의 쉬운 인지', keywords: '"글자가 작다", "내용 파악이 안 된다"' },
    { name: '일관성', experience: '직관성', definition: '동일한 규칙의 화면/용어/동작', keywords: '"버튼 위치가 계속 바뀐다", "용어가 제각각이다"' },
    { name: '정보구조화', experience: '직관성', definition: '논리적/계층적 콘텐츠 배치', keywords: '"메뉴를 못 찾겠다", "어디에 있는지 모르겠다"' },
    { name: '예측가능성', experience: '직관성', definition: '조작 시 기대한 결과의 일관된 발생', keywords: '"눌렀더니 예상과 다른 화면이 나왔다"' },
    { name: '시각적 조화성', experience: '심미성', definition: '컬러/폰트/정렬 등의 조화로운 어울림', keywords: '"색이 이상하다", "디자인이 안 맞는다"' },
    { name: '디자인 완성도', experience: '심미성', definition: '디테일 마감 및 요소 간 결함 없음', keywords: '"엉성하다", "허름해 보인다", "마감이 안 된 느낌"' },
    { name: '공감성', experience: '감성', definition: '기분과 상황에 공감하는 피드백', keywords: '"나를 이해 못한다", "로봇 같다"' },
    { name: '유희성', experience: '감성', definition: '재미, 위트, 감성적 만족 요소', keywords: '"재미없다", "딱딱하다"' },
    { name: '의외성', experience: '감성', definition: '예상을 뛰어넘는 신선한 감동', keywords: '"이런 것도 되네", "놀랍다", "예상 밖이다" (긍정)' },
  ],
  '운영': [
    { name: '지원 신속성', experience: '고객지원성', definition: '문제 발생 시 빠른 응답과 처리', keywords: '"고객센터 연결이 안 된다", "응답이 너무 느리다"' },
    { name: '처리 정확성', experience: '고객지원성', definition: '첫 시도에 정확한 문제 해결', keywords: '"같은 문제가 또 생겼다", "해결이 안 됐다"' },
    { name: '채널 접근성', experience: '고객지원성', definition: '원하는 방식의 쉬운 도움 요청', keywords: '"전화 연결이 안 된다", "채팅 상담을 못 찾겠다"' },
    { name: '투명성', experience: '고객지원성', definition: '요금·프로모션 조건, 사고 대응 절차 등 숨김 없이 명확히 공개', keywords: '"요금 고지가 불분명하다", "조건이 숨겨져 있다", "약관이 복잡하다"' },
  ],
  '기술': [
    { name: '시스템 안정성', experience: '안정성', definition: '튕김/장애 없는 안정적 운영', keywords: '"앱이 튕긴다", "오류가 난다", "갑자기 꺼진다"' },
    { name: '보안성', experience: '안정성', definition: '정보의 안전한 관리와 보호 신뢰', keywords: '"개인정보가 걱정된다", "로그인이 이상하다"' },
    { name: '신속성', experience: '안정성', definition: '지연 없는 서비스 제공', keywords: '"로딩이 느리다", "응답이 없다", "버벅인다"' },
  ],
}

export default function Guide() {
  const [activeTab, setActiveTab] = useState<Domain>('전략')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAttrs = DOMAIN_ATTRIBUTES[activeTab].filter(attr => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      attr.name.toLowerCase().includes(q) ||
      attr.definition.toLowerCase().includes(q) ||
      attr.keywords.toLowerCase().includes(q)
    )
  })

  return (
    <main className="max-w-[1600px] mx-auto px-6 py-6" style={{ minWidth: 1280 }}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">분석 기준 가이드</h1>
        <p className="text-sm text-gray-500 mt-1">스코어링 공식 및 29개 속성 정의</p>
      </div>

      {/* 스코어링 공식 섹션 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-base font-bold text-gray-800 mb-5">스코어링 공식</h2>
        <div className="grid grid-cols-2 gap-6">
          {/* Score_reality 공식 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">실제 경험 점수 (Score_reality)</h3>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 font-mono text-sm text-center">
              <span className="text-gray-800 font-bold">Score_reality</span>
              <span className="text-gray-500"> = </span>
              <span className="text-blue-600 font-bold">80</span>
              <span className="text-gray-500"> + (</span>
              <span className="text-green-600 font-bold">Sentiment</span>
              <span className="text-gray-500"> × </span>
              <span className="text-orange-600 font-bold">Severity</span>
              <span className="text-gray-500">)</span>
            </div>
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-600 mb-1">계산 예시</p>
              <p>"앱이 또 튕겼어요. 진짜 해지할까봐요"</p>
              <p className="text-gray-400">→ 매우 부정(-40) × 이탈·기만(2.0) = -80</p>
              <p className="text-gray-400">→ Score_reality = 80 + (-80) = <strong className="text-red-500">0점</strong></p>
            </div>
          </div>

          {/* Gap 공식 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Gap 분석</h3>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 font-mono text-sm text-center">
              <span className="text-gray-800 font-bold">Gap</span>
              <span className="text-gray-500"> = </span>
              <span className="text-blue-600 font-bold">Score_reality</span>
              <span className="text-gray-500"> − </span>
              <span className="text-orange-600 font-bold">Score_exp</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: 'Exceeding', condition: 'Gap > 5', color: '#22C55E', desc: '기대 초과' },
                { label: 'Alignment', condition: '-5 ≤ Gap ≤ 5', color: '#EAB308', desc: '기대 충족' },
                { label: 'Gap', condition: 'Gap < -5', color: '#EF4444', desc: '기대 미달' },
              ].map(g => (
                <div
                  key={g.label}
                  className="rounded-lg p-2 text-center text-xs"
                  style={{ backgroundColor: g.color + '15', border: `1px solid ${g.color}30` }}
                >
                  <div className="font-bold" style={{ color: g.color }}>{g.label}</div>
                  <div className="text-gray-500 mt-0.5">{g.condition}</div>
                  <div className="text-gray-600 mt-0.5">{g.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 감성 점수 테이블 */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">감성 점수 (Sentiment)</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-600">등급</th>
                  <th className="text-center px-3 py-2 border border-gray-200 font-semibold text-gray-600">값</th>
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-600">판단 기준</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { grade: '매우 긍정', value: '+10', criteria: '극찬, 강한 만족 표현, 추천 의사', color: '#16A34A' },
                  { grade: '긍정', value: '+5', criteria: '만족, 좋다는 표현, 기대 이상', color: '#22C55E' },
                  { grade: '중립', value: '0', criteria: '사실 서술만, 감정 없음', color: '#6B7280' },
                  { grade: '부정', value: '-20', criteria: '불만, 실망, 불편함 표현', color: '#EF4444' },
                  { grade: '매우 부정', value: '-40', criteria: '욕설·격앙, 이탈 의사, 브랜드 비난', color: '#B91C1C' },
                ].map(row => (
                  <tr key={row.grade} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200">
                      <span className="font-medium" style={{ color: row.color }}>{row.grade}</span>
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-center font-mono font-bold" style={{ color: row.color }}>
                      {row.value}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-600">{row.criteria}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">심각도 배수 (Severity)</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-600">등급</th>
                  <th className="text-center px-3 py-2 border border-gray-200 font-semibold text-gray-600">배수</th>
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-600">판단 기준</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { grade: '일반', value: '×1.0', criteria: '단순 불편 언급' },
                  { grade: '반복·우회', value: '×1.5', criteria: '"또", "계속", "몇 번째", 우회 시도 언급' },
                  { grade: '이탈·기만', value: '×2.0', criteria: '"해지할 것", "환불", "사기", "거짓말"' },
                ].map(row => (
                  <tr key={row.grade} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 font-medium text-gray-700">{row.grade}</td>
                    <td className="px-3 py-2 border border-gray-200 text-center font-mono font-bold text-orange-600">{row.value}</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-600">{row.criteria}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-3">상태 판정 기준</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-600">상태</th>
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-600">점수 구간</th>
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-600">의미</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { status: '양호', range: '75점 이상', meaning: '전반적으로 기대치 충족', color: '#22C55E' },
                  { status: '보통', range: '60~74점', meaning: '일부 영역 개선 필요', color: '#3B82F6' },
                  { status: '주의', range: '45~59점', meaning: '복수 영역 기대치 미달', color: '#F59E0B' },
                  { status: '위험', range: '44점 이하', meaning: '전반적 브랜드 신뢰 하락 위험', color: '#EF4444' },
                ].map(row => (
                  <tr key={row.status} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: row.color }}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 border border-gray-200 font-mono text-gray-700">{row.range}</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-600">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 29개 속성 섹션 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-800">29개 품질 속성</h2>
          <input
            type="text"
            placeholder="속성 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 w-48"
          />
        </div>

        {/* 도메인 탭 */}
        <div className="flex gap-2 mb-5">
          {DOMAINS.map(d => (
            <button
              key={d}
              onClick={() => setActiveTab(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === d ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={activeTab === d ? { backgroundColor: DOMAIN_COLORS[d] } : {}}
            >
              {d} ({DOMAIN_ATTRIBUTES[d].length}개)
            </button>
          ))}
        </div>

        {/* 속성 테이블 */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 py-3 border border-gray-200 font-semibold text-gray-600 w-28">속성명</th>
              <th className="text-left px-4 py-3 border border-gray-200 font-semibold text-gray-600 w-24">체감 경험</th>
              <th className="text-left px-4 py-3 border border-gray-200 font-semibold text-gray-600">정의</th>
              <th className="text-left px-4 py-3 border border-gray-200 font-semibold text-gray-600">AI 판정 키워드 예시</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttrs.map((attr, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 border border-gray-200">
                  <span
                    className="font-semibold"
                    style={{ color: DOMAIN_COLORS[activeTab] }}
                  >
                    {attr.name}
                  </span>
                </td>
                <td className="px-4 py-3 border border-gray-200">
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                    {attr.experience}
                  </span>
                </td>
                <td className="px-4 py-3 border border-gray-200 text-gray-700">{attr.definition}</td>
                <td className="px-4 py-3 border border-gray-200 text-gray-500 text-xs">{attr.keywords}</td>
              </tr>
            ))}
            {filteredAttrs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400 border border-gray-200">
                  검색 결과가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  )
}