# Episode 09/17 · Breakdown Diagnosis (English)

Department: Production & maintenance · Skill: `breakdown-diagnosis`

## Thumbnail text (above the head)
**The machine stopped. Who finds out why?**

## Text to read in HeyGen
> The machine is down and the line is waiting. How fast can you find out why?
>
> [INTRO]  ← don't read; the standard intro + 'where to start' go here
>
> The Breakdown Diagnosis skill compares the symptoms with your maintenance history and sensor data where you have it. It brings back what was found last time with similar symptoms and which part was replaced, and ranks likely causes. It never touches the machine; it tells your technician where to start.
>
> Where would this skill help in your plant? Tell me in the comments, and follow for the next one.

## Screen recording (Claude)
- Open a new chat · attach: `sample-data/bakim-kayitlari.csv`
- **PROMPT** (paste):
```
CNC-3 has spindle vibration and dimensional drift. Using the attached maintenance log, rank likely causes and suggest checks.
```
- Record until the answer finishes. Details: CEKIM-REHBERI.md

## Caption
The machine stopped. Who finds out why? Claude for Manufacturing series, episode 9/17: Breakdown Diagnosis. #ClaudeAI #Manufacturing #IndustrialEngineering #AI

## Source note
Skill name and purpose: Anthropic claude-plugins-official/claude-for-manufacturing (skills/breakdown-diagnosis) + claude.com/plugins/claude-for-manufacturing. No overclaiming; human sign-off is stated.
