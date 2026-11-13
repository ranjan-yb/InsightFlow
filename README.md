# InsightFlow – Dynamic CSV Analytics Platform

<p align="center">
  <strong>Upload. Clean. Analyze. Visualize. Export.</strong>
</p>

<p align="center">
  A full-stack data analytics platform that transforms raw CSV datasets into meaningful insights through data cleaning, statistical analysis, interactive visualizations, and downloadable reports.
</p>

---

## Overview

**InsightFlow** is a full-stack data analytics web application built to simplify the process of working with CSV datasets.

Users can upload CSV files, inspect data quality, clean missing values and duplicate records, perform statistical analysis, generate interactive charts, and export analytical reports in Excel and PDF formats.

The application combines Python-based data processing with a modern React dashboard to provide an integrated data analytics workflow.

## Features

### 1. Authentication and Security
- User registration and login.
- JWT-based authentication.
- Secure password hashing using Argon2.
- Protected API endpoints.
- User-specific dataset access.

### 2. CSV Dataset Management
- Upload CSV files with a 10 MB size limit.
- CSV file validation.
- Unique filenames for uploaded datasets.
- Dataset listing and metadata management.
- Tabular dataset preview.

### 3. Data Quality Analysis
- Missing-value detection and analysis.
- Exact duplicate and business duplicate detection.
- Numeric, categorical, datetime, and boolean column identification.
- Statistical summaries.
- Mean, median, minimum, maximum, and standard deviation.
- IQR-based outlier detection.
- Unique-value and category analysis.

### 4. Data Cleaning
- Handle missing numerical values using mean, median, zero, or row removal.
- Handle categorical missing values using mode, unknown values, or row removal.
- Configure datetime missing-value handling.
- Remove exact or business-level duplicates.
- Normalize column names.
- Handle outliers by keeping, removing, or capping them.
- Cleaning history and cleaning reports.
- Download cleaned CSV files without overwriting original datasets.

### 5. Dynamic Analytics Dashboard
- Dynamic KPI cards.
- Dataset overview and numerical statistics.
- Group-by analysis.
- Aggregations: SUM, MEAN, COUNT, MIN, and MAX.
- Column-based dataset filtering.
- Interactive bar charts.
- Interactive line charts.
- Interactive pie charts.

### 6. Report Generation
- Export analytical reports to Excel.
- Export professional PDF reports.
- Excel workbook includes dataset summary, column profiles, numerical statistics, and dataset records.
- Download reports for selected datasets.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| API Communication | Axios |
| Server State | TanStack Query |
| Backend | Python, FastAPI |
| Data Processing | Pandas, NumPy |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Database Migrations | Alembic |
| Authentication | JWT, Argon2 |
| Excel Reports | OpenPyXL |
| PDF Reports | ReportLab |

---

## Application Architecture

InsightFlow follows a frontend-backend architecture.

```text
                 USER
                   |
                   v
          REACT FRONTEND
          React + Tailwind
          TanStack Query
          Recharts
                   |
                   | HTTP / REST API
                   v
            FASTAPI BACKEND
                   |
          +--------+---------+
          |                  |
          v                  v
    DATA PROCESSING       AUTHENTICATION
    Pandas + NumPy        JWT + Argon2
          |                  |
          v                  v
    CSV FILE STORAGE    POSTGRESQL DATABASE
          |
          v
    ANALYTICS & CLEANING
          |
          v
    EXCEL / PDF EXPORT
```

### Data Storage Design

- **PostgreSQL:** Stores user accounts, dataset metadata, and cleaning reports.
- **Filesystem:** Stores original CSV files and separately generated cleaned CSV files.
- **Backend services:** Handle CSV processing, cleaning, statistical analysis, and report generation.

The original uploaded dataset is preserved when cleaning operations are performed.

---

## How It Works

1. **Register or Login:** Users authenticate using their account credentials.
2. **Upload Dataset:** Users upload a CSV file through the React interface.
3. **Inspect Dataset:** The backend reads the file using Pandas and generates a preview and data quality report.
4. **Clean Data:** Users configure missing-value handling, duplicate removal, column normalization, and outlier handling.
5. **Analyze Data:** Users calculate KPIs, perform group-by operations, filter records, and generate charts.
6. **Visualize Insights:** The React dashboard displays analytical results through interactive charts, tables, and KPI cards.
7. **Export Reports:** Users download Excel and PDF reports.

---

## Project Structure

```text
InsightFlow/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       └── router.py
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── utils/
│   │   └── main.py
│   ├── uploads/
│   ├── reports/
│   ├── requirements.txt
│   └── alembic.ini
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── routes/
│   │   └── services/
│   ├── package.json
│   └── vite.config.js
│
├── screenshots/
├── .gitignore
├── README.md
└── PROJECT_DOCUMENTATION.md
```

---

## Getting Started

### Prerequisites

Make sure you have installed:

- Python 3.10+
- Node.js and npm
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/InsightFlow.git

cd InsightFlow
```

### 2. Backend Setup

```bash
cd backend

python -m venv venv
```

Activate the virtual environment:

**Windows:**
```bash
venv\Scripts\activate
```

**Linux / macOS:**
```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file using the project's `.env.example` as a reference.

Configure your PostgreSQL database and the required application settings.

Run database migrations:

```bash
alembic upgrade head
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

Backend API:

```text
http://127.0.0.1:8000
```

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend

npm install
```

Create a `.env` file:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Start the frontend:

```bash
npm run dev
```

Open the local development URL shown by Vite in your browser.

---

## API Modules

| Module | Responsibility |
|---|---|
| Authentication | Registration, login, current user |
| Dataset Management | Upload, list, preview, download |
| Data Quality | Missing values, duplicates, statistics, outliers |
| Data Cleaning | Cleaning configuration and history |
| Analytics | KPIs, group-by, filtering, charts |
| Export | Excel and PDF report generation |

---

## Future Improvements

Potential future enhancements include:

- Advanced filtering with multiple logical operators.
- Additional visualization types.
- Large dataset processing optimization.
- Scheduled report generation.
- Cloud-based dataset storage.
- Deployed public demo.

---

## What I Learned

Building InsightFlow helped me gain practical experience in:

- Building REST APIs using FastAPI.
- Processing real-world datasets using Pandas and NumPy.
- Designing relational databases with PostgreSQL and SQLAlchemy.
- Implementing JWT authentication.
- Building interactive dashboards using React and Recharts.
- Handling CSV uploads and filesystem storage.
- Implementing data cleaning and statistical analysis workflows.
- Generating Excel and PDF reports.
- Integrating frontend and backend services into a complete application.

---

## Author

**Ranjan Oraon**

Full-Stack Developer | Aspiring Data Analyst

- GitHub: https://github.com/ranjan-yb
- LinkedIn: https://www.linkedin.com/in/ranjan-oraon-8a1a0b37b/

---

<p align="center">
  Built with Python, FastAPI, React, and a passion for data analytics.
</p>