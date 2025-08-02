import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProjectSelector from './components/ProjectSelector';
import TableView from './components/TableView';
import SankeyView from './components/SankeyView';
import Navigation from './components/Navigation';
import { projectsAPI } from './utils/api';
import './styles/App.css';

function App() {
  const [currentProject, setCurrentProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
      if (response.data.length > 0 && !currentProject) {
        setCurrentProject(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <Toaster position="top-right" />
      <header className="app-header">
        <h1>Job Application Tracker</h1>
        <ProjectSelector
          projects={projects}
          currentProject={currentProject}
          onProjectChange={setCurrentProject}
          onProjectsUpdate={loadProjects}
        />
      </header>
      
      {currentProject ? (
        <>
          <Navigation />
          <main className="app-main">
            <Routes>
              <Route path="/table" element={<TableView project={currentProject} />} />
              <Route path="/sankey" element={<SankeyView project={currentProject} />} />
              <Route path="*" element={<Navigate to="/table" replace />} />
            </Routes>
          </main>
        </>
      ) : (
        <div className="no-project">
          <p>No projects found. Create a new project to get started.</p>
        </div>
      )}
    </div>
  );
}

export default App;