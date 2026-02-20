# FoodEnough

Log what you eat by just describing it. No calorie databases, no barcode hunting — type "chicken rice and broccoli" and it figures out the rest.

Built with FastAPI + Next.js. Uses GPT-4o-mini to parse food descriptions into macros.

---

## Stack

- **Backend** — FastAPI, SQLAlchemy, SQLite (Postgres-ready)
- **Frontend** — Next.js 15, TypeScript, Tailwind CSS
- **AI** — OpenAI GPT-4o-mini (text + photo logging)
- **Auth** — JWT, bcrypt

---

## Running locally

### Backend

```bash
cd Backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Runs at `http://127.0.0.1:8000`

Create a `Backend/.env`:

```
OPENAI_API_KEY=your-key
DATABASE_URL=sqlite:///./foodenough.db
JWT_SECRET_KEY=your-secret
CORS_ORIGINS=http://localhost:3000
```

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

Runs at `http://localhost:3000`

Optionally create `Frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

## Features

- Text logging — describe a meal, get macros back
- Photo logging — snap a picture, same result
- Barcode scanning — scans via camera, pulls from Open Food Facts
- Weekly diary with calorie chart
- 6-week AI-generated workout plans
- Weight tracking
- CSV export
- Password reset via email

---

## Tests

```bash
cd Backend
pytest test_main.py -v
```

---

## Author

Luke Vaughan — [lukesheridanray@gmail.com](mailto:lukesheridanray@gmail.com) · [LinkedIn](https://linkedin.com/in/lukesheridanray/)
