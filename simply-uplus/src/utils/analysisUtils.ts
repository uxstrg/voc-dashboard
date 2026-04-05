import { DiagnosisIssue } from '../types';
import { STATUS_COLORS, GAP_STATUS_COLORS, PRIORITY_BG } from '../constants/colors';

// 10항: 도메인 점수 집계
export function calcDomainScore(issues: DiagnosisIssue[], domain: string): number {
  const domainIssues = issues.filter(i => i.domain === domain);
  if (domainIssues.length === 0) return 80;
  const avgGap = domainIssues.reduce((sum, i) => sum + i.gap, 0) / domainIssues.length;
  return Math.round(80 + avgGap);
}

// 11항: 종합 점수 집계
export function calcOverallScore(issues: DiagnosisIssue[]): number {
  const domains = ['전략', 'UX', '운영', '기술'];
  const domainScores = domains.map(d => ({
    domain: d,
    score: calcDomainScore(issues, d),
    count: issues.filter(i => i.domain === d).length,
  }));

  const totalCount = domainScores.reduce((sum, d) => sum + d.count, 0);
  if (totalCount === 0) return 80;

  const weighted = domainScores.reduce((sum, d) => {
    const weight = d.count / totalCount;
    return sum + d.score * weight;
  }, 0);

  return Math.round(weighted);
}

// 상태 레이블
export function getStatusLabel(score: number): string {
  if (score >= 75) return '양호';
  if (score >= 60) return '보통';
  if (score >= 45) return '주의';
  return '위험';
}

// 상태 컬러
export function getStatusColor(score: number): string {
  const label = getStatusLabel(score);
  return STATUS_COLORS[label] || '#6B7280';
}

// Gap 상태 컬러
export function getGapStatusColor(gap: number): string {
  if (gap > 5) return GAP_STATUS_COLORS['Exceeding'];
  if (gap >= -5) return GAP_STATUS_COLORS['Alignment'];
  return GAP_STATUS_COLORS['Gap'];
}

// 우선순위 레벨 (ui_spec.md 1항 기준)
export function getPriorityLevel(issue: DiagnosisIssue, allIssues?: DiagnosisIssue[]): 'High' | 'Mid' | 'Low' {
  const isNegative = issue.sentiment === '부정' || issue.sentiment === '매우 부정';
  if (!isNegative) return 'Low';

  // High: 부정 감성 + 동일 속성 반복 2건 이상 또는 개별 이슈 Gap ≤ -60
  if (issue.gap <= -60) return 'High';
  if (allIssues) {
    for (const attr of issue.attributes) {
      const repeatCount = allIssues.filter(i =>
        (i.sentiment === '부정' || i.sentiment === '매우 부정') &&
        i.attributes.includes(attr)
      ).length;
      if (repeatCount >= 2) return 'High';
    }
  }
  return 'Mid';
}

// 우선순위 배경색
export function getPriorityBg(level: 'High' | 'Mid' | 'Low'): string {
  return PRIORITY_BG[level] || '#F3F4F6';
}

// 4주 추이 생성 (현재 점수 기준 과거 3주치 ±5점 랜덤)
export function generate4WeekTrend(currentScore: number): number[] {
  const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)));
  const w3 = clamp(currentScore + (Math.random() * 10 - 5));
  const w2 = clamp(currentScore + (Math.random() * 10 - 5));
  const w1 = clamp(currentScore + (Math.random() * 10 - 5));
  return [w3, w2, w1, currentScore];
}

// 긍정 비율 계산
export function calcPositiveRate(issues: DiagnosisIssue[]): number {
  if (issues.length === 0) return 0;
  const positive = issues.filter(i => i.sentiment === '긍정' || i.sentiment === '매우 긍정').length;
  return Math.round((positive / issues.length) * 100);
}

// 채널별 감성 분포
export function calcChannelSentiment(vocData: { source: string; platform?: string; issues: DiagnosisIssue[] }[]) {
  const platforms = ['AppStore', 'PlayStore', 'Threads', 'dcinside', 'ppomppu'];
  return platforms.map(platform => {
    const items = vocData.filter(v => (v.platform ?? v.source) === platform);
    const allIssues = items.flatMap(v => v.issues);
    const total = allIssues.length;
    if (total === 0) return { source: platform, positive: 0, negative: 0, neutral: 0, total: 0, vocCount: 0 };
    const positive = allIssues.filter(i => i.sentiment === '긍정' || i.sentiment === '매우 긍정').length;
    const negative = allIssues.filter(i => i.sentiment === '부정' || i.sentiment === '매우 부정').length;
    const neutral = total - positive - negative;
    return {
      source: platform,
      positive: Math.round((positive / total) * 100),
      negative: Math.round((negative / total) * 100),
      neutral: Math.round((neutral / total) * 100),
      total,
      vocCount: items.length,
    };
  });
}

// 도메인별 핵심 속성 (부정 비율 높은 속성 1~2개)
export function getTopNegativeAttributes(issues: DiagnosisIssue[], domain: string, topN = 2): string[] {
  const domainIssues = issues.filter(i => i.domain === domain);
  const attrCount: Record<string, { neg: number; total: number }> = {};
  for (const issue of domainIssues) {
    for (const attr of issue.attributes) {
      if (!attrCount[attr]) attrCount[attr] = { neg: 0, total: 0 };
      attrCount[attr].total++;
      if (issue.sentiment === '부정' || issue.sentiment === '매우 부정') {
        attrCount[attr].neg++;
      }
    }
  }
  return Object.entries(attrCount)
    .filter(([, v]) => v.neg > 0)
    .sort((a, b) => (b[1].neg / b[1].total) - (a[1].neg / a[1].total))
    .slice(0, topN)
    .map(([attr]) => attr);
}

// 도메인별 레이더 데이터 생성
export function getRadarData(issues: DiagnosisIssue[], domain: string, attributes: string[]) {
  return attributes.map(attr => {
    const attrIssues = issues.filter(i => i.domain === domain && i.attributes.includes(attr));
    if (attrIssues.length === 0) {
      return { attr, reality: 80, expectation: 80 };
    }
    const avgReality = attrIssues.reduce((s, i) => s + i.score_reality, 0) / attrIssues.length;
    const avgExp = attrIssues.reduce((s, i) => s + i.score_exp, 0) / attrIssues.length;
    return {
      attr,
      reality: Math.round(avgReality),
      expectation: Math.round(avgExp),
    };
  });
}