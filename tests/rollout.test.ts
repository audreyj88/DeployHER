import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeRollout } from '../src/lib/rollout.ts'

test('full automation is blocked; a well-planned pilot is cleared', () => {
  const full = computeRollout({ choice: 'full_automation', metrics: ['time_saved'], rules: [], premortem: null, testsRun: true })
  assert.equal(full.outcome, 'blocked')
  assert.equal(full.approvalKept, false)
  const pilot = computeRollout({ choice: 'limited_pilot', metrics: ['time_saved', 'corrections'], rules: ['pause_corrections', 'expand_after'], premortem: null, testsRun: true })
  assert.equal(pilot.outcome, 'cleared')
  assert.deepEqual(pilot.notes, ['Your metrics cover both usefulness and reliability.'])
  const hold = computeRollout({ choice: 'no_launch', metrics: [], rules: [], premortem: null, testsRun: false })
  assert.equal(hold.outcome, 'hold')
})

test('"No rule" cancels other rules and pre-mortem is scored', () => {
  const r = computeRollout({
    choice: 'limited_pilot',
    metrics: ['accept_rate'],
    rules: ['no_rule', 'pause_conflict'],
    premortem: { answers: { busy_week: 'untested', spanish: 'untested', school_hours: 'untested', job_changes: 'tested' }, checked: true, skipped: false },
    testsRun: true,
  })
  assert.equal(r.hasPauseRule, false)
  assert.equal(r.premortemSpotted, 2)
  assert.equal(r.premortemCorrect, 2)
  assert.ok(r.notes.some((n) => n.includes('finish line')))
})

import { draftStrengths } from '../src/lib/skills-map.ts'

test('skills map: "built a rubric" is not engineering; "built two AI tools" is', () => {
  const t = draftStrengths('Teacher, designed assessments', 'Built a grading rubric', 'new').map((s) => s.id)
  assert.ok(!t.includes('building'))
  const e = draftStrengths('Software engineer, built two AI tools', 'Shipped a feature', 'built').map((s) => s.id)
  assert.ok(e.includes('building'))
})
