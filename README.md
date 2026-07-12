<div align="center">

# 🛸 Uforia

**Ask questions about UFO documents.**

A portable, production-ready **RAG** (Retrieval-Augmented Generation) web app.
Upload UFO PDFs and images, and chat with them — answers come back grounded in
your own files, with citations to the exact source passages.

Built with **Next.js 14 (App Router)** · **TypeScript** · **Tailwind CSS** ·
**Prisma** · **PostgreSQL** · **local embeddings** (Transformers.js).

</div>

---

## ✨ Features

- **Document upload** — drag-and-drop for **PDFs** and **images**.
- **Bulk ingestion CLI** — pull in official government UAP releases (ODNI, AARO,
  CIA FOIA…) from a curated manifest, a folder, or a URL (`npm run ingest`).
- **Text extraction** — PDF parsing (`pdf-parse`) + **OCR for images** (`tesseract.js`).
- **Local embeddings** — semantic vectors generated on-device with Transformers.js
  (`all-MiniLM-L6-v2`). **No external embedding API required**, so the app is fully portable.
- **Semantic search** — cosine-similarity retrieval over stored vectors. Works on
  **any standard PostgreSQL** (no special extension needed).
- **Cited answers** — an LLM composes the answer and cites the passages it used (`[1]`, `[2]`…).
- **Document library** — search, filter, reprocess, and delete documents with live status.
- **Settings / health** — built-in system status page (DB, LLM, embeddings, env validation).
- **Cosmic UI** — responsive, modern, space-themed interface with a UFO logo.

---

## 🧠 How it works

```
Upload ─▶ Local file storage (uploads/)
            │
            ▼
       Extract text  (PDF parse / image OCR)
            │
            ▼
       Chunk  ─▶  Embed locally (Transformers.js)  ─▶  Store vectors (Postgres)
                                                            │
Question ─▶ Embed query ─▶ Cosine similarity ─▶ Top-k chunks ┘
                                                  │
                                                  ▼
                                         LLM answer + citations
```

---

## 📦 Tech stack

| Layer        | Choice                                              |
|--------------|-----------------------------------------------------|
| Framework    | Next.js 14 (App Router), React 18, TypeScript       |
| Styling      | Tailwind CSS + shadcn/ui                            |
| Database     | PostgreSQL via Prisma ORM                            |
| Storage      | Local filesystem (`uploads/`, configurable via `UPLOADS_DIR`) |
| Embeddings   | Transformers.js (`Xenova/all-MiniLM-L6-v2`) — local |
| Extraction   | `pdf-parse` (PDF) · `tesseract.js` (image OCR)       |
| LLM          | Claude API (Anthropic SDK) — `claude-opus-4-8`       |

---

## ✅ Prerequisites

- **Node.js 18+** (20+ recommended) and **Yarn** (or npm)
- A **PostgreSQL** database (local, Docker, or hosted)
- *(Optional)* An **Anthropic API key** for LLM answer generation. Without it the
  app returns extractive answers (the most relevant passages).

> The embedding model (~90 MB) is downloaded automatically on first use and cached.

---

## 🚀 Installation

```bash
# 1. Install dependencies
yarn install        # or: npm install

# 2. Configure environment
cp .env.example .env
#   then edit .env with your DATABASE_URL and (optionally) ANTHROPIC_API_KEY

# 3. Set up the database schema
yarn prisma generate
yarn prisma db push      # creates tables from prisma/schema.prisma

# 4. Run the dev server
yarn dev                 # http://localhost:3000
```

### Production build

```bash
yarn build
yarn start               # serves the production build on port 3000
```

---

## 📥 Ingesting government UAP releases

Uforia ships with a bulk ingestion CLI and a curated manifest of official U.S.
government UAP/UFO releases ([`data/sources.json`](./data/sources.json)) —
including the ODNI Preliminary Assessment (2021), the ODNI annual UAP reports,
and the AARO Historical Record Report. Ingested documents go through the same
pipeline as UI uploads: store → extract text → chunk → embed.

```bash
# Ingest everything in data/sources.json
npm run ingest

# Verify the remote sources are reachable first (no DB writes)
npm run ingest -- --check

# Ingest a folder of PDFs/images you downloaded yourself
npm run ingest -- --dir ~/Downloads/uap-docs

# Ingest a single document by URL
npm run ingest -- --url https://example.gov/report.pdf --name AARO-Report.pdf

# Crawl a web page (and its sub-pages) for PDFs/images and ingest what it finds
npm run ingest -- --page https://www.archives.gov/research/topics/uaps --match "uap|ufo"
```

### Crawling pages instead of listing files

A `data/sources.json` entry can point at a **web page** instead of a document —
the ingester scans the page and its sub-pages (same site only) for PDF/image
links and ingests them:

```json
{
  "type": "page",
  "title": "National Archives — UAP topic page (crawled)",
  "url": "https://www.archives.gov/research/topics/uaps",
  "depth": 1,
  "match": "uap|ufo|pbb|blue.?book|unidentified"
}
```

- `depth` — how many levels of sub-pages to follow (default 1)
- `limit` — optional max documents per source (default: unlimited)
- `match` — case-insensitive regex; only follows links matching it (keeps the
  crawl on-topic and skips site logos/icons)

The crawler is capped at 30 page fetches per source with a politeness delay.
`npm run ingest -- --check` dry-runs the crawl and lists what it would ingest
without touching the database.

The crawler extracts `href`/`src` links **and scans linked `.csv`/`.json` data
files** for document URLs — many JS-rendered government pages (e.g. the DoD's
<https://www.war.gov/UFO/> interactive, whose 1,500+ record index lives in a
`uap-data.csv`) expose their whole document list that way.

> ℹ️ Beyond that, the crawler reads static HTML only. Pages that render their
> document lists purely with JavaScript (e.g. catalog.archives.gov search
> results) won't expose links to it — download those in a browser and use
> `--dir`.

> ⚠️ **Government sites often block non-browser clients** (dni.gov and
> media.defense.gov sit behind bot protection). If `npm run ingest` reports
> download failures, open the URLs from `data/sources.json` in a browser, save
> the PDFs into a folder, and run `npm run ingest -- --dir <folder>`.

Where to find new releases to add to `data/sources.json` (or download for `--dir`):

|                        Source                           |                               URL                             |
|---------------------------------------------------------|---------------------------------------------------------------|
| AARO (DoD All-domain Anomaly Resolution Office) reports | <https://www.aaro.mil/>                                       |
| National Archives UAP Records Collection                | <https://www.archives.gov/research/topics/uaps>               |
| CIA FOIA Reading Room — UFO collection                  | <https://www.cia.gov/readingroom/collection/ufos>             |
| FBI Vault — UFO files                                   | <https://vault.fbi.gov/UFO>                                   |

Ingestion is idempotent — documents already in the database (matched by file
name) are skipped **before they are downloaded**, so re-running `npm run ingest`
only pulls documents that are new since the last run. Documents that errored
during processing are retried on the next run.

> 🎥 Note: only **PDFs and images** are supported. Video releases (e.g. the
> Navy "Tic Tac" footage) can't be ingested; official *transcripts or reports
> about* them can.

---

## 🗄️ Database setup

Uforia uses Prisma with three models (see `prisma/schema.prisma`):

- **Document** — uploaded file metadata + processing status + extracted text.
- **DocumentChunk** — text chunks and their embedding vectors (`Float[]`).
- **ChatMessage** — chat history with stored source citations.

Create the schema against your database:

```bash
yarn prisma db push          # quick sync (great for getting started)
# or, for tracked migrations:
yarn prisma migrate dev --name init
```

### Scaling note (optional pgvector)

Retrieval computes cosine similarity **in application code**, which keeps Uforia
portable to any Postgres and is plenty fast for thousands of chunks. For very large
corpora you can install the [`pgvector`](https://github.com/pgvector/pgvector)
extension and switch `DocumentChunk.embedding` to a `vector` column with an
in-database `<=>` query. The app code is structured so this is an isolated change
in `lib/retrieval.ts`.

---

## 🔐 Environment variables

See [`.env.example`](./.env.example) for the full annotated list. Summary:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `UPLOADS_DIR` | – | Where uploaded files are stored (default: `uploads/` in the project root) |
| `ANTHROPIC_API_KEY` | – | Enables Claude answer generation |
| `CHAT_MODEL` | – | Chat model (default `claude-opus-4-8`) |
| `EMBEDDING_MODEL` | – | Local embedding model (default `Xenova/all-MiniLM-L6-v2`) |
| `NEXT_PUBLIC_SITE_URL` | – | Public base URL for social images |

The **Settings** page (`/settings`) runs a live health check and tells you exactly
which variables are missing.

---

## 🐳 Run with Docker

The included `docker-compose.yml` spins up the app **plus PostgreSQL** so you can
run the whole stack locally with one command:

```bash
docker compose up --build
```

Then open the app at <http://localhost:3000>. Uploaded files persist on the
`uploads_data` volume; the database on `db_data`.

To build just the app image:

```bash
docker build -t uforia .
docker run -p 3000:3000 --env-file .env uforia
```

---

## ☁️ Deployment

### Vercel

1. Push this project to a Git repository and import it into Vercel.
2. Add the environment variables from `.env.example` in the Vercel dashboard.
3. Provision a Postgres database (e.g. Vercel Postgres, Neon, Supabase) and set
   `DATABASE_URL` accordingly. Note that file storage is on the local disk, so a
   host with a persistent filesystem is required (serverless filesystems are
   ephemeral — see the note below).
4. Set the build command to `prisma generate && next build`.

> Note: image OCR and local embeddings load native/WASM models. For consistently
> low latency and to avoid serverless cold-start limits, a long-running Node host
> (Docker, Render, Railway, Fly.io, a VM) is recommended over pure serverless.

### Any Node host (Docker / Render / Railway / Fly.io / VM)

```bash
yarn install
yarn prisma generate && yarn prisma db push
yarn build
yarn start
```

---

## 📁 Project structure

```
.
├── app/
│   ├── api/
│   │   ├── chat/route.ts                 # RAG: retrieve + answer
│   │   ├── documents/route.ts            # list documents
│   │   ├── documents/upload/route.ts     # upload + kick off processing
│   │   ├── documents/[id]/route.ts       # get status / delete
│   │   ├── documents/[id]/reprocess/...  # retry processing
│   │   └── health/route.ts               # config/health check
│   ├── upload/page.tsx                   # drag-and-drop upload
│   ├── documents/page.tsx                # library / management
│   ├── chat/page.tsx                     # chat interface
│   ├── settings/page.tsx                 # settings & status
│   ├── layout.tsx                        # shell, navbar, footer, starfield
│   └── page.tsx                          # landing page
├── components/                           # UI components (logo, navbar, chat, etc.)
├── hooks/use-documents.ts                # documents data + polling
├── lib/
│   ├── db.ts            # Prisma client
│   ├── env.ts           # env validation
│   ├── storage.ts       # local file storage helpers
│   ├── pdf.ts           # PDF text extraction
│   ├── ocr.ts           # image OCR
│   ├── embeddings.ts    # local embeddings + chunking + cosine similarity
│   ├── retrieval.ts     # semantic search
│   ├── llm.ts           # answer generation + extractive fallback
│   └── process.ts       # full ingestion pipeline
├── prisma/schema.prisma # Document, DocumentChunk, ChatMessage
├── public/              # logo, favicon, OG image
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## 🧩 Supported file types

- **PDF** (`application/pdf`) — text extracted directly.
- **Images** (`image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/bmp`,
  `image/tiff`) — text extracted via OCR.

> Scanned/image-only PDFs may yield little text. Upload the pages as images so OCR can run.

---

## 📝 License

MIT — use it, fork it, explore the unknown. 🛸
