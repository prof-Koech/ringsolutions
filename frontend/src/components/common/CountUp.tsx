import React, { useEffect, useState } from 'react';

type Props = {
  end: number | string;
  duration?: number; // ms
  decimals?: number;
  formatter?: (n: number) => string;
};

const CountUp: React.FC<Props> = ({ end, duration = 1000, decimals = 0, formatter }) => {
  const [value, setValue] = useState<number>(0);

  useEffect(() => {
    if (typeof end === 'string') return; // nothing to animate for strings
    const target = end as number;
    const start = 0;
    const frames = Math.max(8, Math.round(duration / 16));
    let frame = 0;
    const id = setInterval(() => {
      frame += 1;
      const progress = frame / frames;
      const cur = start + (target - start) * easeOutCubic(progress);
      setValue(Number(cur.toFixed(decimals)));
      if (frame >= frames) {
        clearInterval(id);
        setValue(Number(target.toFixed(decimals)));
      }
    }, Math.round(duration / frames));
    return () => clearInterval(id);
  }, [end, duration, decimals]);

  if (typeof end === 'string') return <>{end}</>;

  const display = formatter ? formatter(value) : (decimals > 0 ? value.toFixed(decimals) : String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  return <>{display}</>;
};

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default CountUp;
