// 도메인 컬러
export const DOMAIN_COLORS: Record<string, string> = {
  '전략': '#3B82F6',
  'UX': '#F97316',
  '운영': '#22C55E',
  '기술': '#6366F1',
};

// 상태 컬러
export const STATUS_COLORS: Record<string, string> = {
  '위험': '#EF4444',
  '주의': '#F59E0B',
  '보통': '#3B82F6',
  '양호': '#22C55E',
};

// Gap 상태 컬러
export const GAP_STATUS_COLORS: Record<string, string> = {
  'Exceeding': '#22C55E',
  'Alignment': '#EAB308',
  'Gap': '#EF4444',
};

// 우선순위 배경색
export const PRIORITY_BG: Record<string, string> = {
  'High': '#FEE2E2',
  'Mid': '#FEF3C7',
  'Low': '#F3F4F6',
};

export const PRIORITY_TEXT: Record<string, string> = {
  'High': '#DC2626',
  'Mid': '#D97706',
  'Low': '#6B7280',
};

// 감성 컬러
export const SENTIMENT_COLORS: Record<string, string> = {
  '매우 긍정': '#16A34A',
  '긍정': '#22C55E',
  '중립': '#6B7280',
  '부정': '#EF4444',
  '매우 부정': '#B91C1C',
};

export const SENTIMENT_BG: Record<string, string> = {
  '매우 긍정': '#DCFCE7',
  '긍정': '#F0FDF4',
  '중립': '#F3F4F6',
  '부정': '#FEE2E2',
  '매우 부정': '#FEE2E2',
};

// 출처 레이블
export const SOURCE_LABELS: Record<string, string> = {
  'AppStore': '앱스토어 iOS',
  'PlayStore': '구글 플레이',
  'Threads': '스레드',
  'DC인사이드': 'DC인사이드',
  '뽐뿌': '뽐뿌',
  'dcinside': 'DC인사이드',
  'ppomppu': '뽐뿌',
  // legacy keys (fallback)
  'app_store_ios': 'iOS',
  'app_store_aos': 'AOS',
  'x': 'X',
  'community': '커뮤니티',
  'manual': '수동입력',
};

export const SOURCE_COLORS: Record<string, string> = {
  'AppStore': '#3B82F6',
  'PlayStore': '#22C55E',
  'Threads': '#6366F1',
  'DC인사이드': '#F97316',
  '뽐뿌': '#EF4444',
  'dcinside': '#F97316',
  'ppomppu': '#EF4444',
  // legacy keys (fallback)
  'app_store_ios': '#3B82F6',
  'app_store_aos': '#22C55E',
  'x': '#111827',
  'community': '#F97316',
  'manual': '#9CA3AF',
};