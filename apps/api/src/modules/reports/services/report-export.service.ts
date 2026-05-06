import { Injectable } from '@nestjs/common';
import { ReportColumnDef } from '../entities/report-template.entity';
import { ExportFormat } from '../entities/report-execution.entity';

@Injectable()
export class ReportExportService {

  async generate(
    format: ExportFormat,
    columns: ReportColumnDef[],
    rows: Record<string, any>[],
    reportName: string,
  ): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
    switch (format) {
      case ExportFormat.CSV:  return this.toCsv(columns, rows);
      case ExportFormat.XLSX: return this.toXlsx(columns, rows, reportName);
      case ExportFormat.PDF:  return this.toPdf(columns, rows, reportName);
    }
  }

  // ─── CSV ──────────────────────────────────────────────────────────────────
  private toCsv(columns: ReportColumnDef[], rows: Record<string, any>[]) {
    const header = columns.map((c) => `"${c.label}"`).join(',');
    const body   = rows.map((row) =>
      columns.map((c) => {
        const v = this.fmt(row[c.key], c.type);
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(','),
    );
    const csv = [header, ...body].join('\r\n');
    return {
      buffer:    Buffer.from('\uFEFF' + csv, 'utf8'),
      mimeType:  'text/csv',
      extension: 'csv',
    };
  }

  // ─── XLSX (minimal OOXML — no external lib) ───────────────────────────────
  private toXlsx(columns: ReportColumnDef[], rows: Record<string, any>[], name: string) {
    // Build a minimal .xlsx using raw OOXML + zip
    const sheetRows: string[] = [];

    // Header row
    const headerCells = columns.map((c, i) =>
      `<c r="${this.colLetter(i)}1" t="inlineStr"><is><t>${this.escXml(c.label)}</t></is></c>`,
    ).join('');
    sheetRows.push(`<row r="1">${headerCells}</row>`);

    // Data rows
    rows.forEach((row, ri) => {
      const cells = columns.map((c, ci) => {
        const v   = this.fmt(row[c.key], c.type);
        const ref = `${this.colLetter(ci)}${ri + 2}`;
        const isNum = ['number', 'currency', 'percent'].includes(c.type) && !isNaN(Number(row[c.key]));
        if (isNum) return `<c r="${ref}"><v>${Number(row[c.key]) || 0}</v></c>`;
        return `<c r="${ref}" t="inlineStr"><is><t>${this.escXml(String(v))}</t></is></c>`;
      }).join('');
      sheetRows.push(`<row r="${ri + 2}">${cells}</row>`);
    });

    const sheetXml = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${sheetRows.join('')}</sheetData>
</worksheet>`;

    const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${this.escXml(name.slice(0,31))}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml"  ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

    const topRels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const buffer = this.buildZip([
      { name: '[Content_Types].xml',          data: contentTypesXml },
      { name: '_rels/.rels',                  data: topRels         },
      { name: 'xl/workbook.xml',              data: workbookXml     },
      { name: 'xl/_rels/workbook.xml.rels',   data: relsXml         },
      { name: 'xl/worksheets/sheet1.xml',     data: sheetXml        },
    ]);

    return {
      buffer,
      mimeType:  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
    };
  }

  // ─── PDF — gera PDF v1.4 válido com offsets calculados dinamicamente ────
  private toPdf(columns: ReportColumnDef[], rows: Record<string, any>[], name: string) {
    const lines: string[] = [];

    // Escapa caracteres especiais do PDF
    const esc = (s: string) =>
      String(s)
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/[^\x20-\x7E]/g, '?'); // substitui não-ASCII por ?

    // Cabeçalho
    lines.push(esc(name));
    lines.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
    lines.push(`Total de registros: ${rows.length}`);
    lines.push('');

    // Header da tabela
    const colW = 24;
    lines.push(columns.map((c) => esc(c.label).slice(0, colW - 1).padEnd(colW)).join(''));
    lines.push('-'.repeat(columns.length * colW));

    // Linhas de dados
    rows.slice(0, 500).forEach((row) => {
      lines.push(
        columns
          .map((c) => esc(String(this.fmt(row[c.key], c.type))).slice(0, colW - 1).padEnd(colW))
          .join(''),
      );
    });

    if (rows.length > 500) {
      lines.push('');
      lines.push(`... e mais ${rows.length - 500} registros. Use XLSX para exportar tudo.`);
    }

    // Monta stream de conteúdo PDF
    const fontSize  = 8;
    const lineH     = 11;
    const marginX   = 30;
    const pageH     = 842; // A4 landscape height in points
    const pageW     = 595;
    const startY    = pageH - 40;

    const contentLines: string[] = [`BT`, `/F1 ${fontSize} Tf`, `${marginX} ${startY} Td`, `${lineH} TL`];
    for (const line of lines) {
      contentLines.push(`(${line}) Tj T*`);
    }
    contentLines.push('ET');
    const stream = contentLines.join('\n');
    const streamLen = Buffer.byteLength(stream, 'latin1');

    // Monta objetos PDF e calcula offsets reais
    const obj1 = '1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n';
    const obj2 = '2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n';
    const obj3 = `3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources <</Font <</F1 <</Type /Font /Subtype /Type1 /BaseFont /Courier>>>>>>>>\nendobj\n`;
    const obj4 = `4 0 obj\n<</Length ${streamLen}>>\nstream\n${stream}\nendstream\nendobj\n`;

    const header   = '%PDF-1.4\n';
    const off1     = header.length;
    const off2     = off1 + obj1.length;
    const off3     = off2 + obj2.length;
    const off4     = off3 + obj3.length;
    const xrefPos  = off4 + obj4.length;

    const pad = (n: number) => String(n).padStart(10, '0');

    const xref = [
      'xref',
      '0 5',
      `0000000000 65535 f `,
      `${pad(off1)} 00000 n `,
      `${pad(off2)} 00000 n `,
      `${pad(off3)} 00000 n `,
      `${pad(off4)} 00000 n `,
    ].join('\n');

    const trailer = `\ntrailer\n<</Size 5 /Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF`;

    const pdf = header + obj1 + obj2 + obj3 + obj4 + xref + trailer;

    return {
      buffer:    Buffer.from(pdf, 'latin1'),
      mimeType:  'application/pdf',
      extension: 'pdf',
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private fmt(value: any, type: ReportColumnDef['type']): string | number {
    if (value === null || value === undefined) return '';
    switch (type) {
      case 'currency':
        return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      case 'number':
      case 'percent':
        return Number(value);
      case 'date':
        return value ? new Date(value).toLocaleDateString('pt-BR') : '';
      case 'datetime':
        return value ? new Date(value).toLocaleString('pt-BR') : '';
      default:
        return String(value);
    }
  }

  private escXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private colLetter(i: number): string {
    let s = '';
    i++;
    while (i > 0) {
      s = String.fromCharCode(64 + (i % 26 || 26)) + s;
      i = Math.floor((i - 1) / 26);
    }
    return s;
  }

  // Minimal ZIP builder (store method — no compression, pure Node.js)
  private buildZip(files: { name: string; data: string }[]): Buffer {
    const enc     = (s: string) => Buffer.from(s, 'utf8');
    const parts:  Buffer[] = [];
    const central: Buffer[] = [];
    let   offset  = 0;

    for (const file of files) {
      const nameB = enc(file.name);
      const dataB = enc(file.data);
      const crc   = this.crc32(dataB);

      // Local file header
      const local = Buffer.alloc(30 + nameB.length);
      local.writeUInt32LE(0x04034b50, 0);  // signature
      local.writeUInt16LE(20, 4);           // version needed
      local.writeUInt16LE(0, 6);            // flags
      local.writeUInt16LE(0, 8);            // compression (store)
      local.writeUInt16LE(0, 10);           // mod time
      local.writeUInt16LE(0, 12);           // mod date
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(dataB.length, 18);
      local.writeUInt32LE(dataB.length, 22);
      local.writeUInt16LE(nameB.length, 26);
      local.writeUInt16LE(0, 28);
      nameB.copy(local, 30);

      parts.push(local, dataB);

      // Central directory entry
      const cent = Buffer.alloc(46 + nameB.length);
      cent.writeUInt32LE(0x02014b50, 0);
      cent.writeUInt16LE(20, 4);
      cent.writeUInt16LE(20, 6);
      cent.writeUInt16LE(0, 8);
      cent.writeUInt16LE(0, 10);
      cent.writeUInt16LE(0, 12);
      cent.writeUInt16LE(0, 14);
      cent.writeUInt32LE(crc, 16);
      cent.writeUInt32LE(dataB.length, 20);
      cent.writeUInt32LE(dataB.length, 24);
      cent.writeUInt16LE(nameB.length, 28);
      cent.writeUInt16LE(0, 30);
      cent.writeUInt16LE(0, 32);
      cent.writeUInt16LE(0, 34);
      cent.writeUInt16LE(0, 36);
      cent.writeUInt32LE(0, 38);
      cent.writeUInt32LE(offset, 42);
      nameB.copy(cent, 46);
      central.push(cent);

      offset += local.length + dataB.length;
    }

    const centralBuf  = Buffer.concat(central);
    const eocd        = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(files.length, 8);
    eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(centralBuf.length, 12);
    eocd.writeUInt32LE(offset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...parts, centralBuf, eocd]);
  }

  private crc32(buf: Buffer): number {
    const table = this.crcTable();
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private crcTable(): number[] {
    const t: number[] = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  }
}
