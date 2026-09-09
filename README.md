# AI Pitch Deck

Turn a one-line startup idea into a complete, investor-style pitch deck — with written slides **and** AI-generated images — automatically.

You type an idea like _"A B2B SaaS that automates invoice reconciliation."_ A few moments later you get a polished slide carousel: a title slide, the problem, the solution, the market, the product, the business model, and the funding ask — each with its own illustration.

---

## Table of Contents

- [What This Project Does (Plain English)](#what-this-project-does-plain-english)
- [A Real Example](#a-real-example)
- [Who Is This For](#who-is-this-for)
- [The Big Picture (Complete Flow)](#the-big-picture-complete-flow)
- [How It Works, Step by Step](#how-it-works-step-by-step)
- [The Technology, Explained Simply](#the-technology-explained-simply)
- [Architecture Diagram](#architecture-diagram)
- [The AI Brain: Agent + Guardrails](#the-ai-brain-agent--guardrails)
- [What Gets Stored (Data Model)](#what-gets-stored-data-model)
- [Project Structure](#project-structure)
- [Getting It Running](#getting-it-running)
- [Environment Variables](#environment-variables)
- [Common Questions (FAQ)](#common-questions-faq)
- [What This Project Intentionally Skips](#what-this-project-intentionally-skips)

---

## What This Project Does (Plain English)

Imagine hiring an assistant to make a pitch deck. You give them one sentence about your idea. They go away, think about it, write all the slides, draw a picture for each slide, and hand you back a finished presentation.

This app **is** that assistant, but it's software and it works in under a minute.

The clever part: because generating text and images takes time, the app doesn't make you sit and stare at a frozen screen. It accepts your idea instantly, then does the heavy work **in the background**. Your screen quietly checks "is it ready yet?" every few seconds and shows the finished deck the moment it's done — exactly like tracking a food-delivery order on a map.

---

## A Real Example

| Step | What you see |
| --- | --- |
| 1 | You type: _"A mobile app that helps home cooks plan weekly meals and auto-builds a grocery list."_ |
| 2 | You click **Generate Pitch Deck**. |
| 3 | The page shows a spinner: _"Generating your pitch deck…"_ |
| 4 | About 30–60 seconds later, a slide carousel appears. |
| 5 | You swipe through 6–7 slides: Title → Problem → Solution → Market → Product → Business Model → The Ask, each with its own image. |

---

## Who Is This For

- **Non-technical readers / HR / stakeholders:** to understand what the product does and why it's built the way it is. Start with [The Big Picture](#the-big-picture-complete-flow).
- **Developers & AI agents:** to understand the code, data flow, and how each piece connects. See [Architecture Diagram](#architecture-diagram) and [Project Structure](#project-structure).

---

## The Big Picture (Complete Flow)

Here is the full journey, from pressing a button to seeing the finished deck.

![AI Pitch Deck — Complete Workflow](docs/Complete-Flow.png)

In one sentence: **the website takes your idea, an AI writes the slides, another service draws the images, everything is saved to a database, and the website keeps refreshing until the deck is ready.**

```mermaid
flowchart LR
    A["You type an idea<br/>and click Generate"] --> B["Website saves the idea<br/>and says 'got it!'"]
    B --> C["A background worker<br/>starts the real work"]
    C --> D["AI writes the slides<br/>(title, problem, solution...)"]
    D --> E["AI draws an image<br/>for every slide"]
    E --> F["Everything is saved<br/>to the database"]
    F --> G["Your screen refreshes<br/>and shows the finished deck"]
```

---

## How It Works, Step by Step

This is the same flow as the diagram above, told as a story. Each numbered step maps to a real part of the code.

1. **You submit an idea.** On the home page you type your idea (at least 20 characters) and hit the button. _(`components/create-deck-form.tsx`)_

2. **The website records it instantly.** The request goes to an API endpoint that saves a new "Deck" in the database with the status `PENDING`, then immediately replies with the deck's ID. You are redirected to the deck's page right away — no waiting. _(`app/api/decks/route.ts`)_

3. **A background job kicks off.** At the same moment, the API fires off a message (an "event" called `deck/generate`) to a background-job service. This is what lets the website respond instantly while the slow work happens elsewhere. _(`inngest/client.ts`)_

4. **The AI writes the slides.** The background worker asks an **AI agent** to turn the idea into structured slide content — a title plus 6–7 slides, each with a heading, bullet points, and a description of the image it wants. Before and after the AI runs, **guardrails** check the work (more on these below). _(`lib/agents/*`)_

5. **The AI draws each image.** For every slide, the worker sends the image description to OpenAI's image generator, gets back a picture, and uploads it to **ImageKit** (an image-hosting service that serves the images fast worldwide). The public image link is saved with the slide. _(`lib/openai.ts`, `lib/imageKit.ts`)_

6. **Everything is saved.** Each finished slide is written to the database and linked to its deck. When all slides are done, the deck's status flips to `COMPLETE`. If anything fails, it's marked `FAILED` with an error message. _(`inngest/functions/generate-deck.ts`)_

7. **Your screen updates itself.** While all this happens, the deck page quietly asks the server "is it ready?" every 3 seconds. As soon as the status is `COMPLETE`, it swaps the spinner for a swipeable slide carousel. _(`components/deck-viewer.tsx`)_

**The status a deck moves through:**

```mermaid
stateDiagram-v2
    [*] --> PENDING: You submit an idea
    PENDING --> GENERATING: Background worker starts
    GENERATING --> COMPLETE: All slides + images done
    GENERATING --> FAILED: Something went wrong
    COMPLETE --> [*]
    FAILED --> [*]
```

---

## The Technology, Explained Simply

Each tool has one clear job. Here's what each does and a plain-English analogy.

| Technology | Its job here | Think of it as… |
| --- | --- | --- |
| **Next.js** (React) | The website itself — the pages you see and the API behind them | The storefront and the front desk |
| **OpenAI Agents SDK** | The "writer" that turns your idea into slide text | A smart copywriter |
| **OpenAI Images** (`gpt-image`) | Draws a picture for each slide | An illustrator |
| **ImageKit** | Stores and delivers the images quickly | A photo gallery / warehouse |
| **Inngest** | Runs the slow work in the background, with retries | A reliable back-office team |
| **Prisma + PostgreSQL (Neon)** | Saves every deck and slide | The filing cabinet |
| **Zod** | Checks that data has the right shape | A strict proofreader |
| **Tailwind + shadcn/ui** | Makes everything look clean | The interior designer |

Why a background worker (Inngest) instead of just doing it all at once? Because writing text and drawing 6–7 images can take a minute, and web requests aren't meant to hang that long. Inngest lets each step run separately, **retry automatically if it fails**, and be watched in a dashboard — so one hiccup drawing image #4 doesn't throw away the whole deck.

---

## Architecture Diagram

For developers and agents, here's how the parts connect at a technical level.

```mermaid
flowchart TD
    subgraph Browser["Browser (what the user sees)"]
        Form["CreateDeckForm<br/>app/page.tsx"]
        Viewer["DeckViewer<br/>polls every 3s"]
    end

    subgraph API["API layer — Next.js (app/api)"]
        PostDecks["POST /api/decks<br/>create deck + send event"]
        GetDeck["GET /api/decks/[id]<br/>return deck + slides"]
        InngestRoute["/api/inngest<br/>background-job handler"]
    end

    subgraph Background["Background job — Inngest"]
        Job["generate-deck function<br/>inngest/functions/generate-deck.ts"]
    end

    subgraph External["External services"]
        Agent["OpenAI Agent<br/>+ guardrails"]
        Images["OpenAI Images<br/>gpt-image-1-mini"]
        IK["ImageKit CDN"]
    end

    DB[("PostgreSQL / Neon<br/>Deck + Slide<br/>via Prisma")]

    Form -->|"submit idea"| PostDecks
    PostDecks -->|"create Deck (PENDING)"| DB
    PostDecks -->|"send 'deck/generate'"| Job
    PostDecks -->|"201 { id }"| Form
    Form -->|"redirect to /decks/[id]"| Viewer

    Viewer -->|"poll"| GetDeck
    GetDeck -->|"read deck + slides"| DB

    Job -->|"1. write slides"| Agent
    Job -->|"2. per slide: draw image"| Images
    Job -->|"3. host image"| IK
    Job -->|"read/write status + slides"| DB
    InngestRoute -.->|"hosts"| Job
```

**The background job's internal steps** (each is a separate, retryable unit in Inngest):

```mermaid
flowchart TD
    S1["load-deck<br/>read the deck from DB"] --> S2["mark-generating<br/>status = GENERATING"]
    S2 --> S3["run-agent<br/>AI writes the slide JSON"]
    S3 --> S4["save-title<br/>store the deck title"]
    S4 --> S5["for each slide:<br/>image-N → draw + upload"]
    S5 --> S6["save-slide-N<br/>create Slide record"]
    S6 --> S7{"more slides?"}
    S7 -->|yes| S5
    S7 -->|no| S8["mark-complete<br/>status = COMPLETE"]
    S3 -.->|error| SF["mark-failed<br/>status = FAILED + message"]
    S5 -.->|error| SF
```

---

## The AI Brain: Agent + Guardrails

The most interesting part of the project is how it keeps the AI's output safe and well-structured. There are three layers working together.

```mermaid
flowchart LR
    Idea["User's idea"] --> G1{"Input Guardrail<br/>Is the idea at least<br/>20 characters?"}
    G1 -->|"too short"| Block1["Blocked early<br/>(no AI call, no cost)"]
    G1 -->|"ok"| Agent["Pitch Deck Agent<br/>gpt-4o-mini<br/>writes structured slides"]
    Agent --> G2{"Output Guardrail<br/>A 2nd AI reviews the deck:<br/>no filler, no bad content?"}
    G2 -->|"fails review"| Block2["Blocked<br/>deck marked FAILED"]
    G2 -->|"passes"| Valid["Validated JSON<br/>(checked by Zod)"]
```

1. **Input guardrail (a simple rule):** Before spending any money on the AI, it rejects ideas shorter than 20 characters. Fast and free. _(`lib/agents/guardrails.ts`)_

2. **Structured output:** The main agent is forced to return data in an exact shape — a deck title plus 5–8 slides, each with a title, content, and image prompt. That shape is defined once with **Zod** and reused everywhere. _(`lib/schemas/pitch-deck.ts`)_

3. **Output guardrail (a second AI):** After the deck is written, a small "quality checker" AI reviews it and rejects placeholder junk ("TBD", "lorem ipsum"), empty slides, or anything that isn't a real business pitch. _(`lib/agents/guardrails.ts`)_

This "check before, generate, check after" pattern is what makes AI output reliable enough to show a user.

---

## What Gets Stored (Data Model)

There are just two tables. One deck has many slides.

```mermaid
erDiagram
    DECK ||--o{ SLIDE : "has many"
    DECK {
        string id PK
        string idea
        string title "set by AI"
        enum   status "PENDING/GENERATING/COMPLETE/FAILED"
        string errorMessage "set if it fails"
        datetime createdAt
        datetime updatedAt
    }
    SLIDE {
        string id PK
        string deckId FK
        int    order "1, 2, 3..."
        string title
        string content "bullet points"
        string imagePrompt "text used to draw the image"
        string imageUrl "hosted on ImageKit"
        datetime createdAt
    }
```

_(Defined in `prisma/schema.prisma`.)_

---

## Project Structure

```
ai-pitch-deck/
├── app/
│   ├── api/
│   │   ├── decks/
│   │   │   ├── route.ts            # POST (create) + GET (list) decks
│   │   │   └── [id]/route.ts       # GET a single deck with its slides
│   │   └── inngest/route.ts        # Hosts the background-job handler
│   ├── decks/
│   │   ├── page.tsx                # "My Decks" list page
│   │   └── [id]/page.tsx           # Single deck viewer page
│   ├── layout.tsx                  # App shell / metadata
│   └── page.tsx                    # Home page (the idea form)
├── components/
│   ├── create-deck-form.tsx        # The idea input form
│   ├── deck-viewer.tsx             # Polls status + shows the carousel
│   ├── deck-status-badge.tsx       # Pending/Generating/Complete/Failed badge
│   ├── site-header.tsx             # Top navigation
│   └── ui/                         # shadcn/ui building blocks
├── inngest/
│   ├── client.ts                   # Inngest client + event definitions
│   └── functions/
│       ├── generate-deck.ts        # The main background job (the pipeline)
│       └── index.ts
├── lib/
│   ├── agents/
│   │   ├── pitch-deck-agent.ts     # The main AI agent config
│   │   ├── guardrails.ts           # Input + output guardrails
│   │   └── generate-pitch-deck.ts  # Public generatePitchDeck() function
│   ├── schemas/
│   │   └── pitch-deck.ts           # Zod schema for the deck shape
│   ├── types/
│   │   └── deck.ts                 # Shared TypeScript types
│   ├── db.ts                       # Prisma client (single shared instance)
│   ├── openai.ts                   # generateSlideImage()
│   └── imageKit.ts                 # uploadSlideImage()
├── prisma/
│   └── schema.prisma               # Database models: Deck, Slide
├── docs/
│   └── Complete-Flow.png           # The full workflow diagram
├── prisma7.config.ts               # Prisma 7 config
└── package.json
```

---

## Getting It Running

> **Prerequisites:** [Bun](https://bun.sh) installed, plus accounts for [OpenAI](https://platform.openai.com), [Neon Postgres](https://neon.tech), and [ImageKit](https://imagekit.io).

**1. Install dependencies**

```bash
bun install
```

**2. Set up your environment file**

Create a `.env` file in the project root and fill in your own keys (see [Environment Variables](#environment-variables) below). Never commit real keys.

**3. Set up the database**

```bash
bun --bun run prisma migrate dev
bun --bun run prisma generate
```

**4. Run the app (two terminals)**

```bash
# Terminal 1 — the website
bun run dev
# → http://localhost:3000

# Terminal 2 — the background-job dev server
bunx inngest-cli@latest dev
# → http://localhost:8288 (Inngest dashboard)
```

**5. Try it**

Open http://localhost:3000, type an idea (20+ characters), and click **Generate Pitch Deck**. Watch the deck page update on its own.

> **Tip:** To test without spending money on image generation, set `USE_PLACEHOLDER_IMAGES=true` in `.env`. The app then uses free stock photos instead of the paid OpenAI image API.

---

## Environment Variables

Create a `.env` file with the following. Use **your own** credentials — the values below are placeholders.

```bash
# PostgreSQL connection string (from Neon)
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"

# OpenAI — used by both the writing agent and the image generator
OPENAI_API_KEY="sk-..."

# ImageKit — hosts the generated slide images
IMAGEKIT_PUBLIC_KEY="public_..."
IMAGEKIT_PRIVATE_KEY="private_..."
IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/your_id"

# Inngest — run the local dev server without cloud keys
INNGEST_DEV="1"

# Optional dev shortcut: use free stock photos instead of paid image API
# USE_PLACEHOLDER_IMAGES="true"
```

> ⚠️ **Security note:** `.env` holds secrets (database password, API keys). It must stay out of version control (`.gitignore`). If any key is ever committed or shared, rotate it immediately.

---

## Common Questions (FAQ)

**Why does the page keep refreshing instead of showing the deck immediately?**
Writing text and drawing 6–7 images takes time. Rather than freeze the screen, the app does the work in the background and the page checks for updates every 3 seconds. This is called _polling_.

**What happens if the AI produces something bad or fails?**
Two guardrails catch problems: one rejects ideas that are too short (before any AI runs), and a second AI reviews the finished deck for junk or unsafe content. If generation genuinely fails, the deck is marked `FAILED` and shows an error message instead of breaking.

**Does it cost money to run?**
The OpenAI text and image calls are paid. For free local testing, set `USE_PLACEHOLDER_IMAGES=true` to skip the paid image API.

**Can I regenerate or edit a single slide?**
Not in this version — see below.

---

## What This Project Intentionally Skips

This is a focused learning project, not a production product. It deliberately leaves out:

- User accounts / login
- Rate limiting and billing
- Editing or regenerating individual slides
- Exporting to PDF or PowerPoint
- Live websocket updates (it uses simple polling instead)

These are natural next steps if the project were taken further.
