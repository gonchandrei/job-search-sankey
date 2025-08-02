import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { projectsAPI, importExportAPI } from '../utils/api';
import './ProjectSelector.css';

function ProjectSelector({ projects, currentProject, onProjectChange, onProjectsUpdate }) {
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const fileInputRef = useRef(null);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Project name is required');
      return;
    }

    try {
      const response = await projectsAPI.create({ name: newProjectName });
      toast.success('Project created successfully');
      setNewProjectName('');
      setShowNewProject(false);
      onProjectsUpdate();
      onProjectChange(response.data);
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  const handleDeleteProject = async () => {
    if (!currentProject) return;
    
    if (!window.confirm(`Are you sure you want to delete "${currentProject.name}"?`)) {
      return;
    }

    try {
      await projectsAPI.delete(currentProject.id);
      toast.success('Project deleted successfully');
      onProjectChange(null);
      onProjectsUpdate();
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file || !currentProject) return;

    try {
      await importExportAPI.import(currentProject.id, file);
      toast.success('Data imported successfully');
      window.location.reload(); // Reload to refresh the data
    } catch (error) {
      toast.error('Failed to import data');
    }
    
    event.target.value = ''; // Reset file input
  };

  const handleExport = async () => {
    if (!currentProject) return;

    try {
      const response = await importExportAPI.export(currentProject.id);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject.name}_export.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  return (
    <div className="project-selector">
      <div className="project-controls">
        <select
          value={currentProject?.id || ''}
          onChange={(e) => {
            const project = projects.find(p => p.id === parseInt(e.target.value));
            onProjectChange(project);
          }}
          className="project-dropdown"
        >
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name} ({project.company_count} companies)
            </option>
          ))}
        </select>
        
        <div className="project-actions">
          <button onClick={() => setShowNewProject(true)} className="btn btn-primary">
            New Project
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary">
            Import CSV
          </button>
          <button onClick={handleExport} className="btn btn-secondary" disabled={!currentProject}>
            Export CSV
          </button>
          <button onClick={handleDeleteProject} className="btn btn-danger" disabled={!currentProject}>
            Delete Project
          </button>
        </div>
      </div>

      {showNewProject && (
        <div className="new-project-form">
          <input
            type="text"
            placeholder="Project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
            autoFocus
          />
          <button onClick={handleCreateProject} className="btn btn-primary">
            Create
          </button>
          <button onClick={() => {
            setShowNewProject(false);
            setNewProjectName('');
          }} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleImport}
        style={{ display: 'none' }}
      />
    </div>
  );
}

export default ProjectSelector;