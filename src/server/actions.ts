import 'server-only'
import { z } from 'zod'
import { CORE_TESTS, CUSTOM_TOPICS, PAY_OPTIONS } from '@/lib/catalog'
import { canEnter, nextStage, SKIPPABLE } from '@/lib/mission'
import { placeById, placeForStage, PLACE_IDS, stageIndex, type PlaceId } from '@/lib/places'
import { computeRollout } from '@/lib/rollout'
import { computeSkills } from '@/lib/report'
import { draftStrengths, PRACTICE_TODAY } from '@/lib/skills-map'
import type { Session, Turn } from '@/lib/types'
import { errMessage, hasAnthropic } from './ai'
import { conversationToken, fetchTranscript, MAX_RECONNECTS, mergeLines, stripTags } from './eleven'
import { isSilenceFiller } from '@/lib/voice'
import { addTurn, ensureOpener, gradeTranscript, learnerCount, mayaTypedReply, MAX_QUESTIONS, MIN_QUESTIONS, transcriptHash } from './interview'
import { runAll } from './lab'
import { OPENER, RECONNECT_LINE } from './scenario'
import { freshSession } from './store'
import { reportWords, rephraseStrengths, rolloutFeedback } from './words'

export class ActionError extends Error {
  constructor(
    msg: string,
    public status = 400,
  ) {
    super(msg)
  }
}

const str = (max: number) => z.string().trim().max(max)
const place = z.enum(PLACE_IDS as [PlaceId, ...PlaceId[]])

export const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('setup_map'), background: str(400).min(1), proud: str(400), aiExperience: z.enum(['new', 'some', 'built']).nullable(), goal: str(80).nullable(), confidence: z.number().int().min(1).max(5).nullable() }),
  z.object({ type: z.literal('setup_save'), strengths: z.array(z.object({ id: str(40), label: str(60).min(1), application: str(200), from: str(200) })).max(5) }),
  z.object({ type: z.literal('setup_skip') }),
  z.object({ type: z.literal('interview_start'), mode: z.enum(['voice', 'typed']) }),
  z.object({ type: z.literal('interview_ask'), text: str(600).min(1) }),
  z.object({ type: z.literal('voice_start'), reconnect: z.boolean() }),
  z.object({ type: z.literal('voice_register'), conversationId: z.string().regex(/^[A-Za-z0-9_-]{4,80}$/) }),
  z.object({ type: z.literal('interview_end'), captions: z.array(z.object({ role: z.enum(['learner', 'client']), text: str(2000) })).max(200).optional() }),
  z.object({ type: z.literal('interview_grade') }),
  z.object({ type: z.literal('grade_retry') }),
  z.object({ type: z.literal('debrief_done') }),
  z.object({ type: z.literal('lab_run') }),
  z.object({ type: z.literal('lab_hint') }),
  z.object({ type: z.literal('lab_spot'), answer: z.enum(['right', 'wrong', 'unsure']) }),
  z.object({ type: z.literal('lab_fix'), scheduleFilter: z.boolean(), promptFix: z.boolean() }),
  z.object({
    type: z.literal('lab_custom_add'),
    spec: z.object({
      name: z.string().regex(/^[A-Za-z]{1,20}$/, 'Letters only, please.'),
      interests: z.array(z.enum(CUSTOM_TOPICS as [string, ...string[]])).min(1).max(3),
      availability: z.enum(['weekdays_day', 'school_hours', 'mornings', 'three_days']),
      supervised: z.enum(['yes', 'no', 'unknown']),
      workplace: z.enum(['any', 'remote_or_hybrid', 'remote']),
      minPay: z.number().refine((n) => (PAY_OPTIONS as readonly number[]).includes(n), 'Pick a listed pay level.'),
      asksForAction: z.boolean(),
    }),
  }),
  z.object({ type: z.literal('lab_custom_remove'), index: z.number().int().min(0).max(1) }),
  z.object({ type: z.literal('lab_done') }),
  z.object({ type: z.literal('premortem'), answers: z.record(z.string(), z.enum(['tested', 'untested'])), checked: z.boolean(), skipped: z.boolean() }),
  z.object({
    type: z.literal('launch_submit'),
    choice: z.enum(['full_automation', 'limited_pilot', 'no_launch']),
    rationale: str(600),
    metrics: z.array(z.enum(['accept_rate', 'time_saved', 'corrections', 'complaints', 'escalations'])).max(5),
    rules: z.array(z.enum(['pause_conflict', 'pause_corrections', 'expand_after', 'no_rule'])).max(4),
  }),
  z.object({ type: z.literal('launch_done') }),
  z.object({ type: z.literal('report_generate') }),
  z.object({ type: z.literal('skip'), place }),
  z.object({ type: z.literal('unlock'), place }),
  z.object({ type: z.literal('reset'), place }),
])

export type Action = z.infer<typeof ActionSchema>

function requireOpen(s: Session, id: PlaceId) {
  if (!canEnter(s, id)) throw new ActionError(`${placeById(id).title} isn’t open yet.`, 409)
}

/** Advance the mission past `id`, but never backwards. */
function completeRoom(s: Session, id: PlaceId) {
  if (s.stage === placeById(id).stage) s.stage = nextStage(s.stage)
}

function noKey() {
  if (!hasAnthropic()) throw new ActionError('The AI model isn’t configured on this server (no Anthropic API key). Add one to .env.local and try again.', 503)
}

async function grade(s: Session) {
  if (s.grade) return // grade once; never overwrite
  try {
    noKey()
    s.grade = await gradeTranscript(s.interview.turns, s.interview.revealed)
    s.gradeError = null
  } catch (e) {
    s.gradeError = errMessage(e)
  }
}

export async function runAction(s: Session, a: Action): Promise<Record<string, unknown>> {
  switch (a.type) {
    // ---------------- Setup ----------------
    case 'setup_map': {
      const draft = draftStrengths(a.background, a.proud, a.aiExperience)
      const { strengths, source } = await rephraseStrengths(draft, a.background, a.proud)
      s.setup = { background: a.background, proud: a.proud, aiExperience: a.aiExperience, goal: a.goal, confidence: a.confidence, strengths, practice: PRACTICE_TODAY, confirmed: false, source }
      return {}
    }
    case 'setup_save': {
      if (!s.setup) throw new ActionError('Answer the setup questions first.')
      s.setup.strengths = a.strengths
      s.setup.confirmed = true
      s.report = null // the report quotes confirmed strengths, so regenerate it
      completeRoom(s, 'setup')
      return {}
    }
    case 'setup_skip': {
      if (!s.setup?.confirmed) s.setupLater = true
      completeRoom(s, 'setup')
      return {}
    }

    // ---------------- Interview ----------------
    case 'interview_start': {
      requireOpen(s, 'interview')
      if (s.interview.status === 'ended') throw new ActionError('This interview is over. Use “Reset this room” to start again.', 409)
      ensureOpener(s)
      s.interview.mode = a.mode
      s.interview.status = 'live'
      s.interview.startedAt ??= Date.now()
      return {}
    }
    case 'interview_ask': {
      requireOpen(s, 'interview')
      if (s.interview.status === 'ended') throw new ActionError('This interview is over.', 409)
      if (learnerCount(s.interview.turns) >= MAX_QUESTIONS) throw new ActionError(`That’s the ${MAX_QUESTIONS}-question limit. Wrap up to get your feedback.`, 409)
      noKey()
      ensureOpener(s)
      s.interview.status = 'live'
      s.interview.mode ??= 'typed'
      s.interview.startedAt ??= Date.now()
      const q = addTurn(s, 'learner', a.text)
      try {
        const { reply, revealed } = await mayaTypedReply(s.interview.turns)
        const t = addTurn(s, 'client', reply)
        if (revealed.length) s.interview.revealed[t.id] = revealed
      } catch (e) {
        // Roll back the question so the learner can retry.
        s.interview.turns = s.interview.turns.filter((t) => t.id !== q.id)
        throw new ActionError(`Maya couldn’t answer just now: ${errMessage(e)}`, 502)
      }
      return {}
    }
    case 'voice_start': {
      requireOpen(s, 'interview')
      if (s.interview.status === 'ended') throw new ActionError('This interview is over.', 409)
      if (a.reconnect) {
        if (s.interview.reconnects >= MAX_RECONNECTS) throw new ActionError('Too many reconnects. Switch to typing, or wrap up.', 409)
        s.interview.reconnects++
      }
      try {
        const token = await conversationToken()
        ensureOpener(s)
        s.interview.mode = 'voice'
        s.interview.status = 'live'
        s.interview.startedAt ??= Date.now()
        return { token, opening: a.reconnect ? RECONNECT_LINE : OPENER }
      } catch (e) {
        throw new ActionError(`Couldn’t reach the voice service: ${errMessage(e)}`, 502)
      }
    }
    case 'voice_register': {
      if (!s.interview.conversationIds.includes(a.conversationId)) s.interview.conversationIds.push(a.conversationId)
      return {}
    }
    case 'interview_end': {
      requireOpen(s, 'interview')
      if (s.interview.status !== 'ended') {
        if (s.interview.mode === 'voice') {
          let lines: { role: Turn['role']; text: string }[] = []
          try {
            if (s.interview.conversationIds.length) lines = await fetchTranscript(s.interview.conversationIds)
          } catch {
            lines = []
          }
          if (!lines.some((l) => l.role === 'learner') && a.captions?.length) {
            lines = mergeLines(a.captions.map((c) => ({ role: c.role, text: stripTags(c.text) })).filter((c) => c.text && !(c.role === 'learner' && isSilenceFiller(c.text))))
          }
          if (lines.length) {
            // The first agent line is the scripted opener (or a reconnect line).
            s.interview.turns = lines.map((l, i) => ({ id: `t${i + 1}`, role: l.role, text: l.text, ...(i === 0 && l.role === 'client' ? { opener: true } : {}) }))
            if (s.interview.turns[0]?.role !== 'client') s.interview.turns.unshift({ id: 't0', role: 'client', text: OPENER, opener: true })
            s.interview.turns = s.interview.turns.map((t, i) => ({ ...t, id: `t${i + 1}` }))
            // Reconnect lines are scripted too; mark them as openers so they never count as disclosures.
            s.interview.turns.forEach((t) => {
              if (t.role === 'client' && /got pulled away for a second/i.test(t.text) && t.text.length < 120) t.opener = true
            })
          }
        }
        const n = learnerCount(s.interview.turns)
        if (n < MIN_QUESTIONS) throw new ActionError(`Ask Maya at least ${MIN_QUESTIONS - n} more question${MIN_QUESTIONS - n === 1 ? '' : 's'} first.`, 409)
        s.interview.status = 'ended'
        s.interview.endedAt = Date.now()
        s.interview.transcriptId = transcriptHash(s.interview.turns)
        completeRoom(s, 'interview')
      }
      // Grading runs separately (interview_grade) so the learner can head to the Coffee Break straight away.
      return {}
    }
    case 'interview_grade': {
      if (s.interview.status !== 'ended') throw new ActionError('Finish the interview first.', 409)
      await grade(s)
      return {}
    }
    case 'grade_retry': {
      if (s.interview.status !== 'ended') throw new ActionError('Finish the interview first.', 409)
      await grade(s)
      if (!s.grade) throw new ActionError(s.gradeError ?? 'Scoring failed.', 502)
      return {}
    }

    // ---------------- Debrief ----------------
    case 'debrief_done': {
      requireOpen(s, 'debrief')
      completeRoom(s, 'debrief')
      return {}
    }

    // ---------------- Lab ----------------
    case 'lab_run': {
      requireOpen(s, 'lab')
      noKey()
      const run = await runAll(s)
      if (run.results.every((r) => r.failures.includes('model_error'))) throw new ActionError('The agent didn’t return usable answers. Try running again.', 502)
      s.lab.runs.push(run)
      return { run: run.n }
    }
    case 'lab_hint': {
      s.lab.hintUsed = true
      return {}
    }
    case 'lab_spot': {
      requireOpen(s, 'lab')
      const first = s.lab.runs[0]
      if (!first) throw new ActionError('Run the agent first.', 409)
      if (s.lab.spot) return {} // first judgment counts
      const sofia = first.results.find((r) => r.applicantId === 'T02')!
      const truth = sofia.pass ? 'right' : 'wrong'
      s.lab.spot = { answer: a.answer, hint: s.lab.hintUsed, correct: a.answer === truth }
      return {}
    }
    case 'lab_fix': {
      requireOpen(s, 'lab')
      s.lab.fix = { scheduleFilter: a.scheduleFilter, promptFix: a.promptFix }
      return {}
    }
    case 'lab_custom_add': {
      requireOpen(s, 'lab')
      if (s.lab.customs.length >= 2) throw new ActionError('You can add up to 2 of your own test cases.')
      if (CORE_TESTS.some((t) => t.name.toLowerCase() === a.spec.name.toLowerCase()) || s.lab.customs.some((c) => c.name.toLowerCase() === a.spec.name.toLowerCase()))
        throw new ActionError('That name is already in the tests.')
      const name = a.spec.name[0].toUpperCase() + a.spec.name.slice(1).toLowerCase()
      s.lab.customs.push({ ...a.spec, name, interests: a.spec.interests as never })
      return {}
    }
    case 'lab_custom_remove': {
      s.lab.customs.splice(a.index, 1)
      return {}
    }
    case 'lab_done': {
      requireOpen(s, 'lab')
      completeRoom(s, 'lab')
      return {}
    }

    // ---------------- Launch ----------------
    case 'premortem': {
      requireOpen(s, 'launch')
      s.launch.premortem = { answers: a.answers as never, checked: a.checked, skipped: a.skipped }
      return {}
    }
    case 'launch_submit': {
      requireOpen(s, 'launch')
      const computed = computeRollout({ choice: a.choice, metrics: a.metrics, rules: a.rules, premortem: s.launch.premortem, testsRun: s.lab.runs.length > 0 })
      const base = { choice: a.choice, rationale: a.rationale, metrics: a.metrics, rules: a.rules, computed }
      const { feedback, source } = await rolloutFeedback(base, s)
      s.launch.decision = { ...base, feedback, feedbackSource: source, at: Date.now() }
      s.report = null
      return {}
    }
    case 'launch_done': {
      requireOpen(s, 'launch')
      if (!s.launch.decision) throw new ActionError('Make your call first, or skip this step.', 409)
      completeRoom(s, 'launch')
      return {}
    }

    // ---------------- Report ----------------
    case 'report_generate': {
      requireOpen(s, 'report')
      const skills = computeSkills(s)
      const w = await reportWords(s, skills)
      s.report = { headline: w.headline, summary: w.summary, nextSteps: w.nextSteps, skills, source: w.source, generatedAt: Date.now() }
      completeRoom(s, 'report')
      return {}
    }

    // ---------------- Learner control ----------------
    case 'skip': {
      if (!SKIPPABLE.includes(a.place)) throw new ActionError('This step can’t be skipped.')
      requireOpen(s, a.place)
      if (s.stage !== placeById(a.place).stage) throw new ActionError('You can only skip the step you’re on.', 409)
      if (a.place === 'interview' && s.interview.status === 'live') s.interview.status = 'idle'
      if (!s.skipped.includes(a.place)) s.skipped.push(a.place)
      completeRoom(s, a.place)
      s.report = null
      return {}
    }
    case 'unlock': {
      // Demo shortcut: open any room by skipping every unfinished room before it.
      const target = stageIndex(placeById(a.place).stage)
      while (stageIndex(s.stage) < target) {
        const cur = placeForStage(s.stage)
        if (!cur) break
        if (cur.id === 'setup') {
          if (!s.setup?.confirmed) s.setupLater = true
        } else {
          if (cur.id === 'interview' && s.interview.status === 'live') s.interview.status = 'idle'
          if (!s.skipped.includes(cur.id)) s.skipped.push(cur.id)
        }
        completeRoom(s, cur.id)
      }
      s.report = null
      return {}
    }
    case 'reset': {
      requireOpen(s, a.place)
      const fresh = freshSession(s.id)
      if (a.place === 'setup') {
        s.setup = null
        s.setupLater = false
      }
      if (a.place === 'interview') {
        s.interview = fresh.interview
        s.grade = null
        s.gradeError = null
      }
      if (a.place === 'lab') s.lab = fresh.lab
      if (a.place === 'launch') s.launch = fresh.launch
      s.skipped = s.skipped.filter((p) => p !== a.place)
      const target = placeById(a.place).stage
      if (stageIndex(s.stage) > stageIndex(target)) s.stage = target
      s.report = null
      return {}
    }
  }
}
