import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { companiesAPI } from '../utils/api';
import './SankeyView.css';

// Stage colors
const STAGE_COLORS = {
  'Applied': '#17a2b8',
  'First Interview': '#007bff',
  'Technical Interview': '#6610f2',
  'Final Interview': '#e83e8c',
  'Offer': '#28a745',
  'Rejected': '#dc3545',
  'No Answer': '#6c757d'
};

function SankeyView({ project }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, [project.id]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await companiesAPI.getByProject(project.id);
      setCompanies(response.data);
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const sankeyData = useMemo(() => {
    // Build flow data from companies
    const flows = new Map(); // key: "source->target", value: count
    const nodes = new Set(['Start']); // Track all unique nodes

    companies.forEach(company => {
      const stages = company.stages || [];
      if (stages.length === 0) return;

      // Sort stages by order
      const sortedStages = [...stages].sort((a, b) => a.order - b.order);
      
      // Add flow from Start to first stage
      const firstStage = sortedStages[0].stage_name;
      nodes.add(firstStage);
      const startKey = `Start->${firstStage}`;
      flows.set(startKey, (flows.get(startKey) || 0) + 1);

      // Add flows between consecutive stages
      for (let i = 0; i < sortedStages.length - 1; i++) {
        const source = sortedStages[i].stage_name;
        const target = sortedStages[i + 1].stage_name;
        nodes.add(source);
        nodes.add(target);
        const key = `${source}->${target}`;
        flows.set(key, (flows.get(key) || 0) + 1);
      }
    });

    // Convert to Plotly format
    const nodeList = Array.from(nodes);
    const nodeMap = new Map(nodeList.map((node, index) => [node, index]));

    const sources = [];
    const targets = [];
    const values = [];
    const labels = [];

    flows.forEach((count, key) => {
      const [source, target] = key.split('->');
      sources.push(nodeMap.get(source));
      targets.push(nodeMap.get(target));
      values.push(count);
      labels.push(`${source} → ${target}: ${count}`);
    });

    // Create node colors
    const nodeColors = nodeList.map(node => {
      if (node === 'Start') return '#95a5a6';
      return STAGE_COLORS[node] || '#7f8c8d';
    });

    return {
      data: [{
        type: 'sankey',
        orientation: 'h',
        node: {
          pad: 15,
          thickness: 20,
          line: {
            color: 'black',
            width: 0.5
          },
          label: nodeList.map(node => {
            if (node === 'Start') return `Start (${companies.length})`;
            const count = companies.filter(c => 
              c.stages?.some(s => s.stage_name === node)
            ).length;
            return `${node} (${count})`;
          }),
          color: nodeColors,
          customdata: nodeList.map(node => {
            if (node === 'Start') return companies.length;
            const count = companies.filter(c => 
              c.stages?.some(s => s.stage_name === node)
            ).length;
            return count;
          }),
          hovertemplate: '%{label}<br>Total: %{customdata}<extra></extra>'
        },
        link: {
          source: sources,
          target: targets,
          value: values,
          customdata: labels,
          hovertemplate: '%{customdata}<extra></extra>'
        }
      }],
      layout: {
        title: {
          text: `Application Flow - ${project.name}`,
          font: { size: 20 }
        },
        font: { size: 12 },
        height: 600,
        margin: { l: 50, r: 50, t: 80, b: 50 }
      }
    };
  }, [companies, project.name]);

  if (loading) {
    return <div className="loading">Loading diagram...</div>;
  }

  return (
    <div className="sankey-view">
      <div className="sankey-header">
        <h2>Application Flow Visualization</h2>
        <div className="sankey-stats">
          <div className="stat">
            <span className="stat-label">Total Applications:</span>
            <span className="stat-value">{companies.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Active:</span>
            <span className="stat-value">
              {companies.filter(c => {
                const stages = c.stages || [];
                return stages.length > 0 && 
                  !stages.some(s => ['Rejected', 'Withdrawn', 'No Answer', 'Offer'].includes(s.stage_name));
              }).length}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Offers:</span>
            <span className="stat-value">
              {companies.filter(c => c.stages?.some(s => s.stage_name === 'Offer')).length}
            </span>
          </div>
        </div>
      </div>
      
      <div className="sankey-container">
        <Plot
          data={sankeyData.data}
          layout={sankeyData.layout}
          config={{ responsive: true, displayModeBar: false }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      
      <div className="sankey-legend">
        <h3>Stage Colors:</h3>
        <div className="legend-items">
          {Object.entries(STAGE_COLORS).map(([stage, color]) => (
            <div key={stage} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: color }}></div>
              <span>{stage}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SankeyView;