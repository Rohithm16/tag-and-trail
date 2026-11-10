# Tag & Trail

Tag & Trail is a document and link analysis platform. Submit a URL or a PDF and it runs a security scan (malicious link/file detection), extracts metadata, and generates descriptive tags automatically — then indexes everything so you can search and manage what you've scanned.

## Features

- **URL & PDF scanning** — checks submissions for malicious content before indexing them
- **Automatic tagging** — an NLP pipeline (spaCy + sentence-transformers) generates relevant tags from content
- **Dashboard** — search and filter indexed items by type, tag, or risk status
- **Trash** — soft-delete with recovery, plus permanent deletion
- **Guest mode** — try URL scanning with no account, results are session-only and never saved server-side
- **JWT-based auth** — signup/login with your own account for persistent storage

## Tech Stack

**Backend:** FastAPI, SQLAlchemy, PostgreSQL, spaCy, sentence-transformers, scikit-learn
**Frontend:** React, TypeScript, Vite, Radix UI

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL

### Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

Create a `.env` file in `backend/`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/tag_and_trail
JWT_SECRET_KEY=your-secret-key-here
VT_API_KEY=your-virustotal-api-key
```

Run the API:

```bash
uvicorn app.main:app --reload
```

The backend runs at `http://localhost:8000`.

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

## Project Structure

```
tag-and-trail/
├── backend/
│   └── app/
│       ├── api/routes/     # auth, documents, health endpoints
│       ├── core/           # config, security, URL safety checks
│       ├── database/       # SQLAlchemy engine & session
│       ├── engine/         # tag generation pipeline
│       ├── external/       # VirusTotal + ML model integration
│       ├── models/         # SQLAlchemy models + ML models
│       ├── processing/     # metadata & content extraction
│       ├── repositories/   # DB access layer
│       ├── schemas/        # Pydantic request/response models
│       └── services/       # pipeline orchestration
└── frontend/
    └── src/
        ├── api/            # backend client
        ├── components/     # auth, home, layout components
        ├── context/        # auth state/provider
        ├── pages/          # Dashboard, Upload, Trash, Settings
        └── routes/         # route guards
```

