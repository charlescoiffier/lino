export function despeckle(indices: Uint8Array, width: number, height: number): Uint8Array {
  const out = indices.slice();
  const neighbors = new Uint8Array(8);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const own = indices[y * width + x];
      let count = 0;
      let same = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const v = indices[ny * width + nx];
          neighbors[count++] = v;
          if (v === own) same = true;
        }
      }
      if (same || count === 0) continue;
      let best = neighbors[0];
      let bestCount = 0;
      for (let i = 0; i < count; i++) {
        let c = 0;
        for (let j = 0; j < count; j++) if (neighbors[j] === neighbors[i]) c++;
        if (c > bestCount) {
          bestCount = c;
          best = neighbors[i];
        }
      }
      out[y * width + x] = best;
    }
  }
  return out;
}

export function layerMasks(indices: Uint8Array, count: number): Uint8Array[] {
  const masks = Array.from({ length: count }, () => new Uint8Array(indices.length));
  for (let i = 0; i < indices.length; i++) masks[indices[i]][i] = 1;
  return masks;
}
