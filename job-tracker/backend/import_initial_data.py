import os
import sys
import pandas as pd
from datetime import datetime
from app import app, db, Project, Company, Stage

def import_initial_data():
    """Import example_import.csv as the first project"""
    with app.app_context():
        # Check if we already have data
        if Project.query.count() > 0:
            print("Database already contains data. Skipping initial import.")
            return
        
        # Create first project
        project = Project(name="Job Applications 2025")
        db.session.add(project)
        db.session.commit()
        
        # Read the CSV file
        csv_path = os.path.join(os.path.dirname(__file__), '..', '..', 'example_import.csv')
        df = pd.read_csv(csv_path)
        
        # Import each row
        for _, row in df.iterrows():
            # Create company
            company = Company(
                project_id=project.id,
                name=row['Company'],
                position=row['Position'],
                link=row['Link'] if pd.notna(row['Link']) else None
            )
            db.session.add(company)
            db.session.flush()
            
            # Create stage (using the Stage column as the final stage)
            try:
                date = pd.to_datetime(row['Date'], format='%B %d, %Y').date()
            except:
                date = None
            
            stage = Stage(
                company_id=company.id,
                stage_name=row['Stage'],
                date=date,
                order=0  # Single stage, so order is 0
            )
            db.session.add(stage)
        
        db.session.commit()
        print(f"Successfully imported {len(df)} companies into project '{project.name}'")

if __name__ == '__main__':
    import_initial_data()