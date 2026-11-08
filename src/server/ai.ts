import 'server-only'
import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText, Output } from 'ai'
import type { z } from 'zod'

export const MODEL_ID = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'
export const hasAnthropic = () => Boolean(process.env.ANTHROPIC_API_KEY)
export const hasVoice = () => Boolean(process.env.ELEVENLABS_API_KEY)
// Note: the session view also folds in the ElevenLabs credit check (see store.toView).

/** Claude 5.x models reject sampling temperature; keep the spec's values for models that accept them. */
const temp = (t: number) => (/claude-(sonnet|opus|haiku|fable)-5/.test(MODEL_ID()) ? {} : { temperature: t })

export class NoKeyError extends Error {
  constructor() {
    super('No Anthropic API key is configured on this server.')
  }
}

function model() {
  if (!hasAnthropic()) throw new NoKeyError()
  return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(MODEL_ID())
}

export interface Msg {
  role: 'user' | 'assistant'
  content: string
}

/** Structured output call. Throws on failure (callers decide on retry / fallback). */
export async function structured<S extends z.ZodType>(opts: {
  schema: S
  instructions: string
  prompt?: string
  messages?: Msg[]
  temperature: number
  maxOutputTokens?: number
}): Promise<z.infer<S>> {
  const base = {
    model: model(),
    instructions: opts.instructions,
    output: Output.object({ schema: opts.schema }),
    ...temp(opts.temperature),
    maxOutputTokens: opts.maxOutputTokens ?? 1500,
    maxRetries: 1,
  }
  const res = opts.messages
    ? await generateText({ ...base, messages: opts.messages })
    : await generateText({ ...base, prompt: opts.prompt ?? '' })
  return res.output as z.infer<S>
}

export async function text(opts: { instructions: string; prompt: string; temperature: number; maxOutputTokens?: number }) {
  const res = await generateText({
    model: model(),
    instructions: opts.instructions,
    prompt: opts.prompt,
    ...temp(opts.temperature),
    maxOutputTokens: Math.max(opts.maxOutputTokens ?? 600, 1000),
    maxRetries: 1,
  })
  return wholeSentences(res.text.trim())
}

/** Drop a trailing half-sentence if the model was cut off. */
export function wholeSentences(s: string) {
  if (/[.!?…”"')]$/.test(s)) return s
  const i = Math.max(s.lastIndexOf('. '), s.lastIndexOf('! '), s.lastIndexOf('? '))
  return i > 0 ? s.slice(0, i + 1) : s
}

export function errMessage(e: unknown) {
  if (e instanceof NoKeyError) return e.message
  const m = e instanceof Error ? e.message : String(e)
  // Never leak keys or long provider payloads.
  return m.replace(/sk-[a-zA-Z0-9_-]+/g, '[redacted]').slice(0, 200)
}
