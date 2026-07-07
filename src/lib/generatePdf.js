import jsPDF from 'jspdf';

export async function generateContractPdf(canvasDataUrl) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [855, 1268],
    compress: true,
  });
  pdf.addImage(canvasDataUrl, 'PNG', 0, 0, 855, 1268);
  return pdf.output('blob');
}
