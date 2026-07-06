# Anchor Hermes Check-in Experiment

Цель: за 14 дней проверить ADHD-клин Anchor без разработки iOS-фич: **приходит само → отвечаешь голосом/текстом за 10–30 секунд → Hermes структурирует → без стриков и стыда**.

Это не финальный продукт. Это дешёвый Wizard-of-Oz прототип поверх Hermes cron + Telegram/gateway.

## Гипотеза

Generic ritual tracker требует дисциплину как входной ресурс, поэтому его бросают. Для ADHD/исполнительной дисфункции нужен обратный UX:

1. Напоминание само приходит к человеку.
2. Ответ можно дать кашей: голосом, матом, обрывками мыслей.
3. AI сам вытаскивает структуру: настроение, сон, главное дело, блокеры, задачи.
4. Пропуски не наказываются: никаких стриков, только “привет, продолжаем с сегодня”.
5. Через неделю появляются паттерны, которые человек сам не заметит.

## Что уже собрано в MVP

В репе есть рабочий web-lite debug contour без тяжёлых Hermes cron jobs:

- route: `/voice-checkin`
- API: `/api/anchor-checkins`
- domain logic: `lib/anchor-checkin/checkin.ts`
- JSONL storage: `data/anchor-checkins/checkins.jsonl` (local-only, gitignored)
- tests: `lib/anchor-checkin/*.test.ts`

Это не главный UX, а engine/playground для проверки schema, reflection и digest.

Главный MVP loop теперь вынесен в Telegram через Hermes cron:

- morning nudge: `52286137facc`, 09:00 Asia/Saigon, `attach_to_session=true`, `deliver=all`
- evening nudge: `6d17741a21d5`, 22:00 Asia/Saigon, `attach_to_session=true`, `deliver=all`
- weekly digest: `9aa4097ed127`, Sunday 20:30 Asia/Saigon, `deliver=all`
- Telegram reply contract: Илья отвечает voice reply на nudge, Hermes STT транскрибирует, attached session prompt сохраняет JSONL в `~/.hermes/anchor-checkins/checkins.jsonl` и отвечает коротким reflection.

## Эксперимент

**Длительность:** 14 дней  
**Канал:** Hermes cron с доставкой в подключённые мессенджеры (`deliver=all`)  
**Основная метрика:** Илья отвечает ≥7 дней из 14 без ощущения “меня опять заставляют вести дневник”.  
**Вторичная метрика:** из ответов реально можно получить 2–3 полезных паттерна к концу первой недели.

Если даже основатель/целевой пользователь бросает это за 3–5 дней — клин слабый или механика всё ещё слишком тяжёлая.

## Check-in schema v1

Каждый ответ сохраняется как одна JSONL-строка. Схема **экстрактивная**: чего нет в речи — `null`/пусто. Не додумывать, не устраивать анкету после каждого ответа.

```ts
type AnchorCheckIn = {
  id: string;
  ts: string; // ISO timestamp with timezone
  dayKey: string; // local YYYY-MM-DD, Asia/Saigon — never UTC
  kind: 'morning' | 'evening' | 'spontaneous';

  raw: {
    transcript: string; // original text/transcript as-is
    durationSec: number | null;
  };

  mood: {
    valence: -2 | -1 | 0 | 1 | 2 | null; // bad ↔ good
    energy: -2 | -1 | 0 | 1 | 2 | null; // drained ↔ charged
    words: string[]; // user's own markers: "голова тяжёлая", "норм", "тревожно"
  };

  sleep: {
    quality: 1 | 2 | 3 | 4 | 5 | null;
    hoursApprox: number | null;
    note: string | null;
  };

  intention: {
    main: string | null; // one main thing, not a task dump
    rest: string[]; // secondary mentions
  };

  mentions: Array<{
    kind: 'task' | 'person' | 'worry' | 'body' | 'win' | 'idea' | 'place' | 'other';
    text: string;
  }>;

  evening: {
    mainOutcome: 'done' | 'partial' | 'not_done' | 'not_mentioned' | null;
    highlight: string | null;
    lowlight: string | null;
  };

  flags: {
    needsAttention: boolean; // crisis markers; do not score as mood=1/5
    isTooVague: boolean; // e.g. "норм"
  };
};
```

Why this shape:

- `mood.valence + mood.energy` maps to Anchor's mood grid better than one vague 1–5 score.
- `mood.words` keeps the user's language. “Голова тяжёлая” is more useful than “negative mood”.
- `intention.main` forces the product to choose one anchor for the day.
- `mentions` is raw material for weekly patterns without pretending every mention is a task.
- `evening.mainOutcome` closes the morning → evening loop.

## Prompt style

### Morning

Must feel like a low-friction nudge, not productivity guilt.

Good:

> Утренний якорь. Ответь голосом 10–20 сек: как ты, как спал, что сегодня одно главное? Можно кашей, я сам разберу.

Bad:

> Заполните дневник, настроение, сон, цели, привычки и план дня.

### Evening

Good:

> Вечерний якорь. Кинь голосом 10–30 сек: что сегодня получилось, что сожрало фокус, что не забыть завтра. Без отчёта и чувства вины.

Bad:

> Проанализируйте день и отметьте выполнение целей.

## Response handler behavior

When Ilya replies with voice/text to a check-in thread, Hermes should:

1. Treat transcribed voice as raw input. Do not complain about chaos, swearing, mixed languages, or incomplete thoughts.
2. Extract the schema above.
3. Save a JSONL row to `~/.hermes/anchor-checkins/checkins.jsonl`.
4. Reply with a compact structured summary:
   - mood/energy/sleep if inferred,
   - one main intention or one evening takeaway,
   - tasks if any,
   - one gentle reflection,
   - max one follow-up question.
5. Never mention streaks. Never shame missed days. If there was a gap, say: “окей, продолжаем с сегодня”.

## Weekly pattern digest

Once per week Hermes should read `~/.hermes/anchor-checkins/checkins.jsonl` and produce:

- what correlates with low/high mood,
- repeated blockers,
- tasks that keep resurfacing,
- best time/context for productive days,
- one practical adjustment for next week.

Tone: blunt, useful, no therapist cosplay.

## What this teaches the product

If the cron prototype works, app MVP should not start with a beautiful journal screen. It should start with:

1. notification / widget / message-first check-in,
2. voice input as primary path,
3. AI structuring as immediate reward,
4. no-streak forgiveness model,
5. weekly pattern insight.

Only after that does native app UI matter.
