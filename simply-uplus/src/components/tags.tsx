// Variant A: Solid Pill - Status badges
export function StatusBadge({
  status,
  size = 'md'
}: {
  status: '탁월' | '보통' | '주의' | '위험'
  size?: 'sm' | 'md'
}) {
  const styles = {
    '탁월': 'bg-[#0D77EE] text-[#E8EDE0]',
    '보통': 'bg-[#5EE86A] text-[#0E0F0E]',
    '주의': 'bg-[#F97316] text-[#E8EDE0]',
    '위험': 'bg-[#EF4444] text-[#E8EDE0]',
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${sizeClass} ${styles[status]}`}>
      {status}
    </span>
  );
}

// Variant B: Solid Chip - Domain tags
export function DomainTag({
  domain
}: {
  domain: '전략' | 'UX' | '운영' | '기술'
}) {
  const styles = {
    '전략': 'bg-[#18D0FE] text-[#0E0F0E]',
    'UX': 'bg-[#BE49FF] text-[#E8EDE0]',
    '운영': 'bg-[#E7B80C] text-[#0E0F0E]',
    '기술': 'bg-[#4F45E4] text-[#E8EDE0]',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${styles[domain]}`}>
      {domain}
    </span>
  );
}

// Variant C: Tinted Chip - Sentiment tags
export function SentimentTag({
  sentiment
}: {
  sentiment: '매우 긍정' | '긍정' | '중립' | '부정' | '매우 부정'
}) {
  const styles = {
    '매우 긍정': 'bg-[#5EE86A]/10 text-[#5EE86A] border-[#5EE86A]/30',
    '긍정': 'bg-[#5EE86A]/10 text-[#5EE86A] border-[#5EE86A]/30',
    '중립': 'bg-[#4A5540]/10 text-[#8A9980] border-[#4A5540]/30',
    '부정': 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
    '매우 부정': 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-medium whitespace-nowrap ${styles[sentiment]}`}>
      {sentiment}
    </span>
  );
}

// Variant C: Tinted Chip - Gap tags
export function GapTag({
  type,
  value
}: {
  type: '기대 초과' | '기대 충족' | '기대 이하';
  value?: number;
}) {
  const styles = {
    '기대 초과': 'bg-[#0D77EE]/10 text-[#0D77EE] border-[#0D77EE]/30',
    '기대 충족': 'bg-[#5EE86A]/10 text-[#5EE86A] border-[#5EE86A]/30',
    '기대 이하': 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
  };

  const label = value
    ? `${type} ${value > 0 ? '+' : ''}${value}`
    : type;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-medium whitespace-nowrap ${styles[type]}`}>
      {label}
    </span>
  );
}

// Variant D: Muted Chip - Default for attributes, sources, services
export function MutedChip({
  label,
  variant = 'solid'
}: {
  label: string;
  variant?: 'solid' | 'outline';
}) {
  const baseClass = 'inline-flex items-center px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap';
  const variantClass = variant === 'solid'
    ? 'bg-[#2E3329] text-[#8A9980]'
    : 'border border-[#2E3329] text-[#8A9980]';

  return (
    <span className={`${baseClass} ${variantClass}`}>
      {label}
    </span>
  );
}

// Hash attribute tag with direction
export function HashAttributeTag({
  attribute,
  direction
}: {
  attribute: string;
  direction: 'up' | 'down';
}) {
  const directionColor = direction === 'down' ? 'text-[#EF4444]' : 'text-[#5EE86A]';
  const arrow = direction === 'down' ? '↓' : '↑';

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded bg-[#2E3329] text-xs font-medium whitespace-nowrap">
      <span className="text-[#8A9980]">#{attribute}</span>
      <span className={directionColor}>{arrow}</span>
    </span>
  );
}
