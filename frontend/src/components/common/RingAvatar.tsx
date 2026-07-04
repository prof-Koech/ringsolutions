import React from 'react';
import { Avatar } from 'antd';
import { RingIcon } from './Logo';

interface RingAvatarProps {
  name?: string;
  size?: number;
  showFallbackLogo?: boolean;
}

const RingAvatar: React.FC<RingAvatarProps> = ({ name, size = 36, showFallbackLogo = true }) => {
  if (!name && showFallbackLogo) {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #e6f7ff, #bae7ff)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #91d5ff',
      }}>
        <RingIcon size={size * 0.7} />
      </div>
    );
  }

  if (name) {
    const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    return (
      <Avatar
        size={size}
        style={{
          background: 'linear-gradient(135deg, #1890ff, #0050b3)',
          fontSize: size * 0.35,
          fontWeight: 700,
        }}
      >
        {initials}
      </Avatar>
    );
  }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #e6f7ff, #bae7ff)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <RingIcon size={size * 0.7} />
    </div>
  );
};

export default RingAvatar;
