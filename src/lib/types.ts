// Session shapes. `Session` is the server record; `SessionView` is what the browser may see.
import type { CustomSpec, FailureReason } from './catalog.ts'
import type { PlaceId, Stage } from './places.ts'
import type { AgentAnswer, Expected } from './policy.ts'
import type { TraceStep, TraceStepId } from './pipeline-code.ts'

export type AiExperience = 'new' | 'some' | 'built'

export interface Strength {
  id: string
  label: string
  application: string // "In deployment: …"
  from: string // her own words
}

export interface SetupData {
  background: string
  proud: string
  aiExperience: AiExperience | null
  goal: string | null
  confidence: number | null
  strengths: Strength[]
  practice: string[]
  confirmed: boolean
  source: 'ai' | 'fallback'
}

export interface Turn {
  id: string // t1, t2, …
  role: 'learner' | 'client'
  text: string
  opener?: boolean
}

export interface InterviewData {
  mode: 'voice' | 'typed' | null
  status: 'idle' | 'live' | 'ended'
  turns: Turn[]
  revealed: Record<string, string[]> // client turn id -> fact ids (typed mode)
  conversationIds: string[]
  reconnects: number
  startedAt: number | null
  endedAt: number | null
  transcriptId: string | null
}

export type RubricKey = 'problem' | 'workflow' | 'constraints' | 'metrics' | 'stakeholders'

export interface Evidence {
  turnId: string
  quote: string
}

export interface RubricScore {
  key: RubricKey
  label: string
  max: number
  score: number
  explanation: string
  evidence: Evidence[]
  evidenceRemoved: boolean
}

export interface Grade {
  transcriptId: string
  rubric: RubricScore[]
  total: number
  strengths: string[]
  improvements: string[]
  betterQuestions: string[]
  discoveredFacts: string[]
  gradedAt: number
}

export interface CaseResult {
  applicantId: string
  name: string
  custom: boolean
  answer: AgentAnswer | null
  failures: FailureReason[]
  pass: boolean
  steps: TraceStep[]
  failingStep: TraceStepId | null
  expected: Expected
}

export interface LabRun {
  n: number
  version: string
  scheduleFilter: boolean
  promptFix: boolean
  results: CaseResult[]
  coreScore: number
  at: number
}

export interface LabData {
  runs: LabRun[]
  spot: { answer: 'right' | 'wrong' | 'unsure'; hint: boolean; correct: boolean } | null
  hintUsed: boolean
  fix: { scheduleFilter: boolean; promptFix: boolean }
  customs: CustomSpec[]
}

export type RolloutChoice = 'full_automation' | 'limited_pilot' | 'no_launch'
export type MetricKey = 'accept_rate' | 'time_saved' | 'corrections' | 'complaints' | 'escalations'
export type RuleKey = 'pause_conflict' | 'pause_corrections' | 'expand_after' | 'no_rule'
export type PremortemKey = 'evenings' | 'unknown_prog' | 'no_fit' | 'enroll_today' | 'busy_week' | 'spanish' | 'class_moves' | 'blank_availability'

export interface RolloutComputed {
  coversUsefulness: boolean
  coversReliability: boolean
  hasPauseRule: boolean
  hasExpandRule: boolean
  premortemSpotted: number // of 4 untested
  premortemCorrect: number // of 8
  approvalKept: boolean
  testsRun: boolean
  notes: string[]
  outcome: 'cleared' | 'blocked' | 'hold'
}

export interface LaunchData {
  premortem: { answers: Partial<Record<PremortemKey, 'tested' | 'untested'>>; checked: boolean; skipped: boolean } | null
  decision: {
    choice: RolloutChoice
    rationale: string
    metrics: MetricKey[]
    rules: RuleKey[]
    computed: RolloutComputed
    feedback: string
    feedbackSource: 'ai' | 'fallback'
    at: number
  } | null
}

export type SkillKey = 'discovery' | 'constraints' | 'evaluating' | 'reliability' | 'deployment'
export type SkillStatus = 'demonstrated_independently' | 'demonstrated_with_help' | 'practiced' | 'not_yet_demonstrated' | 'not_assessed'

export interface EvidenceRef {
  kind: 'question' | 'client' | 'run' | 'test' | 'rollout'
  label: string // e.g. "YOU ASKED (QUESTION 3)"
  text: string
}

export interface SkillResult {
  key: SkillKey
  label: string
  status: SkillStatus
  explanation: string
  evidence: EvidenceRef[]
}

export interface Report {
  headline: string
  summary: string
  nextSteps: string[]
  skills: SkillResult[]
  source: 'ai' | 'fallback'
  generatedAt: number
}

export interface Session {
  id: string
  createdAt: number
  updatedAt: number
  stage: Stage
  setupLater: boolean
  skipped: PlaceId[]
  setup: SetupData | null
  interview: InterviewData
  grade: Grade | null
  gradeError: string | null
  lab: LabData
  launch: LaunchData
  report: Report | null
}

// ---- What the browser sees ----

export interface BriefView {
  statedRequest: string
  trueJob: string
  currentProcess: string
  scale: string
  success: string
  constraints: string[]
  scope: string
  facts: { id: string; label: string; text: string; discovered: boolean }[]
}

export interface SessionView extends Omit<Session, 'interview'> {
  interview: Omit<InterviewData, 'revealed'>
  brief: BriefView | null
  ai: { anthropic: boolean; voice: boolean }
}
