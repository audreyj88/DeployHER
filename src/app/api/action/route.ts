import { ActionError, ActionSchema, runAction } from '@/server/actions'
import { errMessage } from '@/server/ai'
import { toView, withSession } from '@/server/store'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Bad request.' }, { status: 400 })
  }
  const parsed = ActionSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input.'
    return Response.json({ error: msg }, { status: 400 })
  }
  try {
    const { session, result } = await withSession((s) => runAction(s, parsed.data))
    return Response.json({ session: toView(session), ...result })
  } catch (e) {
    if (e instanceof ActionError) {
      // Persisting partial progress (e.g. a failed grade) happens inside runAction only when it returns normally.
      return Response.json({ error: e.message }, { status: e.status })
    }
    console.error('[action]', parsed.data.type, errMessage(e))
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
