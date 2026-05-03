# TutorBridge 🎓

**TutorBridge** is a secure, role-based, peer-to-peer educational platform designed to connect volunteer tutors with students from orphanages. It aims to bridge the educational gap by providing a safe, interactive, and AI-enhanced learning environment.

## ✨ Key Features

- **Role-Based Access Control:** Distinct portals for Students, Volunteer Tutors, and Education Coordinators.
- **AI Study Buddy (RAG):** Context-aware AI chatbot that answers questions based on specific course materials using OpenAI and Pinecone vector search.
- **Live Sessions:** Built-in Zoom integration for seamless video classroom creation.
- **Safeguarding & Security:** Comprehensive reporting system, profanity filtering, admin approvals for tutors, and secure messaging.
- **Course Management:** Tutors can create classes, quizzes, and assignments. Students can track their progress, view grades, and earn certificates.
- **Peer Help Board:** Students who excel in topics can volunteer to assist their peers.

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS, ShadCN UI, Framer Motion, TanStack Query.
- **Backend:** Node.js, Express.js, TypeScript.
- **Database:** PostgreSQL, Drizzle ORM.
- **AI & Integrations:** OpenAI GPT-4o, Pinecone, Zoom Server-to-Server OAuth.
- **Testing:** Vitest (Unit/API tests), Playwright (End-to-End browser tests).

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v20+)
- **PostgreSQL** (v14+)
- **Git**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nimra5151/2526-6500SEPA-1098956.git
   cd 2526-6500SEPA-1098956
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup the Database:**
   Create a PostgreSQL database named `tutorbridge`.

4. **Environment Variables:**
   Create a `.env` file in the root directory and add the following:
   ```env
   DATABASE_URL=postgresql://<user>:<password>@localhost:5432/tutorbridge
   SESSION_SECRET=your_super_secret_64_character_string
   APP_URL=http://localhost:5001
   PORT=5001
   NODE_ENV=development
   
   # Optional Integrations:
   # OPENAI_API_KEY=
   # PINECONE_API_KEY=
   # PINECONE_INDEX=
   # ZOOM_ACCOUNT_ID=
   # SMTP_HOST=
   ```

5. **Push the Database Schema:**
   ```bash
   npm run db:push
   ```

6. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The application will be running at `http://localhost:5001`.

## 🧪 Testing

TutorBridge includes a comprehensive test suite to ensure platform stability and security.

- **Unit & Security Tests:** `npm run test:unit`
- **Full API/Backend Tests:** `npm test` (Ensure the dev server is running)
- **E2E Browser Tests:** 
  ```bash
  npx playwright install chromium
  npm run test:e2e
  ```

## 📂 Project Structure

- `/client` - React frontend application
- `/server` - Express backend API, WebSocket, and RAG pipelines
- `/shared` - Database schema and Zod validation types
- `/tests` - Vitest testing suites
- `/e2e` - Playwright browser tests
- `/wireframes` - UI/UX mid-fidelity design prototypes

---
*Developed as a Final Year Project — May 2026*
