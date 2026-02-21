# FoodEnough

A calorie and macro tracker that works the way you actually think about food. Describe what you ate — "chicken rice and broccoli" — and it handles the rest. No scrolling through databases or scanning every barcode.

Built with FastAPI and Next.js. Uses GPT-4o-mini to parse natural language and photos into structured nutrition data.

---

## Stack

- **Backend** — Python, FastAPI, SQLAlchemy, SQLite (Postgres-ready)
- **Frontend** — Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **AI** — OpenAI GPT-4o-mini for text and image-based food recognition
- **Auth** — JWT with bcrypt password hashing
- **Deployment** — Render (backend), Vercel (frontend)

---

## Features

- **Text logging** — describe a meal in plain English, get calories and macros back
- **Photo logging** — take a picture of your plate, get the same result
- **Barcode scanning** — scan packaged food via camera, pulls data from Open Food Facts
- **Manual entry** — enter exact nutrition values yourself
- **Health profile** — set age, weight, height, activity level, and goal type
- **Science-based goals** — auto-calculated calorie/macro targets using the Mifflin-St Jeor equation
- **Progress tracking** — visual progress bars for daily calorie, protein, carb, and fat goals
- **Weekly diary** — view logs by day with a calorie trend chart
- **Workout plans** — AI-generated 6-week plans based on your fitness profile
- **Weight tracking** — log weight over time with a history chart
- **CSV export** — download all your food logs
- **Password reset** — email-based reset flow

---

## Running Locally

### Backend

```bash
cd Backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Runs at `http://127.0.0.1:8000`. API docs at `/docs`.

Create a `Backend/.env`:

```
OPENAI_API_KEY=your-key
DATABASE_URL=sqlite:///./foodenough.db
JWT_SECRET_KEY=your-secret
CORS_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

Runs at `http://localhost:3000`.

Create `Frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

When deployed, the frontend falls back to the Render backend URL if this env var is not set.

---

## Tests

```bash
cd Backend
pytest test_main.py -v
```

---

## Deployment

- **Backend** is deployed on [Render](https://render.com) as a web service
- **Frontend** is deployed on [Vercel](https://vercel.com) via GitHub auto-deploy

Environment variables to set on Render: `OPENAI_API_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS`, `FRONTEND_URL`

Environment variable for Vercel (optional): `NEXT_PUBLIC_API_URL` — defaults to the Render backend if not set.

---

## Author

Luke Vaughan — [lukesheridanray@gmail.com](mailto:lukesheridanray@gmail.com) · [LinkedIn](https://linkedin.com/in/lukesheridanray/?skipRedirect=true)
