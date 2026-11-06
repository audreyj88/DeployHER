// People looks: palettes, named characters and seeded variety.

export type HairStyle = 'cap' | 'long' | 'bun' | 'short' | 'curly' | 'bob'

export interface Look {
  skin: string
  hair: string
  hairStyle: HairStyle
  top: string
  bottom: string
  shoes?: string
  inner?: string
  studs?: boolean
  skirt?: boolean
}

export const TOPS = ['#5B7DB1', '#D9805F', '#6E9E84', '#E5C46A', '#A07CC5', '#F2F0EA', '#3E4A5C', '#C75D74', '#4F8FA8']
export const BOTTOMS = ['#2E3442', '#4B5563', '#6B4F3A', '#30455E', '#8D8A84']
export const SHOES = '#2A2A2E'
export const SKINS = ['#F2D3B8', '#E7B48F', '#C98E64', '#A86B47', '#7A4A2E', '#F1C6A0', '#8D5A3B', '#D9A27C']
export const HAIRS = ['#231A1C', '#3A2218', '#1E1512', '#8A5A33', '#2B1E16', '#5A3A22', '#B8865A', '#6B6B6B']
const STYLES: HairStyle[] = ['cap', 'long', 'bun', 'short', 'curly', 'bob']

export const MAYA: Look = { skin: '#F1C6A0', hair: '#231A1C', hairStyle: 'bob', top: '#0F766E', bottom: '#2E3442', inner: '#FFF4E0', studs: true }
export const NIA: Look = { skin: '#A86B47', hair: '#1E1512', hairStyle: 'curly', top: '#D9A23B', bottom: '#3B3F58', inner: '#FFF6E6', studs: true }
export const ANA: Look = { skin: '#C98E64', hair: '#2B1E16', hairStyle: 'bun', top: '#E5C46A', bottom: '#30455E' }
export const JO: Look = { skin: '#F2D3B8', hair: '#8A5A33', hairStyle: 'short', top: '#5B7DB1', bottom: '#4B5563' }
export const LEARNER_SEATED: Look = { skin: '#E7B48F', hair: '#3A2218', hairStyle: 'long', top: '#F06A6A', bottom: '#2E3A5C', studs: true, skirt: true }
export const THEO: Look = { skin: '#8D5A3B', hair: '#1E1512', hairStyle: 'short', top: '#F2F0EA', bottom: '#2E3442' }
export const KAI: Look = { skin: '#E7B48F', hair: '#5A3A22', hairStyle: 'long', top: '#4F8FA8', bottom: '#2E3442', inner: '#F2F0EA', studs: true }

/** Deterministic small RNG. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function lookFromSeed(seed: number): Look {
  const r = mulberry32(seed * 7919 + 13)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length) % a.length]
  return { skin: pick(SKINS), hair: pick(HAIRS), hairStyle: pick(STYLES), top: pick(TOPS), bottom: pick(BOTTOMS), shoes: SHOES, studs: r() > 0.6 }
}
