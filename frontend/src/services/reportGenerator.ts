import { jsPDF } from 'jspdf';
import { ExperimentConfig, ScientificAssessmentResult } from '../types';

/**
 * Generates an authentic, structured scientific assessment PDF report
 * containing full metadata, thermodynamic scores, cleavage pathways,
 * literature citations, and boundary disclaimers.
 */
export function generateAssessmentPDF(
  config: ExperimentConfig,
  assessment: ScientificAssessmentResult
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = margin;
      drawPageHeader();
    }
  };

  const drawPageHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(151, 133, 232); // #9785E8
    doc.text('POLYPHAGE AI · SYNTHETIC BIOLOGY & ENZYMATIC DEPOLYMERIZATION', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(119, 119, 128);
    doc.text(`ID: ${assessment.experiment_id || config.id || 'N/A'}`, pageWidth - margin, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(231, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  // --- Document Header ---
  doc.setFillColor(250, 249, 253); // #FAF9FD
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
  doc.setDrawColor(213, 203, 247);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(36, 36, 43);
  doc.text('PolyPhage AI — Laboratory Assessment Report', margin + 4, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(119, 119, 128);
  doc.text(
    'Deterministic Reaction Modeling, Biochemical Viability & Intermediates Analysis',
    margin + 4,
    y + 13
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(116, 97, 206);
  doc.text(
    `Experiment ID: ${assessment.experiment_id || config.id || 'PET-20261107-001'}  |  Evaluated: ${new Date(assessment.timestamp).toUTCString()}`,
    margin + 4,
    y + 19
  );

  y += 28;

  // --- Experiment Overview & Score ---
  ensureSpace(32);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(231, 231, 235);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(36, 36, 43);
  doc.text(config.name, margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(119, 119, 128);
  const desc = config.description || 'Plastic enzymatic depolymerization reaction assessed under controlled environmental conditions.';
  const splitDesc = doc.splitTextToSize(desc, contentWidth - 48);
  doc.text(splitDesc.slice(0, 2), margin + 4, y + 11);

  // Score Box
  const scoreBoxX = pageWidth - margin - 40;
  const isOptimal = assessment.overall_score >= 80;
  const isSuboptimal = assessment.overall_score >= 50 && assessment.overall_score < 80;
  doc.setFillColor(isOptimal ? 232 : isSuboptimal ? 254 : 252, isOptimal ? 246 : isSuboptimal ? 246 : 238, isOptimal ? 241 : isSuboptimal ? 235 : 238);
  doc.setDrawColor(isOptimal ? 198 : isSuboptimal ? 246 : 248, isOptimal ? 232 : isSuboptimal ? 225 : 200, isOptimal ? 220 : isSuboptimal ? 196 : 200);
  doc.roundedRect(scoreBoxX, y + 2, 36, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(isOptimal ? 45 : isSuboptimal ? 180 : 196, isOptimal ? 138 : isSuboptimal ? 120 : 65, isOptimal ? 110 : isSuboptimal ? 32 : 65);
  doc.text(`${assessment.overall_score}/100`, scoreBoxX + 18, y + 10, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('COMPATIBILITY INDEX', scoreBoxX + 18, y + 14, { align: 'center' });
  doc.setFontSize(7);
  doc.text(assessment.overall_status.toUpperCase(), scoreBoxX + 18, y + 19, { align: 'center' });

  y += 30;

  // --- Executive Summary ---
  ensureSpace(24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(116, 97, 206);
  doc.text('1. EXECUTIVE SCIENTIFIC SUMMARY', margin, y);
  y += 4;

  doc.setFillColor(250, 249, 253);
  doc.setDrawColor(234, 229, 250);
  const summaryLines = doc.splitTextToSize(assessment.executive_summary, contentWidth - 8);
  const summaryBoxHeight = summaryLines.length * 3.8 + 6;
  doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(36, 36, 43);
  doc.text(summaryLines, margin + 4, y + 4.5);
  y += summaryBoxHeight + 5;

  // --- Operating Environment ---
  ensureSpace(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(116, 97, 206);
  doc.text('2. REACTION CONDITIONS & ENVIRONMENT', margin, y);
  y += 4;

  const env = config.environment;
  const envItems = [
    `Temperature: ${env.temperature_celsius}°C`,
    `pH: ${env.ph}`,
    `Oxygen: ${env.oxygen}`,
    `Salinity: ${env.salinity_percent}%`,
    `Pressure: ${env.pressure_atm || 1.0} atm`,
    `Duration: ${env.duration_hours}h`,
    `Agitation: ${env.agitation_rpm || 150} RPM`,
  ];

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(231, 231, 235);
  doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(36, 36, 43);
  const colWidth = contentWidth / 4;
  envItems.forEach((item, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    doc.text(item, margin + 3 + col * colWidth, y + 4.5 + row * 4.5);
  });
  y += 16;

  // --- Configured Components & Thermodynamic Viability ---
  ensureSpace(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(116, 97, 206);
  doc.text('3. COMPONENT ASSEMBLY & THERMODYNAMIC VIABILITY', margin, y);
  y += 4;

  assessment.component_assessments.forEach((ca) => {
    ensureSpace(16);
    doc.setFillColor(250, 250, 252);
    doc.setDrawColor(231, 231, 235);
    doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(36, 36, 43);
    doc.text(`${ca.name} (${ca.role.toUpperCase()})`, margin + 3, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(119, 119, 128);
    const conc = ca.concentration ? `Concentration: ${ca.concentration} (Non-Kinetic Record)` : 'Concentration: Unspecified';
    doc.text(conc, margin + 3, y + 8.5);

    const viabText = `Viability: ${ca.viability_status.toUpperCase()} | Temp: ${ca.temperature_assessment} | pH: ${ca.ph_assessment}`;
    const splitViab = doc.splitTextToSize(viabText, contentWidth - 6);
    doc.text(splitViab[0] || '', margin + 3, y + 12);

    y += 16;
  });
  y += 2;

  // --- Cleavage Pathway & Degradation Products ---
  ensureSpace(28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(116, 97, 206);
  doc.text('4. ENZYMATIC CLEAVAGE PATHWAY & DEGRADATION PRODUCTS', margin, y);
  y += 4;

  const pathwaysText = assessment.active_pathways.map(p => `• ${p.name}: ${p.description}`).join('\n');
  const splitPathways = doc.splitTextToSize(pathwaysText || 'No active cleavage pathway under current environmental conditions.', contentWidth - 6);
  const pathBoxH = Math.max(10, splitPathways.length * 3.5 + 4);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(231, 231, 235);
  doc.roundedRect(margin, y, contentWidth, pathBoxH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(36, 36, 43);
  doc.text(splitPathways, margin + 3, y + 4);
  y += pathBoxH + 4;

  // Products Table
  if (assessment.potential_products.length > 0) {
    ensureSpace(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(119, 119, 128);
    doc.text('Identified Cleavage Products & Intermediates:', margin, y);
    y += 3.5;

    assessment.potential_products.forEach(p => {
      ensureSpace(11);
      doc.setFillColor(250, 250, 252);
      doc.setDrawColor(231, 231, 235);
      doc.roundedRect(margin, y, contentWidth, 9, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(36, 36, 43);
      doc.text(`${p.name} [${p.formula}]`, margin + 3, y + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(119, 119, 128);
      const prodSub = `Stage: ${p.reaction_stage || 'monomer'} · Yield class: ${p.yield_classification || 'intermediate'} · Impact: ${p.biological_and_environmental_impact || 'Soluble metabolite'}`;
      doc.text(doc.splitTextToSize(prodSub, contentWidth - 6)[0], margin + 3, y + 7.5);
      y += 10.5;
    });
    y += 2;
  }

  // --- Published Literature Benchmarks ---
  if (assessment.experimental_reference_data_points.length > 0) {
    ensureSpace(26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(116, 97, 206);
    doc.text('5. AUTHENTIC LITERATURE BENCHMARKS & CITATIONS', margin, y);
    y += 4;

    assessment.experimental_reference_data_points.forEach(bm => {
      ensureSpace(14);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(231, 231, 235);
      doc.roundedRect(margin, y, contentWidth, 12, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(36, 36, 43);
      doc.text(`${bm.source} (DOI: ${bm.doi})`, margin + 3, y + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(119, 119, 128);
      const obs = `${bm.condition} | ${bm.reported_observation}`;
      doc.text(doc.splitTextToSize(obs, contentWidth - 6).slice(0, 2), margin + 3, y + 7.5);
      y += 13.5;
    });
    y += 2;
  }

  // --- Scientific Assumptions, Governance & LCA Disclaimers ---
  ensureSpace(34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(116, 97, 206);
  doc.text('6. SCIENTIFIC GOVERNANCE & COMPUTATIONAL LIMITATIONS', margin, y);
  y += 4;

  const disclaimerLines = [
    '• In Silico Rule-Based Modeling: Compatibility Index (0-100) is derived deterministically from published literature tolerance thresholds and catalytic boundaries. It represents theoretical biochemical viability, not an empirical wet-lab kinetics curve or synthetic yield calculation.',
    '• Non-Kinetic Concentration Record: Component concentrations are recorded for experimental protocol reproducibility. The current deterministic engine does not use concentration to calculate reaction velocity or Michaelis-Menten constants.',
    '• Life Cycle Assessment (LCA) System Boundary: Net greenhouse gas emissions or fossil fuel offsets are not modeled. Cradle-to-grave circularity depends on thermal process energy, enzyme expression burden, and downstream recovery efficiency.',
  ];

  const splitDisclaimers = doc.splitTextToSize(disclaimerLines.join('\n\n'), contentWidth - 6);
  const disclaimersH = splitDisclaimers.length * 3.2 + 6;

  doc.setFillColor(250, 249, 253);
  doc.setDrawColor(213, 203, 247);
  doc.roundedRect(margin, y, contentWidth, disclaimersH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(80, 80, 90);
  doc.text(splitDisclaimers, margin + 3, y + 4.5);
  y += disclaimersH + 6;

  // --- Page Numbering Footers ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 168);
    doc.text(
      `PolyPhage AI Confidential & Peer-Reviewed Science · Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Trigger browser download
  const sanitizedId = (assessment.experiment_id || config.id || 'Assessment').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`PolyPhage_Report_${sanitizedId}.pdf`);
}

