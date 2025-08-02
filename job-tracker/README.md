# Job Application Tracker

A modern web application for tracking job applications with interactive visualization features.

## Features

- **Multi-Project Support**: Manage multiple job search projects simultaneously
- **Interactive Table View**: Edit application details directly in the table with auto-save
- **Sankey Diagram Visualization**: Visualize your application flow and progression
- **CSV Import/Export**: Import existing data and export for backup or analysis
- **Stage Tracking**: Track applications through various stages (Applied, Screening, Interview, etc.)
- **Color-Coded Stages**: Visual distinction between different application stages
- **Automatic Data Persistence**: All changes are saved automatically to a local database

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd job-tracker
   ```

2. **Run the application**
   ```bash
   ./run.sh
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

The application will automatically:
- Create a virtual environment
- Install all dependencies
- Import initial example data
- Start both backend and frontend servers

## Usage Guide

### Projects

- **Create Project**: Click "New Project" and enter a name
- **Switch Projects**: Use the dropdown to switch between projects
- **Delete Project**: Select a project and click "Delete Project"

### Managing Applications

#### Table View
- **Add Company**: Click "Add Company" to create a new entry
- **Edit Details**: Click on any cell to edit directly
- **Add Stages**: Enter dates in stage columns to track progression
- **Delete Companies**: Select rows and click "Delete Selected"

#### Stage Tracking
Common stages include:
- Applied
- Screening
- Phone Interview
- Technical Interview
- Onsite Interview
- Final Interview
- Offer
- Rejected
- Withdrawn
- No Answer

### Importing Data

The application supports two CSV formats:

#### Format 1: Single Stage (like example_import.csv)
```csv
Stage,Company,Position,Link,Date
Offer,CompanyA,Software Engineer,https://example.com,July 29 2025
Rejected,CompanyB,Data Scientist,https://example.com,July 28 2025
```

#### Format 2: Multiple Stages (recommended)
```csv
Company,Position,Link,Applied,Phone Interview,Technical Interview,Offer,Rejected
CompanyA,Software Engineer,https://example.com,2025-01-05,2025-01-10,2025-01-15,2025-01-20,
CompanyB,Data Scientist,https://example.com,2025-01-08,2025-01-12,,,2025-01-15
```

### Exporting Data

Click "Export CSV" to download your project data in the multi-stage format.

## Architecture

### Backend (Flask)
- RESTful API with Flask
- SQLite database for data persistence
- SQLAlchemy ORM for database operations
- Pandas for CSV processing

### Frontend (React)
- React with React Router for navigation
- AG-Grid for the interactive table
- Plotly.js for Sankey diagram visualization
- Axios for API communication
- Vite for fast development and building

### Database Schema
- **Projects**: id, name, created_at
- **Companies**: id, project_id, name, position, link
- **Stages**: id, company_id, stage_name, date, description, order

## Development

### Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Running Tests
```bash
# Backend tests
cd backend
python -m pytest tests/

# Frontend tests
cd frontend
npm test
```

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Companies
- `GET /api/projects/:id/companies` - List companies in project
- `POST /api/projects/:id/companies` - Add company to project
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

### Stages
- `GET /api/companies/:id/stages` - List stages for company
- `POST /api/companies/:id/stages` - Add stage to company
- `PUT /api/stages/:id` - Update stage
- `DELETE /api/stages/:id` - Delete stage

### Import/Export
- `POST /api/projects/:id/import` - Import CSV data
- `GET /api/projects/:id/export` - Export project as CSV

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Change ports in `backend/app.py` and `frontend/vite.config.js`

2. **Database errors**
   - Delete `backend/job_tracker.db` and restart the application

3. **Import errors**
   - Ensure CSV files are properly formatted
   - Check date formats (ISO format recommended: YYYY-MM-DD)

## License

MIT License - feel free to use this project for personal or commercial purposes.