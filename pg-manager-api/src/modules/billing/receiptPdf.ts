import PDFDocument from 'pdfkit';

export interface ReceiptPdfData {
  receiptNumber: string;
  amount: number;
  issuedAt: string | Date;
  payment: {
    method: string;
    referenceNo?: string | null;
    paidAt?: string | Date | null;
    invoice?: {
      invoiceNumber: string;
      periodStart: string | Date;
      periodEnd: string | Date;
      tenant?: { name: string; phone: string; email?: string | null } | null;
      property?: { name: string; address: string } | null;
    } | null;
  } | null;
}

/**
 * Generate a professional PDF receipt and return it as a Buffer.
 */
export function generateReceiptPdf(data: ReceiptPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Receipt ${data.receiptNumber}`,
        Author: 'PG Manager',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const invoice = data.payment?.invoice;
    const tenant = invoice?.tenant;
    const property = invoice?.property;

    // ─── Header ───────────────────────────────────────────────────
    doc
      .fillColor('#1a56db')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('PG Manager', 50, 50);

    doc
      .fillColor('#6b7280')
      .fontSize(10)
      .font('Helvetica')
      .text('Hostel & PG Management', 50, 78);

    // Receipt badge on the right
    doc
      .fillColor('#1a56db')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('PAYMENT RECEIPT', 350, 50, { width: 200, align: 'right' });

    doc
      .fillColor('#374151')
      .fontSize(10)
      .font('Helvetica')
      .text(`#${data.receiptNumber}`, 350, 70, { width: 200, align: 'right' });

    doc
      .text(
        `Date: ${new Date(data.issuedAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}`,
        350,
        85,
        { width: 200, align: 'right' },
      );

    // ─── Divider ──────────────────────────────────────────────────
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(50, 110)
      .lineTo(545, 110)
      .stroke();

    let y = 130;

    // ─── Tenant & Property Info ───────────────────────────────────
    if (tenant || property) {
      doc.fillColor('#6b7280').fontSize(9).font('Helvetica-Bold');

      if (tenant) {
        doc.text('BILL TO', 50, y);
        y += 16;
        doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold').text(tenant.name, 50, y);
        y += 16;
        doc.fillColor('#6b7280').fontSize(10).font('Helvetica').text(tenant.phone, 50, y);
        y += 14;
        if (tenant.email) {
          doc.text(tenant.email, 50, y);
          y += 14;
        }
      }

      if (property) {
        const propY = tenant ? 130 : y;
        doc.fillColor('#6b7280').fontSize(9).font('Helvetica-Bold').text('PROPERTY', 350, propY, { width: 200, align: 'right' });
        doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold').text(property.name, 350, propY + 16, { width: 200, align: 'right' });
        doc.fillColor('#6b7280').fontSize(10).font('Helvetica').text(property.address, 350, propY + 32, { width: 200, align: 'right' });
      }

      y = Math.max(y, 190);
    }

    // ─── Payment Details Table ────────────────────────────────────
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(50, y)
      .lineTo(545, y)
      .stroke();

    y += 15;

    // Table header
    doc.fillColor('#6b7280').fontSize(9).font('Helvetica-Bold');
    doc.text('DESCRIPTION', 50, y);
    doc.text('DETAILS', 350, y, { width: 195, align: 'right' });
    y += 20;

    doc
      .strokeColor('#f3f4f6')
      .lineWidth(0.5)
      .moveTo(50, y)
      .lineTo(545, y)
      .stroke();

    y += 10;

    // Rows
    const rows: [string, string][] = [];

    if (invoice) {
      rows.push(['Invoice', invoice.invoiceNumber]);
      rows.push([
        'Period',
        `${new Date(invoice.periodStart).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} – ${new Date(invoice.periodEnd).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`,
      ]);
    }

    rows.push(['Payment Method', (data.payment?.method || 'N/A').replace('_', ' ').toUpperCase()]);

    if (data.payment?.referenceNo) {
      rows.push(['Reference No.', data.payment.referenceNo]);
    }

    if (data.payment?.paidAt) {
      rows.push([
        'Paid On',
        new Date(data.payment.paidAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      ]);
    }

    doc.fillColor('#374151').fontSize(10).font('Helvetica');
    for (const [label, value] of rows) {
      doc.text(label, 50, y);
      doc.font('Helvetica-Bold').text(value, 350, y, { width: 195, align: 'right' });
      doc.font('Helvetica');
      y += 22;
    }

    y += 5;
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(50, y)
      .lineTo(545, y)
      .stroke();

    y += 15;

    // ─── Total Amount ─────────────────────────────────────────────
    doc
      .fillColor('#6b7280')
      .fontSize(12)
      .font('Helvetica')
      .text('Total Paid', 50, y);

    doc
      .fillColor('#1a56db')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(`₹${Number(data.amount).toLocaleString('en-IN')}`, 350, y - 4, {
        width: 195,
        align: 'right',
      });

    y += 40;

    // ─── Status badge ─────────────────────────────────────────────
    const badgeWidth = 80;
    const badgeX = 50;
    doc
      .roundedRect(badgeX, y, badgeWidth, 24, 4)
      .fill('#dcfce7');

    doc
      .fillColor('#166534')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('PAID', badgeX, y + 6, { width: badgeWidth, align: 'center' });

    y += 50;

    // ─── Footer ───────────────────────────────────────────────────
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(0.5)
      .moveTo(50, y)
      .lineTo(545, y)
      .stroke();

    y += 15;

    doc
      .fillColor('#9ca3af')
      .fontSize(9)
      .font('Helvetica')
      .text(
        'This is a system-generated receipt. No signature required.',
        50,
        y,
        { width: 495, align: 'center' },
      );

    doc
      .text(
        `Generated by PG Manager on ${new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}`,
        50,
        y + 16,
        { width: 495, align: 'center' },
      );

    doc.end();
  });
}
