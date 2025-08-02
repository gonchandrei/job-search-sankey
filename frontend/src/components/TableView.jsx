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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (props.value) {
      setSelectedDate(new Date(props.value));
    } else {
      // Default to current date when no value
      const currentDate = new Date();
      setSelectedDate(currentDate);
    }
  }, [props.value]);

  // Auto-open the date picker when the editor starts
  useEffect(() => {
    setIsOpen(true);
  }, []);

  // Expose getValue method for AG-Grid
  React.useImperativeHandle(ref, () => ({
    getValue: () => {
      return selectedDate?.toISOString().split('T')[0];
    }
  }));

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
          }
        }}
        onClickOutside={() => {
          props.stopEditing();
        }}
        dateFormat="yyyy-MM-dd"
        open={isOpen}
        onCalendarClose={() => {
          setIsOpen(false);
          props.stopEditing();
        }}
        popperPlacement="auto"
        popperModifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 8],
            },
          },
          {
            name: 'flip',
            options: {
              fallbackPlacements: ['bottom-start', 'top-start', 'bottom-end', 'top-end'],
            },
          },
          {
            name: 'preventOverflow',
            options: {
              boundary: 'viewport',
              altBoundary: true,
              padding: 8,
            },
          },
        ]}
        calendarClassName="ag-custom-component-popup"
        customInput={<input style={{ width: '100%', border: 'none', outline: 'none' }} />}
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

// Common stage names for quick access (No Answer removed from table view)
const COMMON_STAGES = [
  'Applied', 'First Interview', 'Technical Interview', 
  'Final Interview', 'Offer', 'Rejected'
];

// All stages including No Answer for Sankey diagram
const ALL_STAGES = [
  'Applied', 'First Interview', 'Technical Interview', 
  'Final Interview', 'Offer', 'Rejected', 'No Answer'
];

function TableView({ project }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedView, setExpandedView] = useState(false); // Changed to false for compact as default
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
      debouncedSaveStages(params.data.id, stages);
      return true;
    }
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
        return `stage-cell stage-${stageClass} stage-cell-centered`;
      }
      return 'stage-cell-centered';
    },
    valueGetter: params => {
      const stages = params.data.stages || [];
      if (stages.length === 0) return null;
      
      // Check if company has reached a terminal stage (Offer or Rejected)
      const hasOffer = stages.some(s => s.stage_name === 'Offer');
      const hasRejected = stages.some(s => s.stage_name === 'Rejected');
      
      // If neither Offer nor Rejected, and has other stages, it's "No Answer"
      if (!hasOffer && !hasRejected && stages.length > 0) {
        // Find the latest non-terminal stage
        const nonTerminalStages = stages.filter(s => 
          s.stage_name !== 'Offer' && s.stage_name !== 'Rejected' && s.stage_name !== 'No Answer'
        );
        
        if (nonTerminalStages.length > 0) {
          const sortedStages = nonTerminalStages.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA; // Newest first
          });
          
          const latestStage = sortedStages[0];
          // Check if it's been more than reasonable time since last update (e.g., 30 days)
          const daysSinceLastUpdate = (new Date() - new Date(latestStage.date)) / (1000 * 60 * 60 * 24);
          
          if (daysSinceLastUpdate > 30) {
            return { stage_name: 'No Answer', date: latestStage.date };
          }
          
          return latestStage;
        }
      }
      
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
    resizable: true, // Allow column resizing
    suppressSizeToFit: true, // Prevent auto-fitting to container
    autoHeaderHeight: false, // Disable auto header height
    headerHeight: 40, // Fixed header height
    flex: 0, // Don't use flex sizing
    minWidth: 80, // Minimum width
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
      
      // Update or create stages (excluding No Answer as it's computed)
      for (const stage of stages) {
        if (stage.stage_name === 'No Answer') continue; // Skip No Answer stages
        
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
          <button 
            onClick={() => setExpandedView(!expandedView)} 
            className="btn btn-secondary"
            title={expandedView ? "Switch to compact view" : "Switch to full view"}
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
          headerHeight={40}
          rowSelection="multiple"
          animateRows={true}
          getRowId={params => params.data.id}
          domLayout="normal"
          suppressHorizontalScroll={false}
          suppressColumnVirtualisation={false}
          enableBrowserTooltips={true}
          onCellKeyDown={(params) => {
            // Handle Delete key to remove dates
            if (params.event.key === 'Delete' || params.event.key === 'Del') {
              const { colDef, data, node } = params;
              
              // Check if this is a date column (stage column)
              const isStageColumn = COMMON_STAGES.some(stage => 
                colDef.field === stage.toLowerCase().replace(/\s+/g, '_')
              );
              
              if (isStageColumn) {
                // Find the stage name from the column field
                const stageName = COMMON_STAGES.find(stage => 
                  colDef.field === stage.toLowerCase().replace(/\s+/g, '_')
                );
                
                if (stageName) {
                  // Remove the stage date
                  const stages = data.stages || [];
                  const updatedStages = stages.filter(s => s.stage_name !== stageName);
                  
                  // Update the data
                  data.stages = updatedStages;
                  
                  // Save the changes
                  debouncedSaveStages(data.id, updatedStages);
                  
                  // Refresh the specific cell
                  params.api.refreshCells({
                    rowNodes: [node],
                    columns: [colDef.field]
                  });
                  
                  // Prevent default behavior
                  params.event.preventDefault();
                }
              }
            }
          }}

          onGridReady={(params) => {
            // Auto-size columns to fit content and headers
            params.api.autoSizeAllColumns();
          }}
          onFirstDataRendered={(params) => {
            // Auto-size when data is first loaded
            params.api.autoSizeAllColumns();
          }}
          onGridSizeChanged={(params) => {
            // Keep auto-sizing when grid changes
            params.api.autoSizeAllColumns();
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