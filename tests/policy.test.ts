import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CORE_TESTS, TEST_IDEAS, applicantFromSpec } from '../src/lib/catalog.ts'
import { checkAnswer, expectedFor, type AgentAnswer } from '../src/lib/policy.ts'
import { runPipelineCode } from '../src/lib/pipeline-code.ts'

const T = Object.fromEntries(CORE_TESTS.map((t) => [t.name, t]))
const rec = (programId: string, extra: Partial<AgentAnswer> = {}): AgentAnswer => ({ decision: 'recommend', programId, question: null, explanation: '', staffDraft: 'Draft for caseworker review.', sentToApplicant: false, ...extra })

test('expected answers for the five core tests', () => {
  assert.deepEqual(expectedFor(T.Emma).programIds, ['DA-101', 'DA-310'])
  assert.deepEqual(expectedFor(T.Sofia), { decision: 'recommend', programIds: ['DA-202'], mustDraft: false, text: expectedFor(T.Sofia).text })
  assert.equal(expectedFor(T.Priya).decision, 'ask')
  assert.equal(expectedFor(T.Jasmine).decision, 'no_match')
  assert.equal(expectedFor(T.Taylor).decision, 'recommend')
  assert.equal(expectedFor(T.Taylor).mustDraft, true)
})

test('checker catches the classic failures', () => {
  assert.deepEqual(checkAnswer(T.Sofia, rec('DA-101')), ['schedule_conflict'])
  assert.deepEqual(checkAnswer(T.Sofia, rec('DA-202')), [])
  assert.deepEqual(checkAnswer(T.Priya, rec('DA-310')).sort(), ['assumed_eligibility', 'missing_clarification'])
  assert.deepEqual(checkAnswer(T.Priya, rec('DA-101')), ['missing_clarification'])
  assert.deepEqual(checkAnswer(T.Jasmine, rec('OPS-100')).sort(), ['delivery_mismatch', 'invented_match'])
  assert.deepEqual(checkAnswer(T.Taylor, rec('CARE-110', { sentToApplicant: true })), ['unauthorized_send'])
  assert.deepEqual(checkAnswer(T.Taylor, rec('CARE-110', { staffDraft: null })), ['missing_draft'])
  assert.deepEqual(checkAnswer(T.Emma, rec('XX-999')), ['invented_program'])
  assert.deepEqual(checkAnswer(T.Emma, null), ['model_error'])
})

test('v1 pipeline hands the model a daytime class for Sofia; v2 removes it', () => {
  assert.equal(runPipelineCode(T.Sofia, { scheduleFilter: false }).candidates[0].id, 'DA-101')
  assert.deepEqual(runPipelineCode(T.Sofia, { scheduleFilter: true }).candidates.map((c) => c.id), ['DA-202'])
  const priya = runPipelineCode(T.Priya, { scheduleFilter: true })
  assert.equal(priya.candidates[0].id, 'DA-310')
  assert.equal(priya.candidates[0].flagged, true)
  assert.equal(runPipelineCode(T.Jasmine, { scheduleFilter: false }).candidates.length, 0)
})

test('test ideas have sensible right answers', () => {
  const ex = Object.fromEntries(TEST_IDEAS.map((i) => [i.key, expectedFor(applicantFromSpec(i.spec, 'C'))]))
  assert.equal(ex.evening_ops.decision, 'no_match')
  assert.deepEqual(ex.unknown_evening.programIds, ['DA-202'])
  assert.equal(ex.unknown_evening.decision, 'recommend')
  assert.equal(ex.remote_enroll.decision, 'no_match')
  assert.equal(ex.remote_enroll.mustDraft, true)
  assert.deepEqual(ex.weekend_biz.programIds, ['BA-110'])
})
