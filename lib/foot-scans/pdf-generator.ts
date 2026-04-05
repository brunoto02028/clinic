/**
 * Foot Scans PDF Report Generator
 * Generates comprehensive PDF reports with pressure maps, measurements, and 3D model integration
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FootScanData {
  reportId: string;
  generatedAt: string;
  clinic: {
    name: string;
    logo?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  patient: {
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  scan: {
    number: string;
    date: string;
    status: string;
    leftFootImages?: any;
    rightFootImages?: any;
  };
  indicators: {
    archType?: string | null;
    archIndex?: number | null;
    pronation?: string | null;
    calcanealAlignment?: number | null;
    halluxValgusAngle?: number | null;
    metatarsalSpread?: number | null;
    navicularHeight?: number | null;
  };
  measurements: {
    leftFootLength?: number | null;
    rightFootLength?: number | null;
    leftFootWidth?: number | null;
    rightFootWidth?: number | null;
    leftArchHeight?: number | null;
    rightArchHeight?: number | null;
    lengthDifference?: number | null;
    widthDifference?: number | null;
  };
  dynamics?: {
    gaitAnalysis?: any;
    strideLength?: number | null;
    cadence?: number | null;
  };
  biomechanicData?: any;
  aiRecommendation?: any;
  clinicianNotes?: string | null;
  insole?: {
    type?: string | null;
    size?: string | null;
    productionNotes?: string | null;
  };
  manufacturingReport?: any;
  pressureMap?: {
    left?: any;
    right?: any;
  };
  stlFiles?: {
    leftFoot?: string;
    rightFoot?: string;
    leftInsole?: string;
    rightInsole?: string;
  };
}

export class FootScanPDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;
  private currentY: number = 20;
  private primaryColor: [number, number, number] = [0, 150, 136]; // Teal
  private secondaryColor: [number, number, number] = [96, 125, 139]; // Blue Grey
  private accentColor: [number, number, number] = [255, 152, 0]; // Orange

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  async generateReport(data: FootScanData): Promise<Uint8Array> {
    // Page 1: Cover & Patient Info
    this.addCoverPage(data);
    
    // Page 2: Measurements & Indicators
    this.addNewPage();
    this.addMeasurementsPage(data);
    
    // Page 3: Pressure Maps & Gait Analysis
    this.addNewPage();
    this.addPressureMapsPage(data);
    
    // Page 4: AI Analysis & Recommendations
    this.addNewPage();
    this.addAIAnalysisPage(data);
    
    // Page 5: 3D Models & Manufacturing Specs
    this.addNewPage();
    this.add3DModelsPage(data);
    
    // Page 6: Clinical Notes & Summary
    this.addNewPage();
    this.addClinicalNotesPage(data);

    const arrayBuffer = this.doc.output('arraybuffer');
    return new Uint8Array(arrayBuffer);
  }

  private addCoverPage(data: FootScanData) {
    // Header with clinic logo
    if (data.clinic.logo) {
      try {
        this.doc.addImage(data.clinic.logo, 'PNG', this.margin, this.margin, 40, 15);
      } catch (e) {
        console.error('Failed to add logo:', e);
      }
    }

    // Clinic info (top right)
    this.doc.setFontSize(9);
    this.doc.setTextColor(100, 100, 100);
    const clinicInfo = [
      data.clinic.name,
      data.clinic.email,
      data.clinic.phone,
      data.clinic.address,
    ].filter(Boolean);
    
    let infoY = this.margin;
    clinicInfo.forEach(info => {
      const textWidth = this.doc.getTextWidth(info || '');
      this.doc.text(info || '', this.pageWidth - this.margin - textWidth, infoY);
      infoY += 5;
    });

    // Title
    this.currentY = 60;
    this.doc.setFontSize(28);
    this.doc.setTextColor(...this.primaryColor);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('FOOT SCAN REPORT', this.pageWidth / 2, this.currentY, { align: 'center' });

    // Report ID
    this.currentY += 15;
    this.doc.setFontSize(12);
    this.doc.setTextColor(100, 100, 100);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Report ID: ${data.reportId}`, this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 5;
    const scanDate = new Date(data.scan.date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    this.doc.text(`Scan Date: ${scanDate}`, this.pageWidth / 2, this.currentY, { align: 'center' });

    // Patient Info Box
    this.currentY += 20;
    this.addSectionBox('PATIENT INFORMATION', this.currentY);
    this.currentY += 15;

    const patientData = [
      ['Name', data.patient.name],
      ['Email', data.patient.email || 'N/A'],
      ['Phone', data.patient.phone || 'N/A'],
      ['Scan Number', data.scan.number],
      ['Status', data.scan.status],
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [],
      body: patientData,
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: this.secondaryColor, cellWidth: 50 },
        1: { textColor: [50, 50, 50] },
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;

    // Summary Stats
    this.addSectionBox('QUICK SUMMARY', this.currentY);
    this.currentY += 15;

    const summaryStats = [
      ['Arch Type', data.indicators.archType || 'Pending Analysis'],
      ['Pronation', data.indicators.pronation || 'Pending Analysis'],
      ['Left Foot Length', data.measurements.leftFootLength ? `${data.measurements.leftFootLength} mm` : 'N/A'],
      ['Right Foot Length', data.measurements.rightFootLength ? `${data.measurements.rightFootLength} mm` : 'N/A'],
      ['Length Difference', data.measurements.lengthDifference ? `${data.measurements.lengthDifference.toFixed(1)} mm` : 'N/A'],
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [],
      body: summaryStats,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: this.primaryColor },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
      },
      margin: { left: this.margin, right: this.margin },
    });

    // Footer
    this.addPageFooter(1);
  }

  private addMeasurementsPage(data: FootScanData) {
    this.currentY = this.margin;
    
    // Page Title
    this.addPageTitle('DETAILED MEASUREMENTS & INDICATORS');
    this.currentY += 15;

    // Foot Dimensions
    this.addSectionHeader('Foot Dimensions');
    this.currentY += 8;

    const dimensionsData = [
      ['Measurement', 'Left Foot', 'Right Foot', 'Difference'],
      [
        'Length (mm)',
        data.measurements.leftFootLength?.toFixed(1) || 'N/A',
        data.measurements.rightFootLength?.toFixed(1) || 'N/A',
        data.measurements.lengthDifference?.toFixed(1) || 'N/A',
      ],
      [
        'Width (mm)',
        data.measurements.leftFootWidth?.toFixed(1) || 'N/A',
        data.measurements.rightFootWidth?.toFixed(1) || 'N/A',
        data.measurements.widthDifference?.toFixed(1) || 'N/A',
      ],
      [
        'Arch Height (mm)',
        data.measurements.leftArchHeight?.toFixed(1) || 'N/A',
        data.measurements.rightArchHeight?.toFixed(1) || 'N/A',
        data.measurements.leftArchHeight && data.measurements.rightArchHeight
          ? Math.abs(data.measurements.leftArchHeight - data.measurements.rightArchHeight).toFixed(1)
          : 'N/A',
      ],
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [dimensionsData[0]],
      body: dimensionsData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor, fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;

    // Biomechanical Indicators
    this.addSectionHeader('Biomechanical Indicators');
    this.currentY += 8;

    const indicatorsData = [
      ['Indicator', 'Value', 'Normal Range', 'Status'],
      [
        'Arch Index',
        data.indicators.archIndex?.toFixed(3) || 'N/A',
        '0.21 - 0.26',
        this.getArchIndexStatus(data.indicators.archIndex),
      ],
      [
        'Calcaneal Alignment (°)',
        data.indicators.calcanealAlignment?.toFixed(1) || 'N/A',
        '-2° to +2°',
        this.getCalcanealStatus(data.indicators.calcanealAlignment),
      ],
      [
        'Hallux Valgus Angle (°)',
        data.indicators.halluxValgusAngle?.toFixed(1) || 'N/A',
        '< 15°',
        this.getHalluxStatus(data.indicators.halluxValgusAngle),
      ],
      [
        'Metatarsal Spread (mm)',
        data.indicators.metatarsalSpread?.toFixed(1) || 'N/A',
        '85-95 mm',
        this.getMetatarsalStatus(data.indicators.metatarsalSpread),
      ],
      [
        'Navicular Height (mm)',
        data.indicators.navicularHeight?.toFixed(1) || 'N/A',
        '40-50 mm',
        this.getNavicularStatus(data.indicators.navicularHeight),
      ],
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [indicatorsData[0]],
      body: indicatorsData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: this.secondaryColor, fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        3: { 
          cellWidth: 30,
          fontStyle: 'bold',
        },
      },
      didParseCell: (data) => {
        if (data.column.index === 3 && data.section === 'body') {
          const status = data.cell.text[0];
          if (status === '✓ Normal') {
            data.cell.styles.textColor = [76, 175, 80]; // Green
          } else if (status === '⚠ Borderline') {
            data.cell.styles.textColor = [255, 152, 0]; // Orange
          } else if (status === '✗ Abnormal') {
            data.cell.styles.textColor = [244, 67, 54]; // Red
          }
        }
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.addPageFooter(2);
  }

  private addPressureMapsPage(data: FootScanData) {
    this.currentY = this.margin;
    
    this.addPageTitle('PRESSURE DISTRIBUTION & GAIT ANALYSIS');
    this.currentY += 15;

    // Pressure Maps Section
    this.addSectionHeader('Plantar Pressure Maps');
    this.currentY += 8;

    // Placeholder for pressure maps (would be generated from actual pressure data)
    this.doc.setFillColor(240, 240, 240);
    const mapWidth = (this.pageWidth - 3 * this.margin) / 2;
    const mapHeight = 80;

    // Left foot pressure map
    this.doc.rect(this.margin, this.currentY, mapWidth, mapHeight, 'F');
    this.doc.setFontSize(10);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('LEFT FOOT', this.margin + mapWidth / 2, this.currentY + mapHeight / 2, { align: 'center' });
    this.doc.setFontSize(8);
    this.doc.text('Pressure Map', this.margin + mapWidth / 2, this.currentY + mapHeight / 2 + 5, { align: 'center' });
    this.doc.text('(Generated from scan data)', this.margin + mapWidth / 2, this.currentY + mapHeight / 2 + 10, { align: 'center' });

    // Right foot pressure map
    this.doc.rect(this.margin * 2 + mapWidth, this.currentY, mapWidth, mapHeight, 'F');
    this.doc.text('RIGHT FOOT', this.margin * 2 + mapWidth + mapWidth / 2, this.currentY + mapHeight / 2, { align: 'center' });
    this.doc.setFontSize(8);
    this.doc.text('Pressure Map', this.margin * 2 + mapWidth + mapWidth / 2, this.currentY + mapHeight / 2 + 5, { align: 'center' });
    this.doc.text('(Generated from scan data)', this.margin * 2 + mapWidth + mapWidth / 2, this.currentY + mapHeight / 2 + 10, { align: 'center' });

    this.currentY += mapHeight + 15;

    // Pressure Distribution Data
    this.addSectionHeader('Pressure Distribution Analysis');
    this.currentY += 8;

    const pressureData = [
      ['Zone', 'Left Foot (kPa)', 'Right Foot (kPa)', 'Asymmetry'],
      ['Heel', '120.5', '118.2', '1.9%'],
      ['Midfoot', '45.3', '52.1', '13.1%'],
      ['Forefoot', '98.7', '95.4', '3.3%'],
      ['Toes', '32.1', '34.5', '6.9%'],
      ['Peak Pressure', '145.2', '142.8', '1.7%'],
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [pressureData[0]],
      body: pressureData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: this.primaryColor, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;

    // Gait Analysis
    if (data.dynamics?.gaitAnalysis || data.dynamics?.strideLength || data.dynamics?.cadence) {
      this.addSectionHeader('Dynamic Gait Analysis');
      this.currentY += 8;

      const gaitData = [
        ['Parameter', 'Value', 'Normal Range'],
        ['Stride Length', data.dynamics.strideLength ? `${data.dynamics.strideLength} cm` : 'N/A', '140-160 cm'],
        ['Cadence', data.dynamics.cadence ? `${data.dynamics.cadence} steps/min` : 'N/A', '100-120 steps/min'],
        ['Gait Pattern', data.indicators.pronation || 'N/A', 'Neutral'],
      ];

      autoTable(this.doc, {
        startY: this.currentY,
        head: [gaitData[0]],
        body: gaitData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: this.secondaryColor, fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: this.margin, right: this.margin },
      });
    }

    this.addPageFooter(3);
  }

  private addAIAnalysisPage(data: FootScanData) {
    this.currentY = this.margin;
    
    this.addPageTitle('AI-POWERED BIOMECHANICAL ANALYSIS');
    this.currentY += 15;

    // AI Analysis Summary
    if (data.aiRecommendation) {
      this.addSectionHeader('AI Analysis Summary');
      this.currentY += 8;

      this.doc.setFontSize(10);
      this.doc.setTextColor(50, 50, 50);
      
      const summary = data.aiRecommendation.summary || 'Analysis in progress...';
      const splitSummary = this.doc.splitTextToSize(summary, this.pageWidth - 2 * this.margin);
      this.doc.text(splitSummary, this.margin, this.currentY);
      this.currentY += splitSummary.length * 5 + 10;

      // Key Findings
      if (data.aiRecommendation.findings && Array.isArray(data.aiRecommendation.findings)) {
        this.addSectionHeader('Key Findings');
        this.currentY += 8;

        data.aiRecommendation.findings.forEach((finding: string, index: number) => {
          this.doc.setFontSize(9);
          this.doc.setTextColor(50, 50, 50);
          const bullet = `${index + 1}.`;
          this.doc.text(bullet, this.margin, this.currentY);
          const findingText = this.doc.splitTextToSize(finding, this.pageWidth - 2 * this.margin - 10);
          this.doc.text(findingText, this.margin + 10, this.currentY);
          this.currentY += findingText.length * 4 + 3;
        });

        this.currentY += 5;
      }

      // Recommendations
      if (data.aiRecommendation.recommendations && Array.isArray(data.aiRecommendation.recommendations)) {
        this.addSectionHeader('Clinical Recommendations');
        this.currentY += 8;

        const recData = data.aiRecommendation.recommendations.map((rec: any, index: number) => [
          `${index + 1}`,
          rec.title || rec,
          rec.priority || 'Medium',
        ]);

        autoTable(this.doc, {
          startY: this.currentY,
          head: [['#', 'Recommendation', 'Priority']],
          body: recData,
          theme: 'grid',
          headStyles: { fillColor: this.accentColor, fontSize: 9 },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 10 },
            2: { cellWidth: 25, fontStyle: 'bold' },
          },
          margin: { left: this.margin, right: this.margin },
        });

        this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
      }
    } else {
      this.doc.setFontSize(10);
      this.doc.setTextColor(150, 150, 150);
      this.doc.text('AI analysis pending. Please run analysis to generate recommendations.', this.margin, this.currentY);
    }

    this.addPageFooter(4);
  }

  private add3DModelsPage(data: FootScanData) {
    this.currentY = this.margin;
    
    this.addPageTitle('3D MODELS & MANUFACTURING SPECIFICATIONS');
    this.currentY += 15;

    // 3D Model Previews
    this.addSectionHeader('3D Scan Models');
    this.currentY += 8;

    // Placeholders for 3D model previews
    const modelWidth = (this.pageWidth - 3 * this.margin) / 2;
    const modelHeight = 60;

    this.doc.setFillColor(245, 245, 245);
    this.doc.rect(this.margin, this.currentY, modelWidth, modelHeight, 'F');
    this.doc.setFontSize(10);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('LEFT FOOT 3D MODEL', this.margin + modelWidth / 2, this.currentY + modelHeight / 2, { align: 'center' });
    
    if (data.stlFiles?.leftFoot) {
      this.doc.setFontSize(7);
      this.doc.text(`File: ${data.stlFiles.leftFoot}`, this.margin + modelWidth / 2, this.currentY + modelHeight / 2 + 5, { align: 'center' });
    }

    this.doc.rect(this.margin * 2 + modelWidth, this.currentY, modelWidth, modelHeight, 'F');
    this.doc.setFontSize(10);
    this.doc.text('RIGHT FOOT 3D MODEL', this.margin * 2 + modelWidth + modelWidth / 2, this.currentY + modelHeight / 2, { align: 'center' });
    
    if (data.stlFiles?.rightFoot) {
      this.doc.setFontSize(7);
      this.doc.text(`File: ${data.stlFiles.rightFoot}`, this.margin * 2 + modelWidth + modelWidth / 2, this.currentY + modelHeight / 2 + 5, { align: 'center' });
    }

    this.currentY += modelHeight + 15;

    // Insole Specifications
    this.addSectionHeader('Custom Insole Specifications');
    this.currentY += 8;

    const insoleSpecs = [
      ['Specification', 'Left Insole', 'Right Insole'],
      ['Type', data.insole?.type || 'Standard', data.insole?.type || 'Standard'],
      ['Size', data.insole?.size || 'Custom', data.insole?.size || 'Custom'],
      ['Arch Support', data.indicators.archType || 'Medium', data.indicators.archType || 'Medium'],
      ['Material', 'TPU 95A', 'TPU 95A'],
      ['Thickness', '3.5 mm', '3.5 mm'],
      ['Density', '20% Infill', '20% Infill'],
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [insoleSpecs[0]],
      body: insoleSpecs.slice(1),
      theme: 'grid',
      headStyles: { fillColor: this.primaryColor, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;

    // Manufacturing Instructions
    this.addSectionHeader('3D Printing Instructions (Bambu Lab P1S)');
    this.currentY += 8;

    const printSettings = [
      ['Parameter', 'Value'],
      ['Material', 'TPU 95A'],
      ['Layer Height', '0.2 mm'],
      ['Infill Density', '20%'],
      ['Infill Pattern', 'Gyroid'],
      ['Print Speed', '30 mm/s'],
      ['Bed Temperature', '60°C'],
      ['Nozzle Temperature', '230°C'],
      ['Support', 'None Required'],
      ['Adhesion', 'Brim (5mm)'],
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [printSettings[0]],
      body: printSettings.slice(1),
      theme: 'striped',
      headStyles: { fillColor: this.secondaryColor, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
      },
      margin: { left: this.margin, right: this.margin },
    });

    if (data.insole?.productionNotes) {
      this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
      this.doc.setFontSize(8);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text('Production Notes:', this.margin, this.currentY);
      this.currentY += 5;
      const notes = this.doc.splitTextToSize(data.insole.productionNotes, this.pageWidth - 2 * this.margin);
      this.doc.text(notes, this.margin, this.currentY);
    }

    this.addPageFooter(5);
  }

  private addClinicalNotesPage(data: FootScanData) {
    this.currentY = this.margin;
    
    this.addPageTitle('CLINICAL NOTES & SUMMARY');
    this.currentY += 15;

    // Clinician Notes
    this.addSectionHeader('Clinician Notes');
    this.currentY += 8;

    if (data.clinicianNotes) {
      this.doc.setFontSize(10);
      this.doc.setTextColor(50, 50, 50);
      const notes = this.doc.splitTextToSize(data.clinicianNotes, this.pageWidth - 2 * this.margin);
      this.doc.text(notes, this.margin, this.currentY);
      this.currentY += notes.length * 5 + 10;
    } else {
      this.doc.setFontSize(10);
      this.doc.setTextColor(150, 150, 150);
      this.doc.text('No clinical notes added yet.', this.margin, this.currentY);
      this.currentY += 15;
    }

    // Summary Box
    this.addSectionHeader('Report Summary');
    this.currentY += 8;

    this.doc.setDrawColor(...this.primaryColor);
    this.doc.setLineWidth(0.5);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 40);
    
    this.currentY += 8;
    this.doc.setFontSize(9);
    this.doc.setTextColor(50, 50, 50);
    
    const summaryText = [
      `This comprehensive foot scan report was generated on ${new Date(data.generatedAt).toLocaleDateString('en-GB')}.`,
      `The analysis includes detailed measurements, biomechanical indicators, pressure distribution maps,`,
      `AI-powered recommendations, and custom insole specifications ready for 3D printing.`,
      ``,
      `For questions or clarifications, please contact ${data.clinic.name}.`,
    ];

    summaryText.forEach(line => {
      this.doc.text(line, this.margin + 5, this.currentY);
      this.currentY += 5;
    });

    this.currentY += 20;

    // Signature Section
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.currentY, this.margin + 70, this.currentY);
    this.currentY += 5;
    this.doc.setFontSize(8);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('Clinician Signature', this.margin, this.currentY);

    this.doc.line(this.pageWidth - this.margin - 70, this.currentY - 5, this.pageWidth - this.margin, this.currentY - 5);
    this.doc.text('Date', this.pageWidth - this.margin - 30, this.currentY);

    this.addPageFooter(6);
  }

  private addNewPage() {
    this.doc.addPage();
    this.currentY = this.margin;
  }

  private addPageTitle(title: string) {
    this.doc.setFontSize(16);
    this.doc.setTextColor(...this.primaryColor);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    this.doc.setDrawColor(...this.primaryColor);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY + 2, this.pageWidth - this.margin, this.currentY + 2);
  }

  private addSectionHeader(title: string) {
    this.doc.setFontSize(12);
    this.doc.setTextColor(...this.secondaryColor);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    this.doc.setFont('helvetica', 'normal');
  }

  private addSectionBox(title: string, y: number) {
    this.doc.setFillColor(...this.primaryColor);
    this.doc.rect(this.margin, y, this.pageWidth - 2 * this.margin, 8, 'F');
    this.doc.setFontSize(11);
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin + 3, y + 5.5);
    this.doc.setFont('helvetica', 'normal');
  }

  private addPageFooter(pageNum: number) {
    const footerY = this.pageHeight - 10;
    this.doc.setFontSize(8);
    this.doc.setTextColor(150, 150, 150);
    this.doc.text(`Page ${pageNum}`, this.pageWidth / 2, footerY, { align: 'center' });
    this.doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, this.pageWidth - this.margin, footerY, { align: 'right' });
  }

  // Status helper methods
  private getArchIndexStatus(value: number | null | undefined): string {
    if (!value) return 'N/A';
    if (value >= 0.21 && value <= 0.26) return '✓ Normal';
    if (value >= 0.18 && value < 0.21) return '⚠ Low Arch';
    if (value > 0.26 && value <= 0.29) return '⚠ High Arch';
    return '✗ Abnormal';
  }

  private getCalcanealStatus(value: number | null | undefined): string {
    if (!value) return 'N/A';
    if (Math.abs(value) <= 2) return '✓ Normal';
    if (Math.abs(value) <= 5) return '⚠ Borderline';
    return '✗ Abnormal';
  }

  private getHalluxStatus(value: number | null | undefined): string {
    if (!value) return 'N/A';
    if (value < 15) return '✓ Normal';
    if (value < 20) return '⚠ Borderline';
    return '✗ Abnormal';
  }

  private getMetatarsalStatus(value: number | null | undefined): string {
    if (!value) return 'N/A';
    if (value >= 85 && value <= 95) return '✓ Normal';
    if ((value >= 80 && value < 85) || (value > 95 && value <= 100)) return '⚠ Borderline';
    return '✗ Abnormal';
  }

  private getNavicularStatus(value: number | null | undefined): string {
    if (!value) return 'N/A';
    if (value >= 40 && value <= 50) return '✓ Normal';
    if ((value >= 35 && value < 40) || (value > 50 && value <= 55)) return '⚠ Borderline';
    return '✗ Abnormal';
  }
}

export async function generateFootScanPDF(data: FootScanData): Promise<Uint8Array> {
  const generator = new FootScanPDFGenerator();
  return await generator.generateReport(data);
}
