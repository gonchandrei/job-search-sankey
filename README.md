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
   cd job-search-sankey
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

## User Guide

### Getting Started

The application will start with sample data already loaded. Here's how to use it:

### Project Management

**What are Projects?**
Projects help you organize different job searches. For example:
- "2025 Job Search"
- "Summer Internships"
- "Remote Positions"

**Managing Projects:**
- **Create**: Click "New Project" → Enter name → Click "Create"
- **Switch**: Use the dropdown menu to select a different project
- **Delete**: Select project → Click "Delete Project" → Confirm

### Table View

The table view is where you'll spend most of your time managing applications.

**Adding a New Application:**
1. Click "Add Company"
2. Edit the company name, position, and link by clicking on the cells
3. Add stage dates as your application progresses

**Editing Information:**
- Click on any cell to edit
- Press Enter or click outside to save
- Changes are saved automatically

**Tracking Stages:**
- Click on a stage column cell
- Enter the date (format: YYYY-MM-DD)
- The cell will be color-coded based on the stage

**Deleting Applications:**
1. Click the checkbox next to company names
2. Click "Delete Selected"
3. Confirm deletion

### Sankey Diagram

The Sankey diagram shows the flow of your applications through different stages.

**Understanding the Diagram:**
- Width of lines = number of applications
- Colors match the stage colors from the table
- Hover over nodes or connections for details

**Key Metrics:**
- Total Applications
- Active Applications (still in progress)
- Number of Offers

### Stage Progression

Track your applications through these common stages:
1. **Applied** - Initial application submitted
2. **Screening** - Resume review or initial screening
3. **Phone Interview** - Phone or video screening
4. **Technical Interview** - Technical assessment
5. **Onsite Interview** - In-person or virtual onsite
6. **Final Interview** - Final round with decision makers
7. **Offer** - Job offer received
8. **Rejected** - Application rejected
9. **Withdrawn** - You withdrew your application
10. **No Answer** - No response from company

### Color Coding

Each stage has a distinct color:
- 🔵 Applied (Blue)
- 🟣 Screening (Purple)
- 🟡 Phone Interview (Yellow)
- 🟠 Technical Interview (Orange)
- 🟢 Offer (Green)
- 🔴 Rejected (Red)
- ⚫ No Answer (Gray)

### Importing Data

The application supports CSV import with the following format (see example_import.csv):

```csv
Company,Position,Link,Applied,Screening,Phone Interview,Technical Interview,Onsite Interview,Final Interview,Offer,Rejected,Withdrawn,No Answer
TechCorp,Senior Software Engineer,https://techcorp.com/careers/sse-001,2025-01-05,2025-01-10,2025-01-15,2025-01-20,2025-01-25,,,,,
DataSoft,Machine Learning Engineer,https://datasoft.io/jobs/mle-2025,2025-01-08,2025-01-12,2025-01-18,2025-01-22,,,,,2025-01-26,
```

Each column after Company, Position, and Link represents a stage in your application process. Enter dates when you reach each stage.

**How to Import:**
1. Click "Import CSV"
2. Select your CSV file
3. Data will be added to the current project

### Exporting Data

1. Click "Export CSV"
2. File will download with all your application data
3. Use this for backup or analysis in Excel/Google Sheets

### Tips and Best Practices

1. **Use Clear Position Names**: Include level (Senior, Junior, etc.)
2. **Add Links**: Always include the job posting link for reference
3. **Update Regularly**: Add dates as soon as you complete a stage
4. **Multiple Projects**: Create separate projects for different job search types

### Keyboard Shortcuts

- **Tab**: Move to next cell
- **Enter**: Save current cell and move down
- **Escape**: Cancel editing

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
python -m pytest tests/

# Frontend tests (if implemented)
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

**Application Won't Start:**
- Make sure you have Python 3 and Node.js installed
- Try running `python3 --version` and `node --version`
- Change ports in `backend/app.py` and `frontend/vite.config.js` if already in use

**Can't Save Changes:**
- Check that the backend is running (terminal should show Flask output)
- Refresh the page and try again

**Database Errors:**
- Delete `backend/job_tracker.db` and restart the application

**Import Not Working:**
- Verify CSV format matches examples above
- Check date format (use YYYY-MM-DD)
- Make sure column headers match exactly

**Page is Slow:**
- Try using Chrome or Firefox for best performance
- Close other browser tabs
- Restart the application

## License

MIT License - feel free to use this project for personal or commercial purposes.