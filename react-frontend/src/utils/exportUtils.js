/**
 * exportUtils.js
 * Helper utilities to export filtered data to CSV or Print/PDF on both Mobile & Desktop.
 */

export const exportToCSV = (data, filename = 'export.csv', customHeaders = null) => {
  if (!data || !data.length) {
    alert("No data available to export.");
    return;
  }

  // Determine headers
  const keys = customHeaders ? Object.keys(customHeaders) : Object.keys(data[0]);
  const headerRow = customHeaders ? Object.values(customHeaders).join(',') : keys.join(',');

  const csvRows = [];
  csvRows.push(headerRow);

  data.forEach(row => {
    const values = keys.map(key => {
      let val = row[key];
      if (val === null || val === undefined) {
        val = '';
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      } else {
        val = String(val);
      }
      // Escape double quotes and wrap in quotes if contains commas or newlines
      val = val.replace(/"/g, '""');
      if (val.includes(',') || val.includes('\n') || val.includes('"')) {
        val = `"${val}"`;
      }
      return val;
    });
    csvRows.push(values.join(','));
  });

  const csvString = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const printPDF = (data, title = 'Store Report', columns = []) => {
  if (!data || !data.length) {
    alert("No data available to print.");
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Please allow popups to print/export PDF.");
    return;
  }

  const cols = columns.length ? columns : Object.keys(data[0]).map(k => ({ field: k, headerName: k }));

  // Compute summary stats
  const totalArrQty = data.reduce((sum, r) => sum + (parseFloat(r.arrivalQty || r.arrivalQuantity || 0)), 0);
  const totalOutQty = data.reduce((sum, r) => sum + (parseFloat(r.outQty || r.outgoingQuantity || 0)), 0);
  const inEntries = data.filter(r => (r.type && r.type.includes('IN')) || (parseFloat(r.arrivalQty || 0) > 0 && !parseFloat(r.outQty || 0))).length;
  const outEntries = data.length - inEntries;

  let tableHeaderHtml = '<tr>' + cols.map(c => `<th style="border: 1px solid #cbd5e1; padding: 7px 9px; background-color: #0f172a; color: #ffffff; text-align: left; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px;">${c.headerName}</th>`).join('') + '</tr>';

  let tableBodyHtml = data.map((row, idx) => {
    const isOutRow = (row.type && row.type.includes('OUT')) || parseFloat(row.outQty || 0) > 0;
    const bg = isOutRow ? '#fff7ed' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc');

    return `<tr style="background-color: ${bg};">` + cols.map(c => {
      let val = row[c.field];
      if (val === null || val === undefined) val = '';

      // Format Type badge
      if (c.field === 'type') {
        const isIn = String(val).includes('IN');
        val = `<span style="display: inline-block; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 0.72rem; color: ${isIn ? '#15803d' : '#c2410c'}; background-color: ${isIn ? '#dcfce7' : '#ffedd5'}; border: 1px solid ${isIn ? '#bbf7d0' : '#fed7aa'};">${val}</span>`;
      }

      // Format Status badge (YES / NO)
      if (c.field === 'status' || c.field === 'available') {
        const isYes = String(val).toUpperCase() === 'YES';
        val = `<span style="display: inline-block; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 0.72rem; color: ${isYes ? '#166534' : '#991b1b'}; background-color: ${isYes ? '#dcfce7' : '#fee2e2'}; border: 1px solid ${isYes ? '#86efac' : '#fca5a5'};">${isYes ? 'YES (IN STOCK)' : 'NO (OUT OF STOCK)'}</span>`;
      }

      return `<td style="border: 1px solid #e2e8f0; padding: 6px 9px; color: #1e293b; font-size: 0.78rem;">${val}</td>`;
    }).join('') + '</tr>';
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 15px; color: #0f172a; }
          .header-box { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; }
          h2 { color: #0f172a; margin: 0; font-size: 1.3rem; font-weight: bold; }
          .date { color: #64748b; font-size: 0.75rem; margin-top: 4px; }
          .summary-bar { display: flex; gap: 15px; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 0.78rem; font-weight: 600; color: #334155; border: 1px solid #e2e8f0; }
          .summary-item { display: flex; gap: 4px; align-items: center; }
          .summary-val { color: #0284c7; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 5px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 12px;">
          <button onclick="window.print()" style="padding: 8px 18px; background: #0284c7; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 0.85rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">🖨️ Print / Save as PDF</button>
        </div>
        <div class="header-box">
          <div>
            <h2>${title}</h2>
            <div class="date">Generated on: ${new Date().toLocaleString()} | Finsen Store Inventory System</div>
          </div>
        </div>

        <div class="summary-bar">
          <div class="summary-item">Total Records: <span class="summary-val">${data.length}</span></div>
          <div class="summary-item">📥 Arrivals (IN): <span class="summary-val" style="color: #16a34a;">${inEntries} (Total Qty: ${totalArrQty})</span></div>
          <div class="summary-item">📤 Issues (OUT): <span class="summary-val" style="color: #ea580c;">${outEntries} (Total Qty: ${totalOutQty})</span></div>
        </div>

        <table>
          <thead>${tableHeaderHtml}</thead>
          <tbody>${tableBodyHtml}</tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
