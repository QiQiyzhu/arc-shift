import type Phaser from 'phaser';

/** Presentation-only baseline switch, ignored by the production build. */
export const renderDiagnostics = { legacyDiscs: false, legacyLabels: false };
export const DISC_ERROR = 0.35; // 1280×720 game coordinates, not physical pixels.
const kernels = [8, 12, 16, 24, 32].map((n) => {
  const points = new Float64Array((n + 1) * 2);
  for (let i = 0; i < n; i++) {
    points[i * 2] = Math.cos((i * Math.PI * 2) / n);
    points[i * 2 + 1] = Math.sin((i * Math.PI * 2) / n);
  }
  // Identical closing vertex avoids tiny shared-edge mismatches.
  points[n * 2] = points[0];
  points[n * 2 + 1] = points[1];
  return { points, error: 1 - Math.cos(Math.PI / n) };
});
export function discKernel(radius: number) {
  return kernels.find((k) => radius * k.error <= DISC_ERROR)?.points;
}
function fan(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  rx: number,
  ry: number,
) {
  // Phaser.WEBGL = 2. Canvas renders each triangle independently with edge AA;
  // retain its original single-path fill to avoid seams in translucent discs.
  if (
    g.scene.game.renderer.type !== 2 ||
    (import.meta.env.DEV && renderDiagnostics.legacyDiscs)
  )
    return false;
  const points = discKernel(Math.max(rx, ry));
  if (!points) return false; // Large/custom geometry retains the original curve.
  for (let i = 0; i < points.length - 2; i += 2)
    g.fillTriangle(
      x,
      y,
      x + points[i] * rx,
      y + points[i + 1] * ry,
      x + points[i + 2] * rx,
      y + points[i + 3] * ry,
    );
  return true;
}
/** Only dynamic decorative fills use this; attack outlines and physics do not. */
export function fillDisc(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
) {
  if (!fan(g, x, y, radius, radius)) g.fillCircle(x, y, radius);
}
export function fillShadow(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (!fan(g, x, y, width / 2, height / 2)) g.fillEllipse(x, y, width, height);
}
