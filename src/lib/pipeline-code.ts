// The code steps of Kai's agent (before the model). Shared so the lab UI can walk through them.
import { PROGRAMS, type Applicant, type Program } from './catalog.ts'
import { deliveryOk, scheduleFits, topicOverlap } from './policy.ts'

export interface Candidate {
  id: string
  title: string
  schedule: string
  overlap: number
  flagged: boolean // needs programming, experience unknown
}

export type TraceStepId = 'search' | 'prereq' | 'remote' | 'schedule' | 'rank' | 'model' | 'output'

export interface TraceStep {
  id: TraceStepId
  kind: 'code' | 'ai' | 'output'
  label: string
  detail: string
  skipped?: boolean
  programIds?: string[]
  removed?: { id: string; why: string }[]
}

export interface PipelineConfig {
  scheduleFilter: boolean
}

export function runPipelineCode(a: Applicant, cfg: PipelineConfig) {
  const steps: TraceStep[] = []
  let pool: Program[] = PROGRAMS.filter((p) => topicOverlap(p, a) > 0)
  steps.push({ id: 'search', kind: 'code', label: 'Find matching programs', detail: `${pool.length} of ${PROGRAMS.length} programs match her interests (${a.interests.join(', ')}).`, programIds: pool.map((p) => p.id) })

  const removedPrereq = pool.filter((p) => p.requiresProgramming && a.programming === 'no')
  pool = pool.filter((p) => !removedPrereq.includes(p))
  const flagged = new Set(pool.filter((p) => p.requiresProgramming && a.programming === 'unknown').map((p) => p.id))
  steps.push({
    id: 'prereq',
    kind: 'code',
    label: 'Check prerequisites',
    detail: removedPrereq.length
      ? `Removed ${removedPrereq.map((p) => p.id).join(', ')}: needs programming.`
      : flagged.size
        ? `Flagged ${[...flagged].join(', ')}: needs programming and her experience is unknown.`
        : 'Nothing removed.',
    programIds: pool.map((p) => p.id),
    removed: removedPrereq.map((p) => ({ id: p.id, why: 'needs coding' })),
  })

  if (a.remoteOnly) {
    const removed = pool.filter((p) => !deliveryOk(p, a))
    pool = pool.filter((p) => deliveryOk(p, a))
    steps.push({ id: 'remote', kind: 'code', label: 'Remote only', detail: removed.length ? `Removed ${removed.map((p) => p.id).join(', ')}: in person.` : 'Nothing removed.', programIds: pool.map((p) => p.id), removed: removed.map((p) => ({ id: p.id, why: 'in person' })) })
  }

  if (cfg.scheduleFilter) {
    const removed = pool.filter((p) => !scheduleFits(p, a))
    pool = pool.filter((p) => scheduleFits(p, a))
    steps.push({ id: 'schedule', kind: 'code', label: 'Check schedule', detail: removed.length ? `Removed ${removed.map((p) => p.id).join(', ')}: meets when she can’t attend.` : 'Every remaining program fits her time.', programIds: pool.map((p) => p.id), removed: removed.map((p) => ({ id: p.id, why: 'wrong time' })) })
  } else {
    steps.push({ id: 'schedule', kind: 'code', label: 'Check schedule', detail: 'Skipped: v1 has no schedule check.', skipped: true, programIds: pool.map((p) => p.id) })
  }

  const ranked = [...pool].sort((x, y) => topicOverlap(y, a) - topicOverlap(x, a) || PROGRAMS.indexOf(x) - PROGRAMS.indexOf(y))
  const candidates: Candidate[] = ranked.map((p) => ({ id: p.id, title: p.title, schedule: p.schedule, overlap: topicOverlap(p, a), flagged: flagged.has(p.id) }))
  steps.push({ id: 'rank', kind: 'code', label: 'Rank by topic overlap', detail: candidates.length ? `Top: ${candidates[0].id}${candidates[0].flagged ? ' (flagged)' : ''}.` : 'No candidates left.', programIds: candidates.map((c) => c.id) })
  return { candidates, steps }
}

export const versionLabel = (scheduleFilter: boolean, promptFix: boolean) => `${scheduleFilter ? 'v2' : 'v1'}${promptFix ? '+instruction' : ''}`
