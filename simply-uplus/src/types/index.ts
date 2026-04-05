export interface RawVoC {
  id: string;
  source: 'app_store_ios' | 'app_store_aos' | 'threads' | 'x' | 'community' | 'manual';
  channel_detail?: string;
  service?: string;
  raw_text: string;
  collected_at?: string | null;
  author_context?: string | null;
}

export interface DiagnosisIssue {
  issue_summary: string;
  feedback_type: '시각·인지' | '사용편의' | '브랜드 체감' | '감성' | '운영 품질';
  domain: '전략' | 'UX' | '운영' | '기술';
  attributes: string[];
  sentiment: '매우 긍정' | '긍정' | '중립' | '부정' | '매우 부정';
  sentiment_score: number;
  severity: '일반' | '반복·우회' | '이탈·기만';
  severity_multiplier: number;
  score_reality: number;
  expectation_level: 'High' | 'Mid' | 'Standard';
  score_exp: number;
  gap: number;
  status: 'Exceeding' | 'Alignment' | 'Gap';
  diagnosis: string;
  action_hint: string;
}

export interface DiagnosedVoC extends RawVoC {
  issues: DiagnosisIssue[];
  overall_summary: string;
  diagnosed_at: string;
}

export type Domain = '전략' | 'UX' | '운영' | '기술';
export type StatusLabel = '양호' | '보통' | '주의' | '위험';
export type PriorityLevel = 'High' | 'Mid' | 'Low';
export type GapStatus = 'Exceeding' | 'Alignment' | 'Gap';