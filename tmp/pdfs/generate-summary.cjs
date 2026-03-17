const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', '..', 'output', 'pdf', 'expense-tracker-summary.pdf');

const pageWidth = 612; // 8.5in * 72
const pageHeight = 792; // 11in * 72
const marginX = 48;
const marginTop = 48;

function escapePdfString(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapText(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxChars) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const sections = [
  {
    heading: 'What It Is',
    body: [
      'A personal finance dashboard to record transactions, monitor monthly budget limits, and view spending insights in one place.'
    ]
  },
  {
    heading: "Who It's For",
    body: [
      'Individuals who want a lightweight way to track personal spending, budgets, and transaction history.'
    ]
  },
  {
    heading: 'What It Does',
    bullets: [
      'Dashboard with balance summary, spending trends, and budget progress.',
      'Quick actions to add balance, add expense, and update budget limits.',
      'Transaction management: list, filter, search, view detail, edit, and delete.',
      'CSV export for transactions.',
      'Reports with monthly, quarterly, and yearly insights plus end-of-month projection.',
      'Notifications for budget milestones and transaction activity.',
      'Optional demo seed data for realistic sample records.'
    ]
  },
  {
    heading: 'How It Works',
    body: [
      'Nuxt 4 (Vue 3) UI in app/pages and app/components consumes server API routes in server/api (home, transactions, auth, members, notifications).',
      'Server handlers use MongoDB via server/utils/mongodb.ts with runtime config from nuxt.config.ts. Data flows: UI -> /api endpoints -> MongoDB collections -> JSON responses.'
    ]
  },
  {
    heading: 'How To Run (Minimal)',
    bullets: [
      'Install Node.js 20.x and pnpm (or npm).',
      'Install dependencies: pnpm install.',
      'Copy .env.example to .env and set MONGODB_URI, MONGODB_DB, and MONGODB_DEFAULT_USER_ID.',
      'Start dev server: pnpm dev (app runs at http://localhost:3000).'
    ]
  }
];

let content = '';
const contentLines = [];

function addTextLine(text, font, size, x, y) {
  contentLines.push(`BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfString(text)}) Tj ET`);
}

const title = 'Expense Tracker - App Summary';

let y = pageHeight - marginTop - 10;
addTextLine(title, 'F2', 18, marginX, y);

y -= 28;

for (const section of sections) {
  addTextLine(section.heading, 'F2', 12, marginX, y);
  y -= 16;

  if (section.body) {
    for (const paragraph of section.body) {
      const lines = wrapText(paragraph, 95);
      for (const line of lines) {
        addTextLine(line, 'F1', 10, marginX, y);
        y -= 13;
      }
      y -= 6;
    }
  }

  if (section.bullets) {
    for (const bullet of section.bullets) {
      const lines = wrapText(`- ${bullet}`, 95);
      for (const line of lines) {
        addTextLine(line, 'F1', 10, marginX, y);
        y -= 13;
      }
    }
    y -= 6;
  }
}

content = contentLines.join('\n');

const objects = [];
objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
objects.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
objects.push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj');
objects.push('4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');
objects.push('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj');
objects.push(`6 0 obj << /Length ${Buffer.byteLength(content, 'utf8')} >> stream\n${content}\nendstream endobj`);

let pdf = '%PDF-1.4\n';
const xrefPositions = [0];
for (const obj of objects) {
  xrefPositions.push(Buffer.byteLength(pdf, 'utf8'));
  pdf += obj + '\n';
}

const xrefStart = Buffer.byteLength(pdf, 'utf8');
pdf += 'xref\n0 7\n';
pdf += '0000000000 65535 f \n';
for (let i = 1; i <= 6; i++) {
  const pos = String(xrefPositions[i]).padStart(10, '0');
  pdf += `${pos} 00000 n \n`;
}

pdf += `trailer << /Size 7 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

fs.writeFileSync(outputPath, pdf, 'binary');
console.log(`Wrote ${outputPath}`);
