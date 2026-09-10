/** One-time chroma compositing when the source atlas enters the renderer.
 * Cyan cloth, white masks and bronze remain opaque; only excess green is keyed.
 * This never changes gameplay geometry or writes a derivative source image. */
export function compositeSpriteMatte(pixels: Uint8ClampedArray) {
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i],
      g = pixels[i + 1],
      b = pixels[i + 2];
    const excess = g - Math.max(r, b);
    if (g < 100 || excess < 38) continue;
    const coverage = Math.max(0, Math.min(1, (92 - excess) / 54));
    pixels[i + 3] = Math.round(pixels[i + 3] * coverage);
    if (coverage < 1) pixels[i + 1] = Math.min(g, Math.max(r, b));
  }
}
