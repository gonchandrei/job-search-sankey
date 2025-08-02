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
  const [selectedDate, setSelectedDate] = useState(() => {
    // Initialize with current date if no value exists
    if (props.value) {
      return new Date(props.value);
    } else {
      return new Date();
    }
  });

  useEffect(() => {
    if (props.value) {
      setSelectedDate(new Date(props.value));
    } else {
      // Default to current date when no value
      const currentDate = new Date();
      setSelectedDate(currentDate);
    }
  }, [props.value]);

  // Expose getValue method for AG-Grid
  React.useImperativeHandle(ref, () => ({
    getValue: () => {
      if (!props.value && selectedDate) {
        // Return current date if no original value
        return selectedDate.toISOString().split('T')[0];
      }
      return props.value || selectedDate?.toISOString().split('T')[0];
    }
  }));

  // Set current date immediately when editor starts for empty cells
  React.useEffect(() => {
    if (!props.value) {
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split('T')[0];
      // Use requestAnimationFrame to ensure the cell is ready
      requestAnimationFrame(() => {
        props.setValue(formattedDate);
      });
    }
  }, [props.value]);

  return (
    <div className="date-editor-wrapper">
      <DatePicker
        selected={selectedDate}
        onChange={(date) => {
          setSelectedDate(date);
          if (date) {
            const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            props.setValue(formattedDate);
            props.stopEditing();
            props.api.stopEditing();
          }
        }}
        onCalendarOpen={() => {
          // When calendar opens on empty cell, immediately set current date
          if (!props.value) {
            const currentDate = new Date();
            const formattedDate = currentDate.toISOString().split('T')[0];
            props.setValue(formattedDate);
          }
        }}
        dateFormat="yyyy-MM-dd"
        inline
        popperPlacement="bottom-start"
        popperModifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 8],
            },
          },
        ]}
        calendarClassName="ag-custom-component-popup"
      />
    </div>
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
  const [expandedView, setExpandedView] = useState(false); // Changed to false for compact as default
  const [editingMode, setEditingMode] = useState(false); // Track if we're in editing mode
  const [unsavedChanges, setUnsavedChanges] = useState({}); // Track unsaved changes
  const [selectedRows, setSelectedRows] = useState([]); // Track selected rows
  const gridRef = useRef(null);

  // Stage columns configuration
  const stageColumns = COMMON_STAGES.map(stage => ({
    field: stage.toLowerCase().replace(/\s+/g, '_'),
    headerName: stage,
    editable: editingMode,
    cellEditor: DateEditor,
    width: 140, // Fixed optimal width for stage dates
    cellClass: params => {
      const value = params.value;
      if (value) {
        const stageClass = stage.toLowerCase().replace(/\s+/g, '-');
        return `stage-cell stage-${stageClass} date-cell-centered`;
      }
      return 'date-cell-centered';
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
      
      // Track changes instead of auto-saving
      if (editingMode) {
        const companyChanges = unsavedChanges[params.data.id] || {};
        companyChanges.stages = stages;
        setUnsavedChanges({...unsavedChanges, [params.data.id]: companyChanges});
      }
      return true;
    }
  }));

  // Current stage column for collapsed view
  const currentStageColumn = {
    field: 'current_stage',
    headerName: 'Current Stage',
    editable: false,
    width: 150, // Fixed optimal width for current stage display
    cellClass: params => {
      const stageName = params.value?.stage_name;
      if (stageName) {
        const stageClass = stageName.toLowerCase().replace(/\s+/g, '-');
        return `stage-cell stage-${stageClass} stage-cell-centered`;
      }
      return 'stage-cell-centered';
    },
    valueGetter: params => {
      const stages = params.data.stages || [];
      if (stages.length === 0) return null;
      
      // Find the latest stage based on date
      const sortedStages = stages.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA; // Newest first
      });
      
      return sortedStages[0];
    },
    valueFormatter: params => {
      if (!params.value) return '';
      return params.value.stage_name;
    }
  };

  // Last update column for collapsed view
  const lastUpdateColumn = {
    field: 'last_update',
    headerName: 'Last Update',
    editable: false,
    width: 120,
    valueGetter: params => {
      const stages = params.data.stages || [];
      if (stages.length === 0) return '';
      
      // Find the latest stage based on date
      const sortedStages = stages.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA; // Newest first
      });
      
      return sortedStages[0]?.date || '';
    }
  };

  const columnDefs = [
    {
      field: 'rowNumber',
      headerName: '#',
      editable: false,
      width: 60,
      cellStyle: { 
        textAlign: 'center',
        fontWeight: 'bold',
        color: '#6c757d'
      },
      valueGetter: (params) => {
        return params.node.rowIndex + 1;
      },
      sortable: false,
      filter: false,
      suppressMenu: true,
      pinned: 'left'
    },
    {
      field: 'name',
      headerName: 'Company',
      editable: editingMode,
      cellStyle: { fontWeight: 'bold' },
      width: 200, // Fixed optimal width for company names
      onCellValueChanged: (params) => {
        if (editingMode) {
          const companyChanges = unsavedChanges[params.data.id] || {};
          companyChanges.name = params.newValue;
          setUnsavedChanges({...unsavedChanges, [params.data.id]: companyChanges});
        }
      }
    },
    {
      field: 'position',
      headerName: 'Position',
      editable: editingMode,
      width: 250, // Fixed optimal width for position titles
      onCellValueChanged: (params) => {
        if (editingMode) {
          const companyChanges = unsavedChanges[params.data.id] || {};
          companyChanges.position = params.newValue;
          setUnsavedChanges({...unsavedChanges, [params.data.id]: companyChanges});
        }
      }
    },
    {
      field: 'link',
      headerName: 'Link',
      editable: editingMode,
      cellRenderer: LinkRenderer,
      width: 80, // Fixed optimal width for "Open" links
      onCellValueChanged: (params) => {
        if (editingMode) {
          const companyChanges = unsavedChanges[params.data.id] || {};
          companyChanges.link = params.newValue;
          setUnsavedChanges({...unsavedChanges, [params.data.id]: companyChanges});
        }
      }
    },
    // Conditionally include columns based on view
    ...(expandedView ? stageColumns : [currentStageColumn, lastUpdateColumn])
  ];

  // Debug logging
  console.log('TableView render:', {
    expandedView,
    totalColumns: columnDefs.length,
    stageColumnsCount: stageColumns.length,
    showingStageColumns: expandedView,
    columnHeaders: columnDefs.map(col => col.headerName)
  });

  const defaultColDef = {
    sortable: false, // Disable sorting for all columns
    filter: false, // Disable filter menus for all columns
    resizable: false, // Make columns non-adjustable
    suppressSizeToFit: true, // Prevent auto-fitting to container
    autoHeaderHeight: false, // Disable auto header height
    headerHeight: 40, // Fixed header height
    flex: 0, // Don't use flex sizing
    minWidth: 80, // Reduced minimum width
    suppressMenu: true, // Disable column menu (three dots)
  };

  // Load companies
  useEffect(() => {
    loadCompanies();
  }, [project.id]);

  // Handle view changes
  useEffect(() => {
    if (gridRef.current?.api) {
      // Refresh grid when view changes
      setTimeout(() => {
        gridRef.current.api.refreshCells();
        gridRef.current.api.autoSizeAllColumns();
      }, 100); // Small delay to ensure DOM updates
    }
  }, [expandedView]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await companiesAPI.getByProject(project.id);
      
      // Sort companies by last update date (newest first)
      const sortedCompanies = response.data.sort((a, b) => {
        const getLastUpdateDate = (company) => {
          const stages = company.stages || [];
          if (stages.length === 0) return new Date(0); // Very old date for companies with no stages
          
          const sortedStages = stages.sort((x, y) => {
            const dateX = new Date(x.date);
            const dateY = new Date(y.date);
            return dateY - dateX; // Newest first
          });
          
          return new Date(sortedStages[0].date);
        };
        
        const dateA = getLastUpdateDate(a);
        const dateB = getLastUpdateDate(b);
        return dateB - dateA; // Newest first
      });
      
      setCompanies(sortedCompanies);
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

  // Manual save all changes
  const saveAllChanges = async () => {
    try {
      for (const [companyId, changes] of Object.entries(unsavedChanges)) {
        // Save company data changes
        if (changes.name || changes.position || changes.link) {
          const updates = {};
          if (changes.name !== undefined) updates.name = changes.name;
          if (changes.position !== undefined) updates.position = changes.position;
          if (changes.link !== undefined) updates.link = changes.link;
          await saveCompany(companyId, updates);
        }
        
        // Save stages changes
        if (changes.stages) {
          await saveStages(companyId, changes.stages);
        }
      }
      
      setUnsavedChanges({});
      setEditingMode(false);
      setExpandedView(false); // Return to compact view after save
      setSelectedRows([]); // Clear selection
      toast.success('All changes saved successfully');
      await loadCompanies(); // Refresh data
    } catch (error) {
      toast.error('Failed to save some changes');
    }
  };

  const handleAddCompany = async () => {
    try {
      const newCompany = {
        name: 'New Company',
        position: 'New Position',
        link: ''
      };
      const response = await companiesAPI.create(project.id, newCompany);
      
      // Automatically add "Applied" stage with current date
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const appliedStage = {
        stage_name: 'Applied',
        date: currentDate,
        order: COMMON_STAGES.indexOf('Applied')
      };
      
      try {
        await stagesAPI.create(response.data.id, appliedStage);
        // Reload companies to get the updated data with the new stage
        await loadCompanies();
        toast.success('Company added with Applied stage');
      } catch (stageError) {
        console.error('Failed to add Applied stage:', stageError);
        setCompanies([...companies, response.data]);
        toast.success('Company added (stage creation failed)');
      }
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
          {editingMode ? (
            <>
              <button 
                onClick={saveAllChanges} 
                className="btn btn-success"
                title="Save all changes and return to compact view"
              >
                💾 Save
              </button>
              <button 
                onClick={() => {
                  if (Object.keys(unsavedChanges).length > 0) {
                    if (!window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                      return;
                    }
                  }
                  setEditingMode(false);
                  setExpandedView(false);
                  setUnsavedChanges({});
                  setSelectedRows([]); // Clear selection
                  loadCompanies(); // Reload to discard changes
                }} 
                className="btn btn-secondary"
                title="Cancel editing and discard changes"
              >
                ✖️ Cancel
              </button>
            </>
          ) : (
            <button 
              onClick={() => {
                setEditingMode(true);
                setExpandedView(true);
              }} 
              className="btn btn-secondary"
              title="Edit companies in expanded view"
            >
              ✏️ Edit
            </button>
          )}
          {editingMode && (
            <button onClick={handleAddCompany} className="btn btn-primary">
              Add Company
            </button>
          )}
          {editingMode && selectedRows.length > 0 && (
            <button onClick={handleDeleteCompany} className="btn btn-danger">
              Delete Selected ({selectedRows.length})
            </button>
          )}
        </div>
      </div>
      
      <div className="ag-theme-alpine table-container">
        <AgGridReact
          ref={gridRef}
          rowData={companies}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          headerHeight={40}
          rowSelection="multiple"
          animateRows={true}
          getRowId={params => params.data.id}
          onSelectionChanged={(params) => {
            const selectedNodes = params.api.getSelectedNodes();
            setSelectedRows(selectedNodes.map(node => node.data));
          }}
          onGridReady={(params) => {
            // Auto-size columns to content for optimal width
            params.api.autoSizeAllColumns();
          }}
          onFirstDataRendered={(params) => {
            // Also auto-size when data is first loaded
            params.api.autoSizeAllColumns();
          }}
          onGridSizeChanged={(params) => {
            // Ensure columns resize when grid size changes
            params.api.autoSizeAllColumns();
          }}
          suppressColumnVirtualisation={true}
        />
      </div>
      
      <div className="table-footer">
        <p>Total: {companies.length} companies</p>
        <p className="hint">
          {editingMode 
            ? "Click on cells to edit. Remember to save your changes." 
            : "Click 'Edit' to modify company information."}
        </p>
      </div>
    </div>
  );
}

export default TableView;