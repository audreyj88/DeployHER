# DeployHER

**Closing the gender gap in the AI economy.** DeployHER is a playable AI-deployment apprenticeship set in a walkable, toy-like 3D campus.

You walk six rooms arranged in a ring around a central plaza. Each room is one step of a client engagement for **Next Chapter**, a fictional nonprofit run by **Maya Chen** that helps women return to paid work after caregiving breaks:

| # | Room | What you do |
|---|------|-------------|
| 1 | The Greenhouse | Map what you already know to deployment skills |
| 2 | Next Chapter · Client Interview | Interview Maya (by voice or by typing) to find the real problem |
| 3 | The Coffee Break | Debrief with your coach Nia: your score, what you missed, the full client brief |
| 4 | Make It Work Lab | Test a real AI agent, find the failure, fix it, test again |
| 5 | Launch Pad | Decide whether, and how, to roll it out |
| 6 | Skills Report | Get an honest summary of what you practiced and showed |

**Core principle:** code computes every score, verdict and skill status. The LLM is used only to role-play Maya, to act as the agent under test, or to put results that code already computed into words.

All people, organisations, numbers and applicants are fictional. This is an introductory simulation, not a professional certification.

## Running it

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev                  # http://localhost:3040
```

`.env.local`:

```
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-5-5
ELEVENLABS_API_KEY=...
# ELEVENLABS_AGENT_ID=   (optional: reuse an existing agent)
# ELEVENLABS_VOICE_ID=   (optional: override the voice)
```

- **Without an Anthropic key:** setup, rollout feedback and the report use clearly labelled deterministic fallbacks. The interview, grading and the lab show retryable errors and never fake results.
- **Without an ElevenLabs key:** the interview is typed only.
- **The voice agent:** on the first voice interview, the server creates Maya's ElevenLabs agent. It updates the agent whenever its config changes, and caches the agent ID in `.sessions/`.

## How it works

- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, three.js with @react-three/fiber, drei and postprocessing, zustand, zod, AI SDK 7 with `@ai-sdk/anthropic`, and ElevenLabs Agents over WebRTC.
- **Sessions** are JSON files in `.sessions/`, keyed by a random httpOnly cookie. A refresh resumes your mission, and your spot on campus is kept in `localStorage`.
- **The server enforces the stage rules.** Hidden facts, the rubric and the client brief never reach the browser before the debrief.
- **The policy engine** (`src/lib/policy.ts`) is plain code. It checks every agent answer against the client's rules: experience requirements, minimum pay, hours, work location, ask-when-unknown, and draft-never-send.
- **Grading** cites turn IDs and verbatim quotes. The server drops any evidence that isn't in the transcript, sets unsupported scores to 0, and sums the total itself.

```bash
npm test          # policy + pipeline unit tests
npm run typecheck
```

## Privacy

Answers, transcripts and results are stored on the server running DeployHER, under a random session ID. You need no account and no name. Nothing is ranked, made public or shared with employers. "Delete my session" removes your data. Voice audio is not recorded (`recordVoice: false`, `deleteAudio: true`); the words are kept so DeployHER can give you feedback.

Session storage uses the local file system, so this setup suits running locally or on a single server. It won't work on serverless hosts with ephemeral disks.
