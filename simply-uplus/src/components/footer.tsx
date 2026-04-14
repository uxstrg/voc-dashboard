

export function Footer() {
  return (
    <footer className="border-t border-[#2E3329]" style={{ background: '#0E0F0E' }}>
      <div className="container mx-auto px-6 py-6">
        {/* Row 1 */}
        <div className="flex items-center justify-between mb-3">
          {/* Left: Service Info */}
          <div className="flex items-center gap-4 text-sm">
            <span style={{ color: '#8A9980' }}>
              언더그라운드 <span className="font-mono">v2.0</span> · 2026
            </span>
            <span style={{ color: '#2E3329' }}>·</span>
            <span style={{ color: '#8A9980' }}>
              made by UX담당 김다영, 민다솜
            </span>
          </div>

          {/* Right: Notice Badges */}
          <div className="flex items-center gap-2">
            <span
              className="px-3 py-1 rounded text-xs font-medium"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              외부반출금지
            </span>
            <span
              className="px-3 py-1 rounded text-xs font-medium"
              style={{
                background: 'rgba(247, 115, 22, 0.15)',
                color: '#F97316',
                border: '1px solid rgba(247, 115, 22, 0.3)',
              }}
            >
              사내 테스트용
            </span>
          </div>
        </div>

        {/* Row 2 */}
        <div className="flex items-center justify-between text-xs">
          {/* Left: Development Status */}
          <span style={{ color: '#8A9980' }}>
            현재도 개발 및 업데이트가 진행 중입니다.
          </span>

          {/* Right: Security Notice */}
          <span style={{ color: '#8A9980' }}>
            ※ 본 서비스는 사내 테스트용으로, 외부 공개 및 반출을 금합니다.
          </span>
        </div>
      </div>
    </footer>
  );
}
