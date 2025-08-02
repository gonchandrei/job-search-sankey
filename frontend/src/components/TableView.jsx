import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'react-hot-toast';
import debounce from 'lodash.debounce';
import { companiesAPI, stagesAPI } from '../utils/api';
import './TableView.css';

// Custom date editor component for AG-Grid
const DateEditor = React.forwardRef((props, ref) => {
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (props.value) {
      setSelectedDate(new Date(props.value));
    }
  }, [props.value]);

  return (
    <DatePicker
      selected={selectedDate}
      onChange={(date) => {
        setSelectedDate(date);
        if (date) {
          props.stopEditing();
          props.api.stopEditing();
          const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
          props.setValue(formattedDate);
        }
      }}
      dateFormat="yyyy-MM-dd"
      inline
      calendarClassName="ag-custom-component-popup"
    />
  );
});

// Custom link renderer component for AG-Grid
const LinkRenderer = (props) => {
  if (!props.value) return '';
  
  return (
    <a 
      href={props.value} 
      target="_blank" 
      rel="noopener noreferrer"
      style={{ color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}
    >
      Open
    </a>
  );
};

// Common stage names for quick access
const COMMON_STAGES = [
  'Applied', 'First Interview', 'Technical Interview', 
  'Final Interview', 'Offer', 'Rejected', 'No Answer'
];

function TableView({ project }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedView, setExpandedView] = useState(true);
  const gridRef = useRef(null);

  // Stage columns configuration
  const stageColumns = COMMON_STAGES.map(stage => ({
    field: stage.toLowerCase().replace(/\s+/g, '_'),
    headerName: stage,
    editable: true,
    cellEditor: DateEditor,
    cellClass: params => {
      const value = params.value;
      if (value) {
        const stageClass = stage.toLowerCase().replace(/\s+/g, '-');
        return `stage-cell stage-${stageClass}`;
      }
      return '';
    },
    valueGetter: params => {
      const stages = params.data.stages || [];
      const stageData = stages.find(s => s.stage_name === stage);
      return stageData?.date || '';
    },
    valueSetter: params => {
      const newDate = params.newValue;
      const stages = params.data.stages || [];
      const existingStageIndex = stages.findIndex(s => s.stage_name === stage);
      
      if (newDate) {
        // Add or update stage
        if (existingStageIndex >= 0) {
          stages[existingStageIndex].date = newDate;
        } else {
          stages.push({
            stage_name: stage,
            date: newDate,
            order: COMMON_STAGES.indexOf(stage)
          });
        }
      } else {
        // Remove stage
        if (existingStageIndex >= 0) {
          stages.splice(existingStageIndex, 1);
        }
      }
      
      params.data.stages = stages;
      debouncedSaveStages(params.data.id, stages);
      return true;
    },
    hide: !expandedView
  }));

  // Current stage column for collapsed view
  const currentStageColumn = {
    field: 'current_stage',
    headerName: 'Current Stage',
    editable: false,
    cellClass: params => {
      const stageName = params.value?.stage_name;
      if (stageName) {
        const stageClass = stageName.toLowerCase().replace(/\s+/g, '-');
        return `stage-cell stage-${stageClass}`;
      }
      return '';
    },
    valueGetter: params => {
      const stages = params.data.stages || [];
      if (stages.length === 0) return null;
      
      // Find the latest stage based on stage order
      const sortedStages = stages.sort((a, b) => {
        const orderA = COMMON_STAGES.indexOf(a.stage_name);
        const orderB = COMMON_STAGES.indexOf(b.stage_name);
        
        // Special handling for terminal stages (Offer, Rejected, No Answer)
        const terminalStages = ['Offer', 'Rejected', 'No Answer'];
        const isTerminalA = terminalStages.includes(a.stage_name);
        const isTerminalB = terminalStages.includes(b.stage_name);
        
        if (isTerminalA && !isTerminalB) return 1;
        if (!isTerminalA && isTerminalB) return -1;
        if (isTerminalA && isTerminalB) return orderB - orderA;
        
        return orderB - orderA;
      });
      
      return sortedStages[0];
    },
    valueFormatter: params => {
      if (!params.value) return '';
      return `${params.value.stage_name} (${params.value.date})`;
    },
    hide: expandedView
  };

  const columnDefs = [
    {
      field: 'name',
      headerName: 'Company',
      editable: true,
      cellStyle: { fontWeight: 'bold' },
      onCellValueChanged: (params) => {
        debouncedSaveCompany(params.data.id, { name: params.newValue });
      }
    },
    {
      field: 'position',
      headerName: 'Position',
      editable: true,
      onCellValueChanged: (params) => {
        debouncedSaveCompany(params.data.id, { position: params.newValue });
      }
    },
    {
      field: 'link',
      headerName: 'Link',
      editable: true,
      cellRenderer: LinkRenderer,
      onCellValueChanged: (params) => {
        debouncedSaveCompany(params.data.id, { link: params.newValue });
      }
    },
    currentStageColumn,
    ...stageColumns
  ];

  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 100,
  };

  // Load companies
  useEffect(() => {
    loadCompanies();
  }, [project.id]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await companiesAPI.getByProject(project.id);
      setCompanies(response.data);
    } catch (error) {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  // Save functions with debouncing
  const saveCompany = async (companyId, updates) => {
    try {
      await companiesAPI.update(companyId, updates);
    } catch (error) {
      toast.error('Failed to save company');
      loadCompanies(); // Reload to restore data
    }
  };

  const saveStages = async (companyId, stages) => {
    try {
      // Get current stages from server
      const response = await stagesAPI.getByCompany(companyId);
      const currentStages = response.data;
      
      // Delete stages that are no longer present
      for (const currentStage of currentStages) {
        if (!stages.find(s => s.stage_name === currentStage.stage_name)) {
          await stagesAPI.delete(currentStage.id);
        }
      }
      
      // Update or create stages
      for (const stage of stages) {
        const existingStage = currentStages.find(s => s.stage_name === stage.stage_name);
        if (existingStage) {
          // Update existing stage
          await stagesAPI.update(existingStage.id, {
            date: stage.date,
            order: stage.order
          });
        } else {
          // Create new stage
          await stagesAPI.create(companyId, {
            stage_name: stage.stage_name,
            date: stage.date,
            order: stage.order
          });
        }
      }
    } catch (error) {
      toast.error('Failed to save stages');
      loadCompanies(); // Reload to restore data
    }
  };

  const debouncedSaveCompany = useCallback(debounce(saveCompany, 1000), []);
  const debouncedSaveStages = useCallback(debounce(saveStages, 1000), []);

  const handleAddCompany = async () => {
    try {
      const newCompany = {
        name: 'New Company',
        position: 'New Position',
        link: ''
      };
      const response = await companiesAPI.create(project.id, newCompany);
      setCompanies([...companies, response.data]);
      toast.success('Company added');
    } catch (error) {
      toast.error('Failed to add company');
    }
  };

  const handleDeleteCompany = async () => {
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    if (selectedNodes.length === 0) {
      toast.error('Please select a company to delete');
      return;
    }

    if (!window.confirm(`Delete ${selectedNodes.length} company(ies)?`)) {
      return;
    }

    try {
      for (const node of selectedNodes) {
        await companiesAPI.delete(node.data.id);
      }
      toast.success('Company(ies) deleted');
      loadCompanies();
    } catch (error) {
      toast.error('Failed to delete company');
    }
  };

  if (loading) {
    return <div className="loading">Loading companies...</div>;
  }

  return (
    <div className={`table-view ${expandedView ? 'expanded' : 'compact'}`}>
      <div className="table-header">
        <h2>{project.name} - Companies</h2>
        <div className="table-actions">
          <button 
            onClick={() => setExpandedView(!expandedView)} 
            className="btn btn-secondary"
            title={expandedView ? "Show current stage only" : "Show all stages"}
          >
            {expandedView ? '📊 Compact View' : '📈 Full View'}
          </button>
          <button onClick={handleAddCompany} className="btn btn-primary">
            Add Company
          </button>
          <button onClick={handleDeleteCompany} className="btn btn-danger">
            Delete Selected
          </button>
        </div>
      </div>
      
      <div className="ag-theme-alpine table-container">
        <AgGridReact
          ref={gridRef}
          rowData={companies}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowSelection="multiple"
          animateRows={true}
          getRowId={params => params.data.id}
          onGridReady={() => {
            gridRef.current.api.sizeColumnsToFit();
          }}
        />
      </div>
      
      <div className="table-footer">
        <p>Total: {companies.length} companies</p>
        <p className="hint">Click on cells to edit. Changes are saved automatically.</p>
      </div>
    </div>
  );
}

export default TableView;