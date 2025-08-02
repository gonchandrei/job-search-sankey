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
    const nodes = new Set(); // Track all unique nodes

    companies.forEach(company => {
      const stages = company.stages || [];
      if (stages.length === 0) return;

      // Filter out any "No Answer" stages that might be in the database
      const filteredStages = stages.filter(stage => stage.stage_name !== 'No Answer');
      if (filteredStages.length === 0) return;

      // Check if company has "Applied" stage - skip if not
      const hasApplied = filteredStages.some(s => s.stage_name === 'Applied');
      if (!hasApplied) return;

      // Sort stages by order
      const sortedStages = [...filteredStages].sort((a, b) => a.order - b.order);
      
      // Add the first stage to nodes (should be Applied)
      const firstStage = sortedStages[0].stage_name;
      nodes.add(firstStage);

      // Add flows between consecutive stages
      for (let i = 0; i < sortedStages.length - 1; i++) {
        const source = sortedStages[i].stage_name;
        const target = sortedStages[i + 1].stage_name;
        nodes.add(source);
        nodes.add(target);
        const key = `${source}->${target}`;
        flows.set(key, (flows.get(key) || 0) + 1);
      }

      // Check if this company should flow to "No Answer"
      const hasOffer = filteredStages.some(s => s.stage_name === 'Offer');
      const hasRejected = filteredStages.some(s => s.stage_name === 'Rejected');
      
      // If no Offer or Rejected, check if it's been more than 30 days since last stage
      if (!hasOffer && !hasRejected && filteredStages.length > 0) {
        const lastStage = sortedStages[sortedStages.length - 1];
        const daysSinceLastUpdate = (new Date() - new Date(lastStage.date)) / (1000 * 60 * 60 * 24);
        
        if (daysSinceLastUpdate > 30) {
          nodes.add('No Answer');
          const noAnswerKey = `${lastStage.stage_name}->No Answer`;
          flows.set(noAnswerKey, (flows.get(noAnswerKey) || 0) + 1);
        }
      }
    });

    // Define the desired stage order (same as table columns)
    const stageOrder = ['Applied', 'First Interview', 'Technical Interview', 'Final Interview', 'Offer', 'Rejected', 'No Answer'];
    
    // Create nodeList in the exact order we want, including only nodes that exist
    const nodeList = stageOrder.filter(stage => nodes.has(stage));
    
    const nodeMap = new Map(nodeList.map((node, index) => [node, index]));

    const sources = [];
    const targets = [];
    const values = [];
    const labels = [];

    // Sort flows to ensure proper node ordering
    const sortedFlows = Array.from(flows.entries()).sort((a, b) => {
      const [keyA] = a;
      const [keyB] = b;
      const [sourceA, targetA] = keyA.split('->');
      const [sourceB, targetB] = keyB.split('->');
      
      // Sort by source stage order first, then by target stage order
      const sourceOrderA = stageOrder.indexOf(sourceA);
      const sourceOrderB = stageOrder.indexOf(sourceB);
      if (sourceOrderA !== sourceOrderB) {
        return sourceOrderA - sourceOrderB;
      }
      
      const targetOrderA = stageOrder.indexOf(targetA);
      const targetOrderB = stageOrder.indexOf(targetB);
      return targetOrderA - targetOrderB;
    });

    sortedFlows.forEach(([key, count]) => {
      const [source, target] = key.split('->');
      sources.push(nodeMap.get(source));
      targets.push(nodeMap.get(target));
      values.push(count);
      labels.push(`${source} → ${target}: ${count}`);
    });

    // Create node colors
    const nodeColors = nodeList.map(node => {
      return STAGE_COLORS[node] || '#7f8c8d';
    });

    return {
      data: [{
        type: 'sankey',
        orientation: 'h',
        arrangement: 'fixed',
        node: {
          pad: 15,
          thickness: 20,
          line: {
            color: 'black',
            width: 0.5
          },
          x: nodeList.map((node) => {
            // Explicitly position nodes based on stage order
            const stageIndex = stageOrder.indexOf(node);
            const maxIndex = stageOrder.length - 1;
            return stageIndex / maxIndex;
          }),
          y: nodeList.map(() => 0.5),
          label: nodeList.map(node => {
            if (node === 'No Answer') {
              // Count companies that qualify for "No Answer" status
              const noAnswerCount = companies.filter(c => {
                const stages = c.stages || [];
                const filteredStages = stages.filter(s => s.stage_name !== 'No Answer');
                const hasOffer = filteredStages.some(s => s.stage_name === 'Offer');
                const hasRejected = filteredStages.some(s => s.stage_name === 'Rejected');
                
                if (!hasOffer && !hasRejected && filteredStages.length > 0) {
                  const sortedStages = [...filteredStages].sort((a, b) => a.order - b.order);
                  const lastStage = sortedStages[sortedStages.length - 1];
                  const daysSinceLastUpdate = (new Date() - new Date(lastStage.date)) / (1000 * 60 * 60 * 24);
                  return daysSinceLastUpdate > 30;
                }
                return false;
              }).length;
              return `${node} (${noAnswerCount})`;
            } else {
              const count = companies.filter(c => 
                c.stages?.some(s => s.stage_name === node)
              ).length;
              return `${node} (${count})`;
            }
          }),
          color: nodeColors,
          customdata: nodeList.map(node => {
            if (node === 'No Answer') {
              // Count companies that qualify for "No Answer" status
              const noAnswerCount = companies.filter(c => {
                const stages = c.stages || [];
                const filteredStages = stages.filter(s => s.stage_name !== 'No Answer');
                const hasOffer = filteredStages.some(s => s.stage_name === 'Offer');
                const hasRejected = filteredStages.some(s => s.stage_name === 'Rejected');
                
                if (!hasOffer && !hasRejected && filteredStages.length > 0) {
                  const sortedStages = [...filteredStages].sort((a, b) => a.order - b.order);
                  const lastStage = sortedStages[sortedStages.length - 1];
                  const daysSinceLastUpdate = (new Date() - new Date(lastStage.date)) / (1000 * 60 * 60 * 24);
                  return daysSinceLastUpdate > 30;
                }
                return false;
              }).length;
              return noAnswerCount;
            } else {
              const count = companies.filter(c => 
                c.stages?.some(s => s.stage_name === node)
              ).length;
              return count;
            }
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