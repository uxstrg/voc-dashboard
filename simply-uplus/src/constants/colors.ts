// 도메인 컬러 (1.5항)
export const DOMAIN_COLORS: Record<string, string> = {
  '전략': '#18D0FE',
  'UX': '#BE49FF',
  '운영': '#E7B80C',
  '기술': '#4F45E4',
};

// 상태 컬러 — Signal 컬러 (1.6항)
export const STATUS_COLORS: Record<string, string> = {
  '탁월': '#0D77EE',
  '보통': '#5EE86A',
  '주의': '#F97316',
  '위험': '#EF4444',
};

// Gap 상태 컬러 (1.8항)
export const GAP_STATUS_COLORS: Record<string, string> = {
  '기대 초과': '#0D77EE',
  '기대 충족': '#5EE86A',
  '기대 이하': '#EF4444',
  // API 값 호환
  'Exceeding': '#0D77EE',
  'Alignment': '#5EE86A',
  'Gap': '#EF4444',
};

// 감성 컬러 — 3단계 (1.7항, 2.3항)
export const SENTIMENT_COLORS: Record<string, string> = {
  '매우 긍정': '#5EE86A',
  '긍정': '#5EE86A',
  '중립': '#8A9980',
  '부정': '#EF4444',
  '매우 부정': '#EF4444',
};

export const SENTIMENT_BG: Record<string, string> = {
  '매우 긍정': 'rgba(94,232,106,0.15)',
  '긍정': 'rgba(94,232,106,0.15)',
  '중립': 'rgba(74,85,64,0.3)',
  '부정': 'rgba(239,68,68,0.15)',
  '매우 부정': 'rgba(239,68,68,0.15)',
};

// 출처 레이블
export const SOURCE_LABELS: Record<string, string> = {
  'AppStore': '앱스토어 iOS',
  'PlayStore': '구글 플레이',
  'Threads': '스레드',
  'DC인사이드': 'DC인사이드',
  '뽐뿌': '뽐뿌',
};

export const SOURCE_COLORS: Record<string, string> = {
  'AppStore': '#8A9980',
  'PlayStore': '#8A9980',
  'Threads': '#8A9980',
  'DC인사이드': '#8A9980',
  '뽐뿌': '#8A9980',
};
