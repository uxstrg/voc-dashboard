// DB platform 값 → 한글 라벨
export const PLATFORM_MAP: Record<string, string> = {
  'AppStore': '앱스토어 iOS',
  'PlayStore': '구글 플레이',
  'Threads': '스레드',
  'DC인사이드': 'DC인사이드',
  '뽐뿌': '뽐뿌',
}

// DB platform 값 목록
export const PLATFORMS = Object.keys(PLATFORM_MAP)

// 한글 라벨 → DB platform 값 (역방향)
export const LABEL_TO_PLATFORM: Record<string, string> = Object.fromEntries(
  Object.entries(PLATFORM_MAP).map(([k, v]) => [v, k])
)

// 도메인 목록
export const DOMAINS = ['전략', 'UX', '운영', '기술'] as const
export type Domain = typeof DOMAINS[number]

// 도메인별 품질 속성
export const DOMAIN_ATTRIBUTES: Record<Domain, string[]> = {
  '전략': ['가격 합리성', '혜택 체감성', '지불 유연성', '기능 보편성', '타겟 적합성', '맥락 적합성', '개인 맞춤화'],
  'UX': ['효율성', '간결성', '오류방지성', '연동성', '사용자 제어', '학습용이성', '정보가독성', '일관성', '정보구조화', '예측가능성', '시각적 조화성', '디자인 완성도', '공감성', '유희성', '의외성'],
  '운영': ['지원 신속성', '처리 정확성', '채널 접근성', '투명성'],
  '기술': ['시스템 안정성', '보안성', '신속성'],
}

// 도메인별 AI 트리거 문구
export const DOMAIN_AI_TRIGGERS: Record<Domain, string> = {
  '전략': '가격·혜택 불만 집중 구간',
  'UX': '탐색 흐름 단절 반복',
  '운영': 'CS 응답 지연 클레임',
  '기술': '앱 안정성 이슈 누적',
}
