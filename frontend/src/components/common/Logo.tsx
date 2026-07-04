import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  light?: boolean;
}

const RingIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="54" stroke="url(#g1)" strokeWidth="8" fill="none"/>
    <circle cx="60" cy="60" r="36" stroke="url(#g2)" strokeWidth="5" fill="none" strokeDasharray="6 4" opacity="0.7"/>
    <circle cx="60" cy="60" r="14" fill="url(#g1)"/>
    <path d="M60 12 Q88 28 88 60" stroke="url(#g1)" strokeWidth="5" fill="none" strokeLinecap="round"/>
    <path d="M60 12 Q32 28 32 60" stroke="url(#g2)" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.6"/>
    <circle cx="60" cy="12" r="5" fill="#1890ff"/>
    <defs>
      <linearGradient id="g1" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1890ff"/>
        <stop offset="100%" stopColor="#0050b3"/>
      </linearGradient>
      <linearGradient id="g2" x1="120" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#40a9ff"/>
        <stop offset="100%" stopColor="#1890ff"/>
      </linearGradient>
    </defs>
  </svg>
);

const Logo: React.FC<LogoProps> = ({ size = 36, showText = true, light = false }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, userSelect: 'none' }}>
    <RingIcon size={size} />
    {showText && (
      <div>
        <div style={{
          fontSize: size * 0.6,
          fontWeight: 800,
          letterSpacing: '-0.5px',
          lineHeight: 1,
          color: light ? '#fff' : '#0050b3',
          fontFamily: "'Inter', Arial, sans-serif",
        }}>
          Ring<span style={{ color: '#1890ff' }}>Solutions</span>
        </div>
        <div style={{
          fontSize: size * 0.28,
          color: light ? 'rgba(255,255,255,0.7)' : '#8c8c8c',
          letterSpacing: '0.3px',
          lineHeight: 1.2,
        }}>
          Bulk Messaging Platform
        </div>
      </div>
    )}
  </div>
);

export default Logo;
export { RingIcon };
