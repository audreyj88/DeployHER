// Lucide icons for places React components can't go: canvas textures and the plain-DOM 3D tags.
// Uses the vanilla `lucide` package's shape data (same icon set and version as lucide-react).
import type { IconNode } from 'lucide'

export type { IconNode }

const num = (v: unknown) => Number(v ?? 0)

/** Stroke a Lucide icon onto a 2D canvas with its top-left corner at (x, y). Synchronous, no image loading. */
export function strokeIcon(g: CanvasRenderingContext2D, icon: IconNode, x: number, y: number, size: number, color: string, strokeWidth = 2) {
  g.save()
  g.translate(x, y)
  g.scale(size / 24, size / 24)
  g.strokeStyle = color
  g.lineWidth = strokeWidth
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (const [tag, a] of icon) {
    const p = new Path2D()
    switch (tag) {
      case 'path':
        p.addPath(new Path2D(String(a.d)))
        break
      case 'circle':
        p.arc(num(a.cx), num(a.cy), num(a.r), 0, Math.PI * 2)
        break
      case 'ellipse':
        p.ellipse(num(a.cx), num(a.cy), num(a.rx), num(a.ry), 0, 0, Math.PI * 2)
        break
      case 'rect':
        p.roundRect(num(a.x), num(a.y), num(a.width), num(a.height), num(a.rx))
        break
      case 'line':
        p.moveTo(num(a.x1), num(a.y1))
        p.lineTo(num(a.x2), num(a.y2))
        break
      case 'polyline':
      case 'polygon': {
        const pts = String(a.points).trim().split(/[\s,]+/).map(Number)
        for (let i = 0; i + 1 < pts.length; i += 2) (i ? p.lineTo : p.moveTo).call(p, pts[i], pts[i + 1])
        if (tag === 'polygon') p.closePath()
        break
      }
    }
    g.stroke(p)
  }
  g.restore()
}

const esc = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** SVG markup for a Lucide icon, coloured with currentColor. */
export function iconSvg(icon: IconNode, size = 14, strokeWidth = 2.5): string {
  const body = icon.map(([tag, a]) => `<${tag} ${Object.entries(a).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;vertical-align:-0.15em">${body}</svg>`
}
