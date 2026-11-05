import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PathwayFinding, ProductFinding, SelectedComponent } from '../../types';

interface PathwayFlowProps {
  pathways: PathwayFinding[];
  products: ProductFinding[];
  selectedComponents: SelectedComponent[];
  overallStatus: string;
}

export const PathwayFlow: React.FC<PathwayFlowProps> = ({
  pathways,
  products,
  selectedComponents,
  overallStatus,
}) => {
  const { nodes, edges } = useMemo(() => {
    const isLcc = selectedComponents.some(c => c.component_id === 'comp_lcc_iccg');
    const isMhetase = selectedComponents.some(c => c.component_id === 'comp_mhetase');
    const isFast = selectedComponents.some(c => c.component_id === 'comp_fast_petase');
    const isPetase = selectedComponents.some(c => c.component_id === 'comp_ispetase');
    const isInactivated = overallStatus === 'inactivated';

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // Node 1: PET Substrate
    flowNodes.push({
      id: 'node-pet',
      position: { x: 50, y: 120 },
      data: {
        label: (
          <div className="p-3 text-left">
            <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">Substrate Polymer</div>
            <div className="text-sm font-semibold text-slate-100">Poly(ethylene terephthalate)</div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">(C10H8O4)n · Tg ~67°C</div>
            <div className="mt-2 text-[11px] text-slate-300 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/60 inline-block">
              Insoluble Polyester Matrix
            </div>
          </div>
        ),
      },
      style: {
        background: '#111827',
        border: '1px solid #06b6d4',
        borderRadius: '8px',
        width: 230,
        boxShadow: '0 4px 12px rgba(6, 182, 212, 0.15)',
      },
    });

    if (isLcc) {
      // Direct thermophilic pathway
      flowNodes.push({
        id: 'node-catalyst-lcc',
        position: { x: 340, y: 120 },
        data: {
          label: (
            <div className="p-3 text-left">
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">Thermophilic Cutinase</div>
              <div className="text-sm font-semibold text-slate-100">LCC-ICCG Cutinase</div>
              <div className="text-xs text-emerald-300 font-mono mt-0.5">Optimum: 72°C · pH 8.0</div>
              <div className="mt-2 text-[11px] text-emerald-200 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700/60">
                Direct Monomer Cleavage
              </div>
            </div>
          ),
        },
        style: {
          background: '#0f1f1a',
          border: '1px solid #10b981',
          borderRadius: '8px',
          width: 230,
        },
      });

      flowNodes.push({
        id: 'node-monomers-lcc',
        position: { x: 630, y: 120 },
        data: {
          label: (
            <div className="p-3 text-left">
              <div className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">Recovered Monomers</div>
              <div className="text-sm font-semibold text-slate-100">TPA + Ethylene Glycol</div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">C8H6O4 + C2H6O2</div>
              <div className="mt-2 text-[11px] text-purple-200 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-700/60">
                Virgin-Grade Closed-Loop Yield
              </div>
            </div>
          ),
        },
        style: {
          background: '#1a102b',
          border: '1px solid #a855f7',
          borderRadius: '8px',
          width: 230,
        },
      });

      flowEdges.push({
        id: 'e-pet-lcc',
        source: 'node-pet',
        target: 'node-catalyst-lcc',
        animated: !isInactivated,
        style: { stroke: '#06b6d4', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' },
      });
      flowEdges.push({
        id: 'e-lcc-mono',
        source: 'node-catalyst-lcc',
        target: 'node-monomers-lcc',
        animated: !isInactivated,
        style: { stroke: '#10b981', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      });
    } else {
      // Mesophilic / Intermediate PETase pathway
      const enzymeName = isFast ? 'FAST-PETase' : (isPetase ? 'IsPETase' : 'Polyester Hydrolase');
      const enzymeColor = isInactivated ? '#ef4444' : '#10b981';

      flowNodes.push({
        id: 'node-catalyst-petase',
        position: { x: 330, y: 60 },
        data: {
          label: (
            <div className="p-3 text-left">
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: enzymeColor }}>
                Primary Catalyst
              </div>
              <div className="text-sm font-semibold text-slate-100">{enzymeName}</div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">Ser160-His237-Asp206 triad</div>
              <div className="mt-2 text-[11px] px-2 py-0.5 rounded border" style={{
                color: isInactivated ? '#fca5a5' : '#a7f3d0',
                background: isInactivated ? 'rgba(127, 29, 29, 0.4)' : 'rgba(6, 78, 59, 0.4)',
                borderColor: isInactivated ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)',
              }}>
                {isInactivated ? 'Denatured (Inactive)' : 'Active Ester Cleavage'}
              </div>
            </div>
          ),
        },
        style: {
          background: '#0d1726',
          border: `1px solid ${enzymeColor}`,
          borderRadius: '8px',
          width: 220,
        },
      });

      flowNodes.push({
        id: 'node-intermediate-mhet',
        position: { x: 600, y: 60 },
        data: {
          label: (
            <div className="p-3 text-left">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">Primary Intermediate</div>
              <div className="text-sm font-semibold text-slate-100">MHET (+ minor BHET)</div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">C10H10O5 · 210.18 g/mol</div>
              <div className="mt-2 text-[11px] text-amber-200 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-700/60">
                {isMhetase ? 'Rapidly Cleared by MHETase' : 'Feedback Inhibitor'}
              </div>
            </div>
          ),
        },
        style: {
          background: '#1e180d',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          width: 220,
        },
      });

      flowEdges.push({
        id: 'e-pet-petase',
        source: 'node-pet',
        target: 'node-catalyst-petase',
        animated: !isInactivated,
        style: { stroke: '#06b6d4', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' },
      });

      flowEdges.push({
        id: 'e-petase-mhet',
        source: 'node-catalyst-petase',
        target: 'node-intermediate-mhet',
        animated: !isInactivated,
        style: { stroke: isInactivated ? '#ef4444' : '#10b981', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: isInactivated ? '#ef4444' : '#10b981' },
      });

      if (isMhetase) {
        flowNodes.push({
          id: 'node-catalyst-mhetase',
          position: { x: 600, y: 220 },
          data: {
            label: (
              <div className="p-3 text-left">
                <div className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold">Secondary Hydrolase</div>
                <div className="text-sm font-semibold text-slate-100">MHETase (ISF6_0224)</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">Ser225-His528-Asp492</div>
                <div className="mt-2 text-[11px] text-teal-200 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-700/60">
                  Relieves PETase Inhibition
                </div>
              </div>
            ),
          },
          style: {
            background: '#0c1a1e',
            border: '1px solid #14b8a6',
            borderRadius: '8px',
            width: 220,
          },
        });

        flowNodes.push({
          id: 'node-final-monomers',
          position: { x: 880, y: 140 },
          data: {
            label: (
              <div className="p-3 text-left">
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">Final Monomers</div>
                <div className="text-sm font-semibold text-slate-100">TPA + Ethylene Glycol</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">100% Cleaved Monomers</div>
                <div className="mt-2 text-[11px] text-emerald-200 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700/60">
                  Circular Economy Monomers
                </div>
              </div>
            ),
          },
          style: {
            background: '#0a1d17',
            border: '1px solid #10b981',
            borderRadius: '8px',
            width: 220,
          },
        });

        flowEdges.push({
          id: 'e-mhet-mhetase',
          source: 'node-intermediate-mhet',
          target: 'node-catalyst-mhetase',
          animated: !isInactivated,
          style: { stroke: '#f59e0b', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
        });

        flowEdges.push({
          id: 'e-mhetase-final',
          source: 'node-catalyst-mhetase',
          target: 'node-final-monomers',
          animated: !isInactivated,
          style: { stroke: '#14b8a6', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#14b8a6' },
        });
      } else {
        // Without MHETase, free TPA is minor product
        flowNodes.push({
          id: 'node-minor-tpa',
          position: { x: 880, y: 60 },
          data: {
            label: (
              <div className="p-3 text-left">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Unconverted State</div>
                <div className="text-sm font-semibold text-slate-100">MHET Accumulation</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">Without MHETase</div>
                <div className="mt-2 text-[11px] text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">
                  Incomplete monomer yield
                </div>
              </div>
            ),
          },
          style: {
            background: '#161922',
            border: '1px dashed #64748b',
            borderRadius: '8px',
            width: 220,
          },
        });

        flowEdges.push({
          id: 'e-mhet-accum',
          source: 'node-intermediate-mhet',
          target: 'node-minor-tpa',
          animated: false,
          style: { stroke: '#64748b', strokeDasharray: '4 4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
        });
      }
    }

    return { nodes: flowNodes, edges: flowEdges };
  }, [pathways, products, selectedComponents, overallStatus]);

  return (
    <div className="w-full h-80 rounded-lg border border-slate-800 bg-slate-950/80 overflow-hidden relative">
      <div className="absolute top-2 left-3 z-10 flex items-center gap-2 bg-slate-900/90 px-2.5 py-1 rounded text-xs text-slate-300 border border-slate-800">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Interactive Degradation Flowchart (React Flow)</span>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        attributionPosition="bottom-right"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#1e293b" />
        <Controls className="bg-slate-900 border-slate-700 fill-slate-300" />
      </ReactFlow>
    </div>
  );
};
