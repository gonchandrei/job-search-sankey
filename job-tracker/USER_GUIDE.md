# Job Application Tracker - User Guide

Welcome to the Job Application Tracker! This guide will help you get started and make the most of the application.

## Getting Started

### Starting the Application

1. Open a terminal/command prompt
2. Navigate to the job-tracker folder
3. Run: `./run.sh` (on Mac/Linux) or `bash run.sh` (on Windows with Git Bash)
4. Open your web browser and go to: http://localhost:3000

The application will start with sample data already loaded.

## Main Features

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

### Importing Your Data

**Preparing Your CSV File:**

Option 1 - Simple Format:
```
Stage,Company,Position,Link,Date
Applied,Google,Software Engineer,https://careers.google.com,2025-01-15
Phone Interview,Amazon,Data Scientist,https://amazon.jobs,2025-01-20
```

Option 2 - Detailed Format (Recommended):
```
Company,Position,Link,Applied,Phone Interview,Technical Interview,Offer
Google,Software Engineer,https://careers.google.com,2025-01-15,2025-01-20,2025-01-25,
Amazon,Data Scientist,https://amazon.jobs,2025-01-10,2025-01-15,,
```

**How to Import:**
1. Click "Import CSV"
2. Select your CSV file
3. Data will be added to the current project

### Exporting Your Data

1. Click "Export CSV"
2. File will download with all your application data
3. Use this for backup or analysis in Excel/Google Sheets

## Tips and Best Practices

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

### Organization Tips

1. **Use Clear Position Names**: Include level (Senior, Junior, etc.)
2. **Add Links**: Always include the job posting link for reference
3. **Update Regularly**: Add dates as soon as you complete a stage
4. **Multiple Projects**: Create separate projects for different job search types

## Keyboard Shortcuts

- **Tab**: Move to next cell
- **Enter**: Save current cell and move down
- **Escape**: Cancel editing

## Troubleshooting

**Application Won't Start:**
- Make sure you have Python 3 and Node.js installed
- Try running `python3 --version` and `node --version`

**Can't Save Changes:**
- Check that the backend is running (terminal should show Flask output)
- Refresh the page and try again

**Import Not Working:**
- Verify CSV format matches examples above
- Check date format (use YYYY-MM-DD)
- Make sure column headers match exactly

**Page is Slow:**
- Try using Chrome or Firefox for best performance
- Close other browser tabs
- Restart the application

## Need More Help?

- Check the main README.md for technical details
- Look at example CSV files in the project folder
- Report issues on the project repository