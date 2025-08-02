import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

import pytest
import tempfile
from app import app, db, Project, Company, Stage

@pytest.fixture
def client():
    """Create a test client for the Flask app"""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client

def test_create_project(client):
    """Test creating a new project"""
    response = client.post('/api/projects', json={'name': 'Test Project'})
    assert response.status_code == 201
    data = response.get_json()
    assert data['name'] == 'Test Project'
    assert 'id' in data

def test_get_projects(client):
    """Test getting all projects"""
    # Create a project first
    client.post('/api/projects', json={'name': 'Test Project 1'})
    client.post('/api/projects', json={'name': 'Test Project 2'})
    
    response = client.get('/api/projects')
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 2

def test_create_company(client):
    """Test creating a company"""
    # Create a project first
    project_response = client.post('/api/projects', json={'name': 'Test Project'})
    project_id = project_response.get_json()['id']
    
    # Create a company
    company_data = {
        'name': 'Test Company',
        'position': 'Software Engineer',
        'link': 'https://example.com'
    }
    response = client.post(f'/api/projects/{project_id}/companies', json=company_data)
    assert response.status_code == 201
    data = response.get_json()
    assert data['name'] == 'Test Company'
    assert data['position'] == 'Software Engineer'

def test_create_stage(client):
    """Test creating a stage"""
    # Create project and company first
    project_response = client.post('/api/projects', json={'name': 'Test Project'})
    project_id = project_response.get_json()['id']
    
    company_response = client.post(f'/api/projects/{project_id}/companies', 
                                 json={'name': 'Test Company', 'position': 'Engineer'})
    company_id = company_response.get_json()['id']
    
    # Create a stage
    stage_data = {
        'stage_name': 'Applied',
        'date': '2025-01-15',
        'description': 'Applied online'
    }
    response = client.post(f'/api/companies/{company_id}/stages', json=stage_data)
    assert response.status_code == 201
    data = response.get_json()
    assert data['stage_name'] == 'Applied'

def test_update_project(client):
    """Test updating a project"""
    # Create a project
    project_response = client.post('/api/projects', json={'name': 'Original Name'})
    project_id = project_response.get_json()['id']
    
    # Update the project
    response = client.put(f'/api/projects/{project_id}', json={'name': 'Updated Name'})
    assert response.status_code == 200
    data = response.get_json()
    assert data['name'] == 'Updated Name'

def test_delete_project(client):
    """Test deleting a project"""
    # Create a project
    project_response = client.post('/api/projects', json={'name': 'To Delete'})
    project_id = project_response.get_json()['id']
    
    # Delete the project
    response = client.delete(f'/api/projects/{project_id}')
    assert response.status_code == 204
    
    # Verify it's deleted
    response = client.get(f'/api/projects/{project_id}')
    assert response.status_code == 404

def test_import_csv_single_stage(client):
    """Test importing CSV with single stage format"""
    # Create a project
    project_response = client.post('/api/projects', json={'name': 'Import Test'})
    project_id = project_response.get_json()['id']
    
    # Create CSV content
    csv_content = """Stage,Company,Position,Link,Date
Applied,TestCo,Engineer,https://test.com,2025-01-15
Rejected,OtherCo,Developer,https://other.com,2025-01-20"""
    
    # Create a file-like object
    data = {
        'file': (csv_content.encode(), 'test.csv')
    }
    
    response = client.post(f'/api/projects/{project_id}/import', 
                         data=data, content_type='multipart/form-data')
    assert response.status_code == 200
    
    # Verify companies were created
    companies_response = client.get(f'/api/projects/{project_id}/companies')
    companies = companies_response.get_json()
    assert len(companies) == 2

def test_export_csv(client):
    """Test exporting project data as CSV"""
    # Create project with data
    project_response = client.post('/api/projects', json={'name': 'Export Test'})
    project_id = project_response.get_json()['id']
    
    # Add a company
    company_response = client.post(f'/api/projects/{project_id}/companies',
                                 json={'name': 'ExportCo', 'position': 'Engineer'})
    company_id = company_response.get_json()['id']
    
    # Add a stage
    client.post(f'/api/companies/{company_id}/stages',
               json={'stage_name': 'Applied', 'date': '2025-01-15'})
    
    # Export
    response = client.get(f'/api/projects/{project_id}/export')
    assert response.status_code == 200
    assert response.content_type == 'text/csv; charset=utf-8'

if __name__ == '__main__':
    pytest.main([__file__])