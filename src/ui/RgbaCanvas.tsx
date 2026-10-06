import { useEffect, useRef } from 'react';

interface Props {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  label: string;
  className?: string;
}

export function RgbaCanvas({ data, width, height, label, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = width;
    canvas.height = height;
    ctx.putImageData(new ImageData(data as Uint8ClampedArray<ArrayBuffer>, width, height), 0, 0);
  }, [data, width, height]);
  return <canvas ref={ref} role="img" aria-label={label} className={className} />;
}
