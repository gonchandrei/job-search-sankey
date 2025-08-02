import axios from 'axios';

const API_BASE_URL = '/api';

// Projects API
export const projectsAPI = {
  getAll: () => axios.get(`${API_BASE_URL}/projects`),
  get: (id) => axios.get(`${API_BASE_URL}/projects/${id}`),
  create: (data) => axios.post(`${API_BASE_URL}/projects`, data),
  update: (id, data) => axios.put(`${API_BASE_URL}/projects/${id}`, data),
  delete: (id) => axios.delete(`${API_BASE_URL}/projects/${id}`),
};

// Companies API
export const companiesAPI = {
  getByProject: (projectId) => axios.get(`${API_BASE_URL}/projects/${projectId}/companies`),
  get: (id) => axios.get(`${API_BASE_URL}/companies/${id}`),
  create: (projectId, data) => axios.post(`${API_BASE_URL}/projects/${projectId}/companies`, data),
  update: (id, data) => axios.put(`${API_BASE_URL}/companies/${id}`, data),
  delete: (id) => axios.delete(`${API_BASE_URL}/companies/${id}`),
};

// Stages API
export const stagesAPI = {
  getByCompany: (companyId) => axios.get(`${API_BASE_URL}/companies/${companyId}/stages`),
  get: (id) => axios.get(`${API_BASE_URL}/stages/${id}`),
  create: (companyId, data) => axios.post(`${API_BASE_URL}/companies/${companyId}/stages`, data),
  update: (id, data) => axios.put(`${API_BASE_URL}/stages/${id}`, data),
  delete: (id) => axios.delete(`${API_BASE_URL}/stages/${id}`),
};

// Import/Export API
export const importExportAPI = {
  import: (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE_URL}/projects/${projectId}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  export: (projectId) => {
    return axios.get(`${API_BASE_URL}/projects/${projectId}/export`, {
      responseType: 'blob',
    });
  },
};