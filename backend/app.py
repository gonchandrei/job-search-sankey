from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
import pandas as pd
from io import StringIO, BytesIO

app = Flask(__name__)
CORS(app)

# Database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "job_tracker.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Models
class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    companies = db.relationship('Company', backref='project', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'company_count': len(self.companies)
        }

class Company(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    position = db.Column(db.String(200), nullable=False)
    link = db.Column(db.String(500))
    stages = db.relationship('Stage', backref='company', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'name': self.name,
            'position': self.position,
            'link': self.link,
            'stages': [stage.to_dict() for stage in self.stages]
        }

class Stage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=False)
    stage_name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.Date)
    description = db.Column(db.Text)
    order = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'company_id': self.company_id,
            'stage_name': self.stage_name,
            'date': self.date.isoformat() if self.date else None,
            'description': self.description,
            'order': self.order
        }

# Create tables
with app.app_context():
    db.create_all()

# Routes for Projects
@app.route('/api/projects', methods=['GET', 'POST'])
def handle_projects():
    if request.method == 'GET':
        projects = Project.query.all()
        return jsonify([p.to_dict() for p in projects])
    
    elif request.method == 'POST':
        data = request.json
        project = Project(name=data['name'])
        db.session.add(project)
        db.session.commit()
        return jsonify(project.to_dict()), 201

@app.route('/api/projects/<int:project_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_project(project_id):
    project = Project.query.get_or_404(project_id)
    
    if request.method == 'GET':
        return jsonify(project.to_dict())
    
    elif request.method == 'PUT':
        data = request.json
        project.name = data.get('name', project.name)
        db.session.commit()
        return jsonify(project.to_dict())
    
    elif request.method == 'DELETE':
        db.session.delete(project)
        db.session.commit()
        return '', 204

# Routes for Companies
@app.route('/api/projects/<int:project_id>/companies', methods=['GET', 'POST'])
def handle_companies(project_id):
    if request.method == 'GET':
        companies = Company.query.filter_by(project_id=project_id).all()
        return jsonify([c.to_dict() for c in companies])
    
    elif request.method == 'POST':
        data = request.json
        company = Company(
            project_id=project_id,
            name=data['name'],
            position=data['position'],
            link=data.get('link')
        )
        db.session.add(company)
        db.session.commit()
        return jsonify(company.to_dict()), 201

@app.route('/api/companies/<int:company_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_company(company_id):
    company = Company.query.get_or_404(company_id)
    
    if request.method == 'GET':
        return jsonify(company.to_dict())
    
    elif request.method == 'PUT':
        data = request.json
        company.name = data.get('name', company.name)
        company.position = data.get('position', company.position)
        company.link = data.get('link', company.link)
        db.session.commit()
        return jsonify(company.to_dict())
    
    elif request.method == 'DELETE':
        db.session.delete(company)
        db.session.commit()
        return '', 204

# Routes for Stages
@app.route('/api/companies/<int:company_id>/stages', methods=['GET', 'POST'])
def handle_stages(company_id):
    if request.method == 'GET':
        stages = Stage.query.filter_by(company_id=company_id).order_by(Stage.order).all()
        return jsonify([s.to_dict() for s in stages])
    
    elif request.method == 'POST':
        data = request.json
        stage = Stage(
            company_id=company_id,
            stage_name=data['stage_name'],
            date=datetime.fromisoformat(data['date']) if data.get('date') else None,
            description=data.get('description'),
            order=data.get('order', 0)
        )
        db.session.add(stage)
        db.session.commit()
        return jsonify(stage.to_dict()), 201

@app.route('/api/stages/<int:stage_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_stage(stage_id):
    stage = Stage.query.get_or_404(stage_id)
    
    if request.method == 'GET':
        return jsonify(stage.to_dict())
    
    elif request.method == 'PUT':
        data = request.json
        stage.stage_name = data.get('stage_name', stage.stage_name)
        if 'date' in data:
            stage.date = datetime.fromisoformat(data['date']) if data['date'] else None
        stage.description = data.get('description', stage.description)
        stage.order = data.get('order', stage.order)
        db.session.commit()
        return jsonify(stage.to_dict())
    
    elif request.method == 'DELETE':
        db.session.delete(stage)
        db.session.commit()
        return '', 204

# Import/Export routes
@app.route('/api/projects/<int:project_id>/import', methods=['POST'])
def import_csv(project_id):
    project = Project.query.get_or_404(project_id)
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        # Read CSV
        content = file.read().decode('utf-8')
        df = pd.read_csv(StringIO(content))
        
        # Process each row
        for _, row in df.iterrows():
            # Create company
            company = Company(
                project_id=project_id,
                name=row.get('Company', ''),
                position=row.get('Position', ''),
                link=row.get('Link', '')
            )
            db.session.add(company)
            db.session.flush()
            
            # Handle stages
            stage_columns = [col for col in df.columns if col not in ['Company', 'Position', 'Link']]
            
            # Check if it's a single stage format (like example_import.csv)
            if 'Stage' in df.columns and 'Date' in df.columns:
                # Single stage format
                stage = Stage(
                    company_id=company.id,
                    stage_name=row.get('Stage', ''),
                    date=pd.to_datetime(row.get('Date'), errors='coerce').date() if pd.notna(row.get('Date')) else None,
                    order=0
                )
                db.session.add(stage)
            else:
                # Multi-stage format
                order = 0
                for col in stage_columns:
                    if pd.notna(row[col]):
                        # Parse date from the cell value
                        try:
                            date = pd.to_datetime(row[col], errors='coerce').date()
                        except:
                            date = None
                        
                        stage = Stage(
                            company_id=company.id,
                            stage_name=col,
                            date=date,
                            order=order
                        )
                        db.session.add(stage)
                        order += 1
        
        db.session.commit()
        return jsonify({'message': 'Import successful', 'project_id': project_id}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/api/projects/<int:project_id>/export', methods=['GET'])
def export_csv(project_id):
    project = Project.query.get_or_404(project_id)
    companies = Company.query.filter_by(project_id=project_id).all()
    
    # Prepare data for export
    data = []
    for company in companies:
        row = {
            'Company': company.name,
            'Position': company.position,
            'Link': company.link
        }
        
        # Add stages
        for stage in sorted(company.stages, key=lambda s: s.order):
            row[stage.stage_name] = stage.date.isoformat() if stage.date else ''
        
        data.append(row)
    
    # Create DataFrame
    df = pd.DataFrame(data)
    
    # Export to CSV
    output = BytesIO()
    df.to_csv(output, index=False, encoding='utf-8')
    output.seek(0)
    
    return send_file(
        output,
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'{project.name}_export.csv'
    )

if __name__ == '__main__':
    app.run(debug=True, port=5000)