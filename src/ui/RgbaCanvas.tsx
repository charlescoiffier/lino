import { useEffect, useRef } from 'react';

interface Props {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  label: string;
}

export function RgbaCanvas({ data, width, height, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = width;
    canvas.height = height;
    ctx.putImageData(new ImageData(data as Uint8ClampedArray<ArrayBuffer>, width, height), 0, 0);
  }, [data, width, height]);
  return <canvas ref={ref} role="img" aria-label={label} style={{ maxWidth: '100%', height: 'auto', background: '#fff' }} />;
}
