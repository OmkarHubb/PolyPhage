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
      position: { x: 50, y: 110 },
      data: {
        label: (
          <div className="p-3.5 text-left">
            <div className="text-[10px] font-medium uppercase tracking-wider text-[#777780]">Substrate Polymer</div>
            <div className="text-xs font-semibold text-[#24242B] mt-0.5">Poly(ethylene terephthalate)</div>
            <div className="text-[11px] text-[#777780] font-mono mt-0.5">(C10H8O4)n · Tg ~67°C</div>
            <div className="mt-2 text-[10px] text-[#24242B] bg-[#F7F7F8] px-2 py-0.5 rounded border border-[#E7E7EB] inline-block font-medium">
              Insoluble Polyester Matrix
            </div>
          </div>
        ),
      },
      style: {
        background: '#FFFFFF',
        border: '1px solid #E7E7EB',
        borderRadius: '12px',
        width: 230,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
    });

    if (isLcc) {
      // Direct thermophilic pathway
      flowNodes.push({
        id: 'node-catalyst-lcc',
        position: { x: 340, y: 110 },
        data: {
          label: (
            <div className="p-3.5 text-left">
              <div className="text-[10px] font-medium uppercase tracking-wider text-[#2D8A6E]">Thermophilic Cutinase</div>
              <div className="text-xs font-semibold text-[#24242B] mt-0.5">LCC-ICCG Cutinase</div>
              <div className="text-[11px] text-[#777780] font-mono mt-0.5">Optimum: 72°C · pH 8.0</div>
              <div className="mt-2 text-[10px] text-[#2D8A6E] bg-[#E8F6F1] px-2 py-0.5 rounded border border-[#C6E8DC] font-medium">
                Direct Monomer Cleavage
              </div>
            </div>
          ),
        },
        style: {
          background: '#FFFFFF',
          border: '1px solid #C6E8DC',
          borderRadius: '12px',
          width: 230,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        },
      });

      flowNodes.push({
        id: 'node-monomers-lcc',
        position: { x: 630, y: 110 },
        data: {
          label: (
            <div className="p-3.5 text-left">
              <div className="text-[10px] font-medium uppercase tracking-wider text-[#7461CE]">Recovered Monomers</div>
              <div className="text-xs font-semibold text-[#24242B] mt-0.5">TPA + Ethylene Glycol</div>
              <div className="text-[11px] text-[#777780] font-mono mt-0.5">C8H6O4 + C2H6O2</div>
              <div className="mt-2 text-[10px] text-[#7461CE] bg-[#EAE5FA] px-2 py-0.5 rounded border border-[#D5CBF7] font-medium">
                Virgin-Grade Closed-Loop Yield
              </div>
            </div>
          ),
        },
        style: {
          background: '#FFFFFF',
          border: '1px solid #D5CBF7',
          borderRadius: '12px',
          width: 230,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        },
      });

      flowEdges.push({
        id: 'e-pet-lcc',
        source: 'node-pet',
        target: 'node-catalyst-lcc',
        animated: !isInactivated,
        style: { stroke: '#9785E8', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#9785E8' },
      });
      flowEdges.push({
        id: 'e-lcc-mono',
        source: 'node-catalyst-lcc',
        target: 'node-monomers-lcc',
        animated: !isInactivated,
        style: { stroke: '#72C7B0', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#72C7B0' },
      });
    } else {
      // Mesophilic PETase pathway
      const enzymeName = isFast ? 'FAST-PETase' : (isPetase ? 'IsPETase' : 'Polyester Hydrolase');
      const badgeText = isInactivated ? 'Denatured (Inactive)' : 'Active Ester Cleavage';
      const badgeStyle = isInactivated
        ? 'text-[#C44141] bg-[#FCEEEE] border-[#F8C8C8]'
        : 'text-[#2D8A6E] bg-[#E8F6F1] border-[#C6E8DC]';

      flowNodes.push({
        id: 'node-catalyst-petase',
        position: { x: 330, y: 50 },
        data: {
          label: (
            <div className="p-3.5 text-left">
              <div className="text-[10px] font-medium uppercase tracking-wider text-[#777780]">
                Primary Catalyst
              </div>
              <div className="text-xs font-semibold text-[#24242B] mt-0.5">{enzymeName}</div>
              <div className="text-[11px] text-[#777780] font-mono mt-0.5">Ser160-His237-Asp206 triad</div>
              <div className={`mt-2 text-[10px] px-2 py-0.5 rounded border font-medium ${badgeStyle}`}>
                {badgeText}
              </div>
            </div>
          ),
        },
        style: {
          background: '#FFFFFF',
          border: isInactivated ? '1px solid #F8C8C8' : '1px solid #E7E7EB',
          borderRadius: '12px',
          width: 220,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        },
      });

      flowNodes.push({
        id: 'node-intermediate-mhet',
        position: { x: 600, y: 50 },
        data: {
          label: (
            <div className="p-3.5 text-left">
              <div className="text-[10px] font-medium uppercase tracking-wider text-[#B47820]">Primary Intermediate</div>
              <div className="text-xs font-semibold text-[#24242B] mt-0.5">MHET (+ minor BHET)</div>
              <div className="text-[11px] text-[#777780] font-mono mt-0.5">C10H10O5 · 210.18 g/mol</div>
              <div className="mt-2 text-[10px] text-[#B47820] bg-[#FEF6EB] px-2 py-0.5 rounded border border-[#F6E1C4] font-medium">
                {isMhetase ? 'Cleared by MHETase' : 'Feedback Inhibitor'}
              </div>
            </div>
          ),
        },
        style: {
          background: '#FFFFFF',
          border: '1px solid #F6E1C4',
          borderRadius: '12px',
          width: 220,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        },
      });

      flowEdges.push({
        id: 'e-pet-petase',
        source: 'node-pet',
        target: 'node-catalyst-petase',
        animated: !isInactivated,
        style: { stroke: '#9785E8', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#9785E8' },
      });

      flowEdges.push({
        id: 'e-petase-mhet',
        source: 'node-catalyst-petase',
        target: 'node-intermediate-mhet',
        animated: !isInactivated,
        style: { stroke: isInactivated ? '#C44141' : '#72C7B0', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: isInactivated ? '#C44141' : '#72C7B0' },
      });

      if (isMhetase) {
        flowNodes.push({
          id: 'node-catalyst-mhetase',
          position: { x: 600, y: 200 },
          data: {
            label: (
              <div className="p-3.5 text-left">
                <div className="text-[10px] font-medium uppercase tracking-wider text-[#7461CE]">Secondary Hydrolase</div>
                <div className="text-xs font-semibold text-[#24242B] mt-0.5">MHETase (ISF6_0224)</div>
                <div className="text-[11px] text-[#777780] font-mono mt-0.5">Ser225-His528-Asp492</div>
                <div className="mt-2 text-[10px] text-[#7461CE] bg-[#EAE5FA] px-2 py-0.5 rounded border border-[#D5CBF7] font-medium">
                  Relieves PETase Inhibition
                </div>
              </div>
            ),
          },
          style: {
            background: '#FFFFFF',
            border: '1px solid #D5CBF7',
            borderRadius: '12px',
            width: 220,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          },
        });

        flowNodes.push({
          id: 'node-final-monomers',
          position: { x: 880, y: 120 },
          data: {
            label: (
              <div className="p-3.5 text-left">
                <div className="text-[10px] font-medium uppercase tracking-wider text-[#2D8A6E]">Final Monomers</div>
                <div className="text-xs font-semibold text-[#24242B] mt-0.5">TPA + Ethylene Glycol</div>
                <div className="text-[11px] text-[#777780] font-mono mt-0.5">100% Cleaved Monomers</div>
                <div className="mt-2 text-[10px] text-[#2D8A6E] bg-[#E8F6F1] px-2 py-0.5 rounded border border-[#C6E8DC] font-medium">
                  Circular Economy Monomers
                </div>
              </div>
            ),
          },
          style: {
            background: '#FFFFFF',
            border: '1px solid #C6E8DC',
            borderRadius: '12px',
            width: 220,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          },
        });

        flowEdges.push({
          id: 'e-mhet-mhetase',
          source: 'node-intermediate-mhet',
          target: 'node-catalyst-mhetase',
          animated: !isInactivated,
          style: { stroke: '#9785E8', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#9785E8' },
        });

        flowEdges.push({
          id: 'e-mhetase-final',
          source: 'node-catalyst-mhetase',
          target: 'node-final-monomers',
          animated: !isInactivated,
          style: { stroke: '#72C7B0', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#72C7B0' },
        });
      } else {
        flowNodes.push({
          id: 'node-minor-tpa',
          position: { x: 880, y: 50 },
          data: {
            label: (
              <div className="p-3.5 text-left">
                <div className="text-[10px] font-medium uppercase tracking-wider text-[#777780]">Intermediate Regime</div>
                <div className="text-xs font-semibold text-[#24242B] mt-0.5">MHET Accumulation</div>
                <div className="text-[11px] text-[#777780] font-mono mt-0.5">Without MHETase</div>
                <div className="mt-2 text-[10px] text-[#B47820] bg-[#FEF6EB] px-2 py-0.5 rounded border border-[#F6E1C4] font-medium">
                  Incomplete monomer conversion
                </div>
              </div>
            ),
          },
          style: {
            background: '#FFFFFF',
            border: '1px dashed #D0D0D8',
            borderRadius: '12px',
            width: 220,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          },
        });

        flowEdges.push({
          id: 'e-mhet-accum',
          source: 'node-intermediate-mhet',
          target: 'node-minor-tpa',
          animated: false,
          style: { stroke: '#A0A0A8', strokeDasharray: '4 4', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#A0A0A8' },
        });
      }
    }

    return { nodes: flowNodes, edges: flowEdges };
  }, [pathways, products, selectedComponents, overallStatus]);

  return (
    <div className="w-full h-80 rounded-2xl border border-[#E7E7EB] bg-[#FAFAFC] overflow-hidden relative">
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-full text-xs text-[#24242B] border border-[#E7E7EB] shadow-xs">
        <span className="w-2 h-2 rounded-full bg-[#72C7B0]"></span>
        <span className="font-medium text-[11px]">Enzymatic Cleavage Map (React Flow)</span>
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
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#E0E0E6" />
        <Controls />
      </ReactFlow>
    </div>
  );
};
