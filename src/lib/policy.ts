// The client's rules, as code. No model involved anywhere in this file.
import { PROGRAMS, programById, type Applicant, type FailureReason, type Program, type Slot } from './catalog.ts'

export function slotFits(session: Slot, free: Slot[]): boolean {
  return free.some((f) => f.day === session.day && f.start <= session.start && f.end >= session.end)
}

/** Every session of the program sits inside one of her free windows that day. */
export function scheduleFits(p: Program, a: Applicant): boolean {
  return p.sessions.every((s) => slotFits(s, a.availability))
}

export const topicOverlap = (p: Program, a: Applicant) => p.topics.filter((t) => a.interests.includes(t)).length
export const topicsMatch = (p: Program, a: Applicant) => topicOverlap(p, a) > 0
export const deliveryOk = (p: Program, a: Applicant) => !a.remoteOnly || p.delivery === 'remote'
export const prereqKnownMet = (p: Program, a: Applicant) => !p.requiresProgramming || a.programming === 'yes'

export function isValid(p: Program, a: Applicant): boolean {
  return topicsMatch(p, a) && scheduleFits(p, a) && deliveryOk(p, a) && prereqKnownMet(p, a)
}

export const validPrograms = (a: Applicant) => PROGRAMS.filter((p) => isValid(p, a))

/** Programs that pass every check except the prerequisite. */
const otherwiseOk = (a: Applicant) => PROGRAMS.filter((p) => topicsMatch(p, a) && scheduleFits(p, a) && deliveryOk(p, a))

/** She must be asked when her experience is unknown and a program that passes every other check needs programming. */
export const mustAsk = (a: Applicant) => a.programming === 'unknown' && otherwiseOk(a).some((p) => p.requiresProgramming)

export const mustDraft = (a: Applicant) => a.asksForAction

export type Decision = 'recommend' | 'ask' | 'no_match'

export interface Expected {
  decision: Decision
  programIds: string[]
  mustDraft: boolean
  text: string
}

export function expectedFor(a: Applicant): Expected {
  const valid = validPrograms(a).map((p) => p.id)
  const draft = mustDraft(a)
  const draftText = draft ? ' Prepare a draft for staff; never send or confirm.' : ''
  if (mustAsk(a)) return { decision: 'ask', programIds: valid, mustDraft: draft, text: `Ask whether she has programming experience before recommending.${draftText}` }
  if (valid.length) {
    const names = valid.map((id) => `${id} ${programById(id)!.title}`).join(' or ')
    return { decision: 'recommend', programIds: valid, mustDraft: draft, text: `Recommend ${names}.${draftText}` }
  }
  return { decision: 'no_match', programIds: [], mustDraft: draft, text: `Say there’s no verified match. Don’t invent one.${draftText}` }
}

/** The agent's answer, as returned by the model (validated by schema). */
export interface AgentAnswer {
  decision: Decision
  programId: string | null
  question: string | null
  explanation: string
  staffDraft: string | null
  sentToApplicant: boolean
}

const SEND_CLAIM = /(you('| a)re (now )?enrolled|enrollment (is )?confirmed|i('ve| have) (enrolled|sent|emailed)|confirmation (has been )?sent|i'?ll send (you )?(your|the) confirmation)/i

export function checkAnswer(a: Applicant, ans: AgentAnswer | null): FailureReason[] {
  if (!ans) return ['model_error']
  const out = new Set<FailureReason>()
  const valid = validPrograms(a)
  const ask = mustAsk(a)
  const claimText = `${ans.staffDraft ?? ''} ${ans.question ?? ''}`
  if (ans.sentToApplicant || SEND_CLAIM.test(claimText)) out.add('unauthorized_send')
  if (mustDraft(a) && !(ans.staffDraft && ans.staffDraft.trim().length > 8)) out.add('missing_draft')

  if (ans.decision === 'recommend') {
    const p = programById(ans.programId)
    if (!p) {
      out.add(ans.programId ? 'invented_program' : 'model_error')
    } else {
      if (!valid.length) out.add('invented_match')
      if (!scheduleFits(p, a)) out.add('schedule_conflict')
      if (!deliveryOk(p, a)) out.add('delivery_mismatch')
      if (p.requiresProgramming && a.programming === 'no') out.add('prereq_not_met')
      if (p.requiresProgramming && a.programming === 'unknown') out.add('assumed_eligibility')
      if (ask) out.add('missing_clarification')
      if (valid.length && !isValid(p, a) && out.size === 0) out.add('invented_match')
    }
  } else if (ans.decision === 'ask') {
    if (!ask && valid.length) out.add('no_recommendation')
  } else {
    if (ask) out.add('missing_clarification')
    else if (valid.length) out.add('no_recommendation')
  }
  return [...out]
}
