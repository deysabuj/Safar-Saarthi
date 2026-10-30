# Safar Saarthi — Development Setup Guide

## Prerequisites
Ensure the following tools are installed on your machine:
- **Node.js**: `v20.x` or higher (verified on `v24.x`)
- **npm**: `v10.x` or higher (verified on `v11.x`)
- **Python**: `3.11` or higher (verified on `3.13`)
- **Docker & Docker Compose**: Optional for PostgreSQL & Redis containers

---

## 1. Clone & Workspace Setup

```bash
git clone <repository-url>
cd safar-saarthi
```

Install root and workspace dependencies:

```bash
npm install
```

---

## 2. Infrastructure Setup (PostgreSQL & Redis)

Start PostgreSQL and Redis with Docker Compose:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Verify containers are running:

```bash
docker compose -f infra/docker-compose.yml ps
```

---

## 3. Backend Setup (Node.js + Express + Prisma)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```

3. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

4. Start the backend development server:
   ```bash
   npm run dev
   ```

The backend starts on `http://localhost:5000`.
Health endpoint: `http://localhost:5000/api/health`

---

## 4. AI Service Setup (Python + FastAPI)

1. Open a new terminal and navigate to the AI service directory:
   ```bash
   cd ai-service
   ```

2. Create and activate a Python virtual environment:
   - **Windows**:
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

5. Start the FastAPI service:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

The AI service starts on `http://localhost:8000`.
Health endpoint: `http://localhost:8000/health`
Interactive Swagger Docs: `http://localhost:8000/docs`

---

## 5. Frontend Setup (React + Vite + Tailwind)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

Open your browser at `http://localhost:5173`.

---

## 6. Running Tests & Verifications

- **Backend Tests**:
  ```bash
  npm run test --workspace=backend
  ```

- **AI Service Tests**:
  ```bash
  cd ai-service
  pytest
  ```

- **TypeScript Typechecking**:
  ```bash
  npm run typecheck
  ```

- **Frontend Production Build**:
  ```bash
  npm run build --workspace=frontend
  ```
