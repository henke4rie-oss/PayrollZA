/*
"""
Smart Spreadsheet & CSV Importer for South African Payroll
Ported and enhanced from PayrollZA importer_47ad4bdf.py.
Heuristically detects columns from actual cell data rather than relying strictly on headers:
- 13 digits -> RSA ID number
- Number under 100 -> Age
- Number 100+ -> Salary (handles 'R', 'Rand', commas, spaces)
- Letters & digits -> Employee ID
- Pure text -> Name / Surname
Designed for messy farmer & small business spreadsheets.
"""
*/

import { validateSouthAfricanId } from './taxEngine';

export type DetectedColumnType = 'name' | 'surname' | 'rsa_id' | 'employee_id' | 'age' | 'salary' | 'unknown';

export interface ColumnDetection {
  index: number;
  detectedType: DetectedColumnType;
  assignedType: DetectedColumnType;
  sampleValues: string[];
  confidence: number;
}

export interface ParsedEmployeeRow {
  rowNumber: number;
  fullName: string;
  employeeNumber: string;
  idNumber: string;
  age: number;
  grossSalary: number;
  isValid: boolean;
  validationErrors: string[];
  warnings: string[];
  rawData: string[];
}

// Parses raw CSV text into a 2D array of string cells.
// Accurately handles quoted fields containing commas, line breaks, and whitespace.
export function parseCsvText(csvContent: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Checks if the first row is likely a header row by checking for common SA payroll keywords.
export function detectHeaderRow(rows: string[][]): boolean {
  if (rows.length === 0) return false;
  const headerKeywords = [
    'name', 'surname', 'first', 'last', 'employee', 'emp',
    'salary', 'wage', 'pay', 'gross', 'income', 'remuneration',
    'age', 'id', 'identity', 'rsa', 'number', 'no', 'code',
  ];

  const firstRow = rows[0];
  let matches = 0;
  for (const cell of firstRow) {
    const lower = cell.toLowerCase();
    if (headerKeywords.some((k) => lower.includes(k))) {
      matches++;
    }
  }
  return matches >= Math.max(1, Math.floor(firstRow.length / 2));
}

// Classifies an individual value using heuristic payroll rules.
export function classifyCellValue(value: string): DetectedColumnType {
  if (!value) return 'unknown';

  const cleaned = value.replace(/[\s,]/g, '');

  // # Rule 1: Exactly 13 digits -> RSA ID Number
  if (/^\d{13}$/.test(cleaned)) {
    return 'rsa_id';
  }

  // # Clean currency prefixes common in SA: R, Rand, ZAR
  const numStr = cleaned.replace(/^[Rr](?:and)?|^ZAR/i, '');
  const parsedNum = parseFloat(numStr);

  if (!isNaN(parsedNum)) {
    // # Rule 2: Integer between 16 and 99 -> Age
    if (Number.isInteger(parsedNum) && parsedNum >= 16 && parsedNum <= 99) {
      return 'age';
    }
    // # Rule 3: Number >= 100 -> Monthly salary/wage
    if (parsedNum >= 100) {
      return 'salary';
    }
  }

  // # Rule 4: Mix of letters and numbers -> Employee code (e.g. EMP001, VAN02)
  const hasLetters = /[a-zA-Z]/.test(value);
  const hasDigits = /\d/.test(value);
  if (hasLetters && hasDigits) {
    return 'employee_id';
  }

  // # Rule 5: Pure text -> Name or surname
  if (hasLetters && !hasDigits) {
    return 'name';
  }

  return 'unknown';
}

// Analyzes every column across all rows to determine the most statistically probable column type.
export function detectColumns(dataRows: string[][]): ColumnDetection[] {
  if (dataRows.length === 0) return [];
  const maxCols = Math.max(...dataRows.map((r) => r.length));
  const columns: ColumnDetection[] = [];

  for (let colIdx = 0; colIdx < maxCols; colIdx++) {
    const values: string[] = [];
    for (const row of dataRows) {
      if (colIdx < row.length && row[colIdx]) {
        values.push(row[colIdx].trim());
      }
    }

    if (values.length === 0) {
      columns.push({
        index: colIdx,
        detectedType: 'unknown',
        assignedType: 'unknown',
        sampleValues: [],
        confidence: 0,
      });
      continue;
    }

    const typeCounts: Record<DetectedColumnType, number> = {
      name: 0,
      surname: 0,
      rsa_id: 0,
      employee_id: 0,
      age: 0,
      salary: 0,
      unknown: 0,
    };

    for (const val of values) {
      const type = classifyCellValue(val);
      typeCounts[type]++;
    }

    // Pick top non-unknown type
    let bestType: DetectedColumnType = 'unknown';
    let maxCount = 0;
    (Object.keys(typeCounts) as DetectedColumnType[]).forEach((type) => {
      if (type !== 'unknown' && typeCounts[type] > maxCount) {
        bestType = type;
        maxCount = typeCounts[type];
      }
    });

    const confidence = Math.round((maxCount / values.length) * 100);

    columns.push({
      index: colIdx,
      detectedType: bestType,
      assignedType: bestType,
      sampleValues: values.slice(0, 3),
      confidence,
    });
  }

  // # If multiple NAME columns detected, mark the second one as SURNAME
  const nameCols = columns.filter((c) => c.detectedType === 'name');
  if (nameCols.length >= 2) {
    nameCols[1].detectedType = 'surname';
    nameCols[1].assignedType = 'surname';
  }

  return columns;
}

// Converts parsed rows into verified employee records based on confirmed column mapping.
export function buildEmployeesFromRows(
  dataRows: string[][],
  columns: ColumnDetection[],
  companyPrefix: string = 'EMP'
): ParsedEmployeeRow[] {
  const typeToIndex = new Map<DetectedColumnType, number>();
  columns.forEach((col) => {
    if (col.assignedType !== 'unknown') {
      typeToIndex.set(col.assignedType, col.index);
    }
  });

  const nameIdx = typeToIndex.get('name');
  const surnameIdx = typeToIndex.get('surname');
  const idIdx = typeToIndex.get('rsa_id');
  const empIdIdx = typeToIndex.get('employee_id');
  const ageIdx = typeToIndex.get('age');
  const salaryIdx = typeToIndex.get('salary');

  const results: ParsedEmployeeRow[] = [];

  dataRows.forEach((row, rowIdx) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let fullName = '';
    let employeeNumber = '';
    let idNumber = '';
    let age = 0;
    let grossSalary = 0;

    // # Name extraction
    if (nameIdx !== undefined && nameIdx < row.length) {
      fullName = row[nameIdx] || '';
      if (surnameIdx !== undefined && surnameIdx < row.length && row[surnameIdx]) {
        fullName = `${fullName} ${row[surnameIdx]}`.trim();
      }
    }
    if (!fullName) {
      errors.push('Missing employee name');
    }

    // # RSA ID Number extraction & validation
    if (idIdx !== undefined && idIdx < row.length) {
      idNumber = (row[idIdx] || '').replace(/\s+/g, '');
      if (idNumber) {
        const idCheck = validateSouthAfricanId(idNumber);
        if (idCheck.isValid && idCheck.age) {
          age = idCheck.age; // Auto-derive precise age from RSA ID if available
        } else if (idCheck.error) {
          // Advisory warning only (doesn't block import)
          warnings.push(`ID Notice: ${idCheck.error}`);
        }
      }
    }

    // # Age extraction fallback
    if (age === 0 && ageIdx !== undefined && ageIdx < row.length) {
      const parsedAge = parseInt((row[ageIdx] || '').replace(/\D/g, ''), 10);
      if (!isNaN(parsedAge) && parsedAge >= 16 && parsedAge <= 100) {
        age = parsedAge;
      }
    }
    if (age < 16) {
      age = 30; // Reasonable fallback if not detected
    }

    // # Salary extraction
    if (salaryIdx !== undefined && salaryIdx < row.length) {
      const cleanSal = (row[salaryIdx] || '').replace(/[^\d.]/g, '');
      const parsedSal = parseFloat(cleanSal);
      if (!isNaN(parsedSal) && parsedSal >= 0) {
        grossSalary = parsedSal;
      } else {
        errors.push('Invalid salary amount');
      }
    } else {
      errors.push('No salary column assigned');
    }

    // # Employee ID extraction or auto-generation
    if (empIdIdx !== undefined && empIdIdx < row.length && row[empIdIdx]) {
      employeeNumber = row[empIdIdx].trim();
    } else {
      const cleanPrefix = companyPrefix.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'EMP';
      employeeNumber = `${cleanPrefix}${String(rowIdx + 1).padStart(3, '0')}`;
    }

    results.push({
      rowNumber: rowIdx + 1,
      fullName,
      employeeNumber,
      idNumber,
      age,
      grossSalary,
      isValid: errors.length === 0,
      validationErrors: errors,
      warnings,
      rawData: row,
    });
  });

  return results;
}
