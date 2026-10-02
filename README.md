# Claude Editing Skill

`mfm-video-editor`: a Claude Code skill that edits Make First Million videos automatically with [Remotion](https://www.remotion.dev).

Give it a recording folder (camera, mic, screen recordings). It syncs the audio, cuts silences, fillers, and retakes, then adds branded motion graphics, B-roll, and sound effects, and renders the finished video.

> **Status:** in development. See [docs/PLAN.md](docs/PLAN.md) for the full plan and decisions.

## Install (team)

In Claude Code:

```
/plugin marketplace add MaximumCell/Claude-editing-Skill
/plugin install mfm-video-editor@mfm-tools
```

Update later with `/plugin update`.

## Requirements (Windows)

- Node.js 22+
- ffmpeg
- yt-dlp
- A local **MFM-Studio** folder for logos, fonts, B-roll, SFX, and videos (created on first run)
- The shared team keys in `<MFM-Studio>/.env` (setup creates the file; see `.env.example`). `ELEVENLABS_API_KEY` matters most: without it, transcription runs locally and slowly

## Getting better over time

When you correct a video, the skill saves the fix as a rule in `skills/mfm-video-editor/references/learned-rules.md`. If you have push access (setup `--repo`), the rule is pushed, so everyone gets it with `/plugin update`. Without push access, rules go to `<MFM-Studio>/learned-rules-pending.md`, and you send that file to the maintainer.

## Repo layout

```
.claude-plugin/          plugin + marketplace manifests
skills/mfm-video-editor/ the skill (SKILL.md, references, scripts, Remotion template)
docs/PLAN.md             planning document
```
