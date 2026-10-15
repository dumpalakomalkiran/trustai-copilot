# TrustAI Copilot — MVP scaffold

A hackathon prototype for explainable payment-risk investigations. This starter uses synthetic demo transactions only; it does not connect to PayPal or an AI provider yet.

## Requirements
- Python 3.10+
- Node.js 20+
- npm

## 1. Start the API
```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API: http://127.0.0.1:8000  
Swagger docs: http://127.0.0.1:8000/docs

## 2. Start the frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open the local URL printed by Vite.

## Current functionality
- Merchant transaction dashboard
- Transparent, rule-based risk indicators
- Risk evidence and recommended review steps
- API health endpoint

## Next milestones
1. Persist transactions and review decisions in SQLite.
2. Add an LLM adapter that only explains supplied evidence.
3. Add PayPal sandbox order creation/capture and server-side verification.
4. Add authentication, tests, deployment, and demo documentation.

## Safety and demo accuracy
All current transactions are synthetic. Risk labels are prototype heuristics, not PayPal fraud scores and not production fraud detection. Do not enter real payment data or secrets. Never trust a browser-provided amount or treat an AI recommendation as authorization to capture/refund a payment.
