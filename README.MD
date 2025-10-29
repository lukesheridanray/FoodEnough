echo "# 🥦 FoodEnough

**AI-powered food logging and nutrition tracking app.**

FoodEnough combines a **FastAPI backend (Python + SQLite + OpenAI)** with a **Next.js + TypeScript frontend** to let users log food naturally by describing what they ate — no manual calorie counting or barcode scanning required.

---

## 🚀 Features

- 🧠 **AI-Powered Logging:** Uses OpenAI to extract calories, protein, carbs, and fat from text descriptions.
- 🧾 **Persistent Tracking:** Saves food logs locally via SQLite.
- 📊 **Macro Summaries:** Daily and weekly breakdowns of calories and macros.
- 📤 **Data Export:** Download logs as CSV for further analysis.
- 🌐 **Frontend UI:** Clean, responsive interface built with Next.js & Tailwind.

---

## 🧩 Project Structure

\`\`\`
FoodEnough/
├── backend/ # FastAPI backend (Python)
│ ├── main.py # API routes (log, save, export, etc.)
│ ├── db.py # Database setup
│ ├── requirements.txt # Backend dependencies
│ └── .env.example # Environment template
│
├── frontend/ # Next.js + TypeScript frontend
│ ├── app/ # Routes and pages (Diary, Export, etc.)
│ ├── components/ # UI components (Form, Chart, Navbar)
│ ├── styles/ # Global styles
│ ├── package.json # Frontend dependencies
│ └── tailwind.config.js # Tailwind setup
│
├── .gitignore
├── .env.example
└── README.md
\`\`\`

---

## 🧰 Local Setup

### 1️⃣ Clone the repository

\`\`\`bash
git clone https://github.com/<YOUR_USERNAME>/FoodEnough.git
cd FoodEnough
\`\`\`

### 2️⃣ Backend Setup (FastAPI)

\`\`\`bash
cd backend
python -m venv .venv
.venv\Scripts\activate # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
\`\`\`
Backend runs at **http://127.0.0.1:8000**

### 3️⃣ Frontend Setup (Next.js)

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`
Frontend runs at **http://localhost:3000**

---

## 🔐 Environment Variables

### Backend (.env)

\`\`\`
OPENAI_API_KEY=your-openai-key-here
DATABASE_URL=sqlite:///./backend/foodenough.db
\`\`\`

### Frontend (.env.local)

\`\`\`
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
\`\`\`

---

## 🧠 Example Usage

\`\`\`bash
curl -X POST http://127.0.0.1:8000/log -H \"Content-Type: application/json\" -d '{\"input_text\": \"2 eggs and toast with butter\"}'
\`\`\`
Response:
\`\`\`json
{
\"result\": {
\"total\": { \"calories\": 310, \"protein\": 16, \"carbs\": 20, \"fat\": 15 }
}
}
\`\`\`

---

## 📦 Export Logs

\`\`\`bash
GET /logs/export
\`\`\`
Exports a CSV file with your logged meals.

---

## 🧱 Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Backend  | FastAPI + SQLAlchemy                |
| Database | SQLite                              |
| AI       | OpenAI GPT                          |
| Frontend | Next.js 13 (App Router), TypeScript |
| Styling  | Tailwind CSS                        |

---

## 🧑‍💻 Author

**Luke Vaughan**  
Lead Data Scientist & Developer  
📧 lukesheridanray@gmail.com  
💼 [LinkedIn](https://www.linkedin.com/in/lukevaughan/)

---

## 🪶 License

Licensed under the MIT License — free to use, modify, and share.
" > README.md
