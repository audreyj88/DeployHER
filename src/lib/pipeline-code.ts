// The code steps of Kai's agent (before the model). Shared so the lab UI can walk through them.
import { JOBS, type Applicant, type Job } from './catalog.ts'
import { locationOk, payOk, scheduleFits, topicOverlap } from './policy.ts'

export interface Candidate {
  id: string
  title: string
  schedule: string
  overlap: number
  flagged: boolean // needs supervisory experience, hers unknown
}

export type TraceStepId = 'search' | 'prereq' | 'schedule' | 'rank' | 'model' | 'output'

export interface TraceStep {
  id: TraceStepId
  kind: 'code' | 'ai' | 'output'
  label: string
  detail: string
  skipped?: boolean
  jobIds?: string[]
  removed?: { id: string; why: string }[]
}

export interface PipelineConfig {
  scheduleFilter: boolean
}

export function runPipelineCode(a: Applicant, cfg: PipelineConfig) {
  const steps: TraceStep[] = []
  let pool: Job[] = JOBS.filter((p) => topicOverlap(p, a) > 0)
  steps.push({ id: 'search', kind: 'code', label: 'Find matching jobs', detail: `${pool.length} of ${JOBS.length} jobs match her experience (${a.interests.join(', ')}).`, jobIds: pool.map((p) => p.id) })

  const removedPrereq = pool.filter((p) => p.requiresSupervising && a.supervised === 'no')
  const removedPay = pool.filter((p) => !removedPrereq.includes(p) && !payOk(p, a))
  pool = pool.filter((p) => !removedPrereq.includes(p) && !removedPay.includes(p))
  const flagged = new Set(pool.filter((p) => p.requiresSupervising && a.supervised === 'unknown').map((p) => p.id))
  const removedReq = [...removedPrereq.map((p) => ({ id: p.id, why: 'needs supervising' })), ...removedPay.map((p) => ({ id: p.id, why: `pays $${p.pay}/hr` }))]
  steps.push({
    id: 'prereq',
    kind: 'code',
    label: 'Check requirements',
    detail: [
      removedPrereq.length ? `Removed ${removedPrereq.map((p) => p.id).join(', ')}: needs supervisory experience.` : '',
      removedPay.length ? `Removed ${removedPay.map((p) => p.id).join(', ')}: pays under her $${a.minPay}/hr minimum.` : '',
      flagged.size ? `Flagged ${[...flagged].join(', ')}: needs supervisory experience and hers is unknown.` : '',
    ]
      .filter(Boolean)
      .join(' ') || 'Nothing removed.',
    jobIds: pool.map((p) => p.id),
    removed: removedReq,
  })

  if (cfg.scheduleFilter) {
    const why = (p: Job) => (!scheduleFits(p, a) ? 'wrong hours' : WORK_WHY[p.workMode])
    const removed = pool.filter((p) => !scheduleFits(p, a) || !locationOk(p, a))
    pool = pool.filter((p) => !removed.includes(p))
    steps.push({ id: 'schedule', kind: 'code', label: 'Check schedule & location', detail: removed.length ? `Removed ${removed.map((p) => `${p.id} (${why(p)})`).join(', ')}: she can’t work it.` : 'Every remaining job fits her hours and location.', jobIds: pool.map((p) => p.id), removed: removed.map((p) => ({ id: p.id, why: why(p) })) })
  } else {
    steps.push({ id: 'schedule', kind: 'code', label: 'Check schedule & location', detail: 'Skipped: v1 doesn’t check her hours or where she can work.', skipped: true, jobIds: pool.map((p) => p.id) })
  }

  const ranked = [...pool].sort((x, y) => topicOverlap(y, a) - topicOverlap(x, a) || JOBS.indexOf(x) - JOBS.indexOf(y))
  const candidates: Candidate[] = ranked.map((p) => ({ id: p.id, title: p.title, schedule: p.schedule, overlap: topicOverlap(p, a), flagged: flagged.has(p.id) }))
  steps.push({ id: 'rank', kind: 'code', label: 'Rank by experience match', detail: candidates.length ? `Top: ${candidates[0].id}${candidates[0].flagged ? ' (flagged)' : ''}.` : 'No candidates left.', jobIds: candidates.map((c) => c.id) })
  return { candidates, steps }
}

const WORK_WHY: Record<Job['workMode'], string> = { on_site: 'on-site', hybrid: 'hybrid', remote: 'remote' }

export const versionLabel = (scheduleFilter: boolean, promptFix: boolean) => `${scheduleFilter ? 'v2' : 'v1'}${promptFix ? '+instruction' : ''}`
