// Export-Funktionen für Dokumente

import * as XLSX from 'xlsx';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { Document, Content, TableEntry } from '../types';

// Tabelle als XLSX herunterladen
export const downloadAsXlsx = (
  document: Document,
  tableEntries: TableEntry[]
): void => {
  if (!document.table_schema || tableEntries.length === 0) return;

  const columns = document.table_schema.columns;
  
  // Header-Zeile
  const headers = columns.map(col => col.label);
  
  // Daten-Zeilen
  const rows = tableEntries.map(entry => 
    columns.map(col => {
      const val = entry.data[col.key];
      return val !== null && val !== undefined ? String(val) : '';
    })
  );

  // Worksheet erstellen
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Spaltenbreiten automatisch anpassen
  const colWidths = columns.map((col, i) => {
    const maxLen = Math.max(
      col.label.length,
      ...rows.map(row => (row[i] || '').length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws['!cols'] = colWidths;

  // Workbook erstellen und speichern
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, document.name.slice(0, 31));
  
  const filename = `${document.name.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, '')}.xlsx`;
  XLSX.writeFile(wb, filename);
};

// Text-Dokument als DOCX herunterladen
export const downloadAsDocx = async (
  document: Document,
  content: Content
): Promise<void> => {
  const text = content.content;
  const lines = text.split('\n');
  const children: Paragraph[] = [];

  for (const line of lines) {
    // Überschriften erkennen
    if (line.startsWith('### ')) {
      children.push(new Paragraph({
        text: line.replace('### ', ''),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 }
      }));
    } else if (line.startsWith('## ')) {
      children.push(new Paragraph({
        text: line.replace('## ', ''),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 280, after: 140 }
      }));
    } else if (line.startsWith('# ')) {
      children.push(new Paragraph({
        text: line.replace('# ', ''),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 320, after: 160 }
      }));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Aufzählungspunkte
      children.push(new Paragraph({
        children: [new TextRun(line.replace(/^[-*]\s/, '• '))],
        spacing: { before: 60, after: 60 }
      }));
    } else if (line.trim() === '') {
      // Leerzeile
      children.push(new Paragraph({ text: '' }));
    } else {
      // Normaler Text mit Fett/Kursiv parsen
      const runs: TextRun[] = [];
      let remaining = line;
      
      const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
      let lastIndex = 0;
      let match;
      
      while ((match = pattern.exec(remaining)) !== null) {
        if (match.index > lastIndex) {
          runs.push(new TextRun(remaining.slice(lastIndex, match.index)));
        }
        
        if (match[2]) {
          runs.push(new TextRun({ text: match[2], bold: true }));
        } else if (match[3]) {
          runs.push(new TextRun({ text: match[3], italics: true }));
        }
        
        lastIndex = match.index + match[0].length;
      }
      
      if (lastIndex < remaining.length) {
        runs.push(new TextRun(remaining.slice(lastIndex)));
      }
      
      children.push(new Paragraph({
        children: runs.length > 0 ? runs : [new TextRun(line)],
        spacing: { before: 60, after: 60 }
      }));
    }
  }

  const doc = new DocxDocument({
    sections: [{
      properties: {},
      children
    }]
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${document.name.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, '')}.docx`;
  saveAs(blob, filename);
};
