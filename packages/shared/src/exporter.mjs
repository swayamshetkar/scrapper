import fs from 'fs';
import path from 'path';

export async function exportLeads(leads, format = 'json', exportDir = 'exports') {
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  if (format === 'json') {
    const filename = path.join(exportDir, `leads-${timestamp}.json`);
    fs.writeFileSync(filename, JSON.stringify(leads, null, 2), 'utf-8');
    return filename;
  }
  
  if (format === 'csv') {
    const filename = path.join(exportDir, `leads-${timestamp}.csv`);
    // Basic CSV converter
    const headers = ['Business Name', 'Category', 'City', 'Phone', 'Website', 'Need Detected', 'Confidence', 'Angle'];
    const rows = leads.map(l => {
      const primaryNeed = l.needs && l.needs.length > 0 ? l.needs[0] : null;
      return [
        `"${l.business_name || ''}"`,
        `"${l.category || ''}"`,
        `"${l.city || ''}"`,
        `"${l.phone || ''}"`,
        `"${l.website || ''}"`,
        `"${primaryNeed?.service || ''}"`,
        `"${primaryNeed?.confidence || ''}"`,
        `"${primaryNeed?.angle || ''}"`
      ].join(',');
    });
    
    fs.writeFileSync(filename, [headers.join(','), ...rows].join('\n'), 'utf-8');
    return filename;
  }
  
  throw new Error(`Unsupported export format: ${format}`);
}
