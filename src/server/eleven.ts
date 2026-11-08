import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import type { Turn } from '@/lib/types'
import { isSilenceFiller } from '@/lib/voice'
import { MAYA_PERSONA, OPENER, VOICE_RULES } from './scenario'

const CACHE = path.join(process.cwd(), '.sessions', 'eleven-agent.json')
export const BELLA = 'hpp4J3VqNfWAUOO0d1Us'
export const MAX_RECONNECTS = 6

let client: ElevenLabsClient | null = null
function eleven() {
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('ElevenLabs is not configured on this server.')
  client ??= new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
  return client
}

function agentConfig() {
  return {
    name: 'DeployHER · Maya Chen (Next Chapter)',
    tags: ['deployher'],
    conversationConfig: {
      agent: {
        firstMessage: '{{opening}}',
        language: 'en',
        dynamicVariables: { dynamicVariablePlaceholders: { opening: OPENER } },
        prompt: {
          prompt: `${MAYA_PERSONA}\n${VOICE_RULES}`,
          llm: 'claude-sonnet-5-5',
          temperature: 0.6,
          maxTokens: 400,
        },
      },
      tts: {
        modelId: 'eleven_v4_turbo',
        voiceId: process.env.ELEVENLABS_VOICE_ID || BELLA,
        expressiveMode: true,
      },
      turn: {
        turnEagerness: 'normal',
        speculativeTurn: true,
        // Give learners time to think before Maya checks in ("Sorry, did I lose you?").
        turnTimeout: 15,
      },
      conversation: { maxDurationSeconds: 900 },
    },
    platformSettings: {
      auth: { enableAuth: true },
      privacy: { recordVoice: false, deleteAudio: true, retentionDays: 30 },
    },
  }
}

const configHash = () => crypto.createHash('sha256').update(JSON.stringify(agentConfig())).digest('hex').slice(0, 16)

let syncing: Promise<string> | null = null

/** Create the Maya agent once, and update it whenever its config changes. */
export function ensureAgent(): Promise<string> {
  syncing ??= (async () => {
    const hash = configHash()
    let cached: { agentId: string; hash: string } | null = null
    try {
      cached = JSON.parse(await fs.readFile(CACHE, 'utf8'))
    } catch {}
    const envId = process.env.ELEVENLABS_AGENT_ID
    const agentId = envId || cached?.agentId
    const cfg = agentConfig() as never
    if (agentId) {
      if (cached?.agentId !== agentId || cached.hash !== hash) {
        await eleven().conversationalAi.agents.update(agentId, cfg)
      }
      await writeCache({ agentId, hash })
      return agentId
    }
    const res = await eleven().conversationalAi.agents.create(cfg)
    await writeCache({ agentId: res.agentId, hash })
    return res.agentId
  })().finally(() => {
    syncing = null
  })
  return syncing
}

async function writeCache(v: { agentId: string; hash: string }) {
  await fs.mkdir(path.dirname(CACHE), { recursive: true })
  await fs.writeFile(CACHE, JSON.stringify(v))
}

// ---- Credit check -------------------------------------------------------
// When the ElevenLabs account runs out of credits, calls connect and are dropped at once
// ("agent not available"). Check first so learners get a clear message instead.

export class VoiceUnavailableError extends Error {}

let quota: { ok: boolean; at: number; resetsAt: number | null } | null = null

/** True if voice credits remain (or the check itself fails — never block on an unknown). Cached 60s. */
export async function voiceCreditsOk(): Promise<boolean> {
  if (!process.env.ELEVENLABS_API_KEY) return false
  if (quota && Date.now() - quota.at < 60_000) return quota.ok
  try {
    const sub = await eleven().user.subscription.get()
    const used = sub.characterCount ?? 0
    const limit = sub.characterLimit ?? Infinity
    // A reply costs a few hundred characters; below that, a call can't really start.
    quota = { ok: limit - used > 300, at: Date.now(), resetsAt: sub.nextCharacterCountResetUnix ?? null }
  } catch {
    quota = { ok: true, at: Date.now(), resetsAt: null }
  }
  return quota.ok
}

/** Last known credit state, without a network call (for the session view). */
export const voiceCreditsKnownOk = () => quota?.ok ?? true

function resetText() {
  if (!quota?.resetsAt) return ''
  const d = new Date(quota.resetsAt * 1000)
  return ` They reset on ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.`
}

export async function conversationToken() {
  if (!(await voiceCreditsOk()))
    throw new VoiceUnavailableError(`Maya’s voice is unavailable right now: this server’s ElevenLabs account has used up its voice credits.${resetText()} Switch to typing to keep going.`)
  const agentId = await ensureAgent()
  const res = await eleven().conversationalAi.conversations.getWebrtcToken({ agentId })
  return res.token
}

export const stripTags = (s: string) => s.replace(/\[[a-z][a-z ]{0,20}\]/gi, '').replace(/\s{2,}/g, ' ').trim()

/** Fetch transcripts for every conversation segment, strip audio tags, merge consecutive lines. */
export async function fetchTranscript(conversationIds: string[]): Promise<{ role: Turn['role']; text: string }[]> {
  const lines: { role: Turn['role']; text: string }[] = []
  for (const id of conversationIds) {
    let conv = await eleven().conversationalAi.conversations.get(id)
    // Transcripts can lag a moment after the session closes.
    for (let i = 0; i < 4 && conv.status !== 'done' && conv.status !== 'failed'; i++) {
      await new Promise((r) => setTimeout(r, 1200))
      conv = await eleven().conversationalAi.conversations.get(id)
    }
    for (const t of conv.transcript ?? []) {
      const text = stripTags(t.message ?? '')
      if (!text || (t.role === 'user' && isSilenceFiller(text))) continue
      lines.push({ role: t.role === 'user' ? 'learner' : 'client', text })
    }
  }
  return mergeLines(lines)
}

export function mergeLines(lines: { role: Turn['role']; text: string }[]) {
  const out: { role: Turn['role']; text: string }[] = []
  for (const l of lines) {
    const last = out[out.length - 1]
    if (last && last.role === l.role) last.text = `${last.text} ${l.text}`.trim()
    else out.push({ ...l })
  }
  return out
}
