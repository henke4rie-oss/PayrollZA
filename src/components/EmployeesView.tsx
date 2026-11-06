/*
"""
Employees Management & Smart Spreadsheet Importer
Features:
1. Employee Directory with POPIA data masking (toggle mask for RSA IDs and bank accounts)
2. Add / Edit Employee modal with real-time RSA ID Luhn checksum validation & auto age extraction
3. Smart Spreadsheet / CSV Importer:
   - Heuristically detects columns without needing exact headers (13 digits -> RSA ID, age, salary, employee code)
"""
*/

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Search,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Upload,
  Trash2,
  Edit2,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { Employee, Tenant, UserRole } from '../types';
import { validateSouthAfricanId } from '../utils/taxEngine';
import { maskBankAccount, maskSouthAfricanId, hasPermission } from '../utils/security';
import {
  parseCsvText,
  detectHeaderRow,
  detectColumns,
  buildEmployeesFromRows,
  ColumnDetection,
  DetectedColumnType,
} from '../utils/importer';

interface EmployeesViewProps {
  tenant: Tenant;
  employees: Employee[];
  currentUserRole: UserRole;
  onSaveEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employeeId: string) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  tenant,
  employees,
  currentUserRole,
  onSaveEmployee,
  onDeleteEmployee,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [showMaskedData, setShowMaskedData] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // New Employee Form State
  const [fullName, setFullName] = useState<string>('');
  const [employeeNumber, setEmployeeNumber] = useState<string>('');
  const [idNumber, setIdNumber] = useState<string>('');
  const [salary, setSalary] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [department, setDepartment] = useState<string>('Operations');
  const [bankName, setBankName] = useState<string>('FNB');
  const [bankAccount, setBankAccount] = useState<string>('');

  // ID Validation feedback state
  const [idValidation, setIdValidation] = useState<{
    isValid: boolean;
    birthDate?: string;
    age?: number;
    gender?: 'M' | 'F';
    error?: string;
  } | null>(null);

  // Importer State
  const [rawCsvInput, setRawCsvInput] = useState<string>('');
  const [detectedCols, setDetectedCols] = useState<ColumnDetection[] | null>(null);
  const [dataRows, setDataRows] = useState<string[][] | null>(null);
  const [parsedImportRows, setParsedImportRows] = useState<any[] | null>(null);

  // Form & Feedback State (No window.alert in iframe)
  const [formError, setFormError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const canEdit = hasPermission(currentUserRole, 'canEditEmployees');

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.idNumber.includes(searchTerm);
    const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const departments = Array.from(new Set(employees.map((e) => e.department)));

  // # Handle RSA ID Change with real-time Luhn calculation
  const handleIdChange = (value: string) => {
    setIdNumber(value);
    if (value.trim().length >= 13) {
      const check = validateSouthAfricanId(value);
      setIdValidation(check);
    } else {
      setIdValidation(null);
    }
  };

  const handleSaveNewEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!fullName || !salary) {
      setFormError('Please enter employee name and gross monthly salary.');
      return;
    }

    const grossMonthlySalary = parseFloat(salary);
    if (isNaN(grossMonthlySalary) || grossMonthlySalary <= 0) {
      setFormError('Gross salary must be a valid positive amount.');
      return;
    }

    let age = 30;
    if (idValidation && idValidation.isValid && idValidation.age) {
      age = idValidation.age;
    }

    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      tenantId: tenant.id,
      employeeNumber: employeeNumber || `EMP${String(employees.length + 1).padStart(3, '0')}`,
      fullName,
      idNumber: idNumber || '9901015009087',
      idType: 'rsa_id',
      dateOfBirth: idValidation?.birthDate || '1995-01-01',
      age,
      gender: idValidation?.gender || 'M',
      jobTitle: jobTitle || 'General Staff',
      department: department || 'General',
      grossMonthlySalary,
      startDate: new Date().toISOString().split('T')[0],
      isActive: true,
      bankName,
      bankAccountNumber: bankAccount,
      bankBranchCode: '250655',
    };

    onSaveEmployee(newEmp);
    setIsAddModalOpen(false);
    // Reset form
    setFullName('');
    setEmployeeNumber('');
    setIdNumber('');
    setSalary('');
    setJobTitle('');
    setIdValidation(null);
  };

  // # Smart Heuristic CSV Importer Trigger
  const handleAnalyzeSpreadsheet = () => {
    setImportError(null);
    if (!rawCsvInput.trim()) {
      setImportError('Please paste spreadsheet or CSV text.');
      return;
    }

    const rows = parseCsvText(rawCsvInput);
    if (rows.length === 0) {
      setImportError('No valid rows found in provided text.');
      return;
    }

    const hasHeader = detectHeaderRow(rows);
    const bodyRows = hasHeader ? rows.slice(1) : rows;

    const detected = detectColumns(bodyRows);
    setDetectedCols(detected);
    setDataRows(bodyRows);

    const parsed = buildEmployeesFromRows(bodyRows, detected, tenant.name);
    setParsedImportRows(parsed);
  };

  const handleColumnTypeReassign = (colIndex: number, newType: DetectedColumnType) => {
    if (!detectedCols || !dataRows) return;
    const updated = detectedCols.map((c) =>
      c.index === colIndex ? { ...c, assignedType: newType } : c
    );
    setDetectedCols(updated);
    const parsed = buildEmployeesFromRows(dataRows, updated, tenant.name);
    setParsedImportRows(parsed);
  };

  const handleCommitImport = () => {
    if (!parsedImportRows) return;
    let importedCount = 0;

    parsedImportRows.forEach((row, idx) => {
      if (row.isValid) {
        const newEmp: Employee = {
          id: `emp-imp-${Date.now()}-${idx}`,
          tenantId: tenant.id,
          employeeNumber: row.employeeNumber,
          fullName: row.fullName,
          idNumber: row.idNumber || '8501015009087',
          idType: 'rsa_id',
          dateOfBirth: '1995-01-01',
          age: row.age || 30,
          jobTitle: 'Imported Staff',
          department: 'Operations',
          grossMonthlySalary: row.grossSalary,
          startDate: new Date().toISOString().split('T')[0],
          isActive: true,
        };
        onSaveEmployee(newEmp);
        importedCount++;
      }
    });

    setPageNotice({
      text: `Successfully imported ${importedCount} employees into ${tenant.name}!`,
      type: 'success',
    });
    setTimeout(() => setPageNotice(null), 6000);
    setIsImportModalOpen(false);
    setRawCsvInput('');
    setDetectedCols(null);
    setParsedImportRows(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Notification Banner */}
      {pageNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg ${
            pageNotice.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
              : 'bg-red-950/70 border-red-500/60 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{pageNotice.text}</span>
          </div>
          <button onClick={() => setPageNotice(null)} className="text-slate-400 hover:text-white p-1">
            ✕
          </button>
        </div>
      )}

      {/* Header and Action Cluster */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>Employee Directory &amp; Records</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              POPIA compliant data storage with automated SARS tax age and statutory checks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* POPIA Masking Toggle */}
            <button
              onClick={() => setShowMaskedData(!showMaskedData)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
              title="Protection of Personal Information Act (POPIA) Masking"
            >
              {showMaskedData ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{showMaskedData ? 'Mask POPIA Data' : 'Reveal Sensitive Data'}</span>
            </button>

            {/* Smart Import Button */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950 border border-indigo-700 hover:bg-indigo-900 text-indigo-300 rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Smart Import (Excel/CSV)</span>
            </button>

            {/* Add Employee Button */}
            {canEdit && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Employee</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Department Filters */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, employee code, or RSA ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="dept-select" className="text-xs text-slate-400 whitespace-nowrap">Department:</label>
            <select
              id="dept-select"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-slate-400">
            Showing {filteredEmployees.length} of {employees.length} employees
          </span>
          <span className="text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 font-medium">
            POPIA Section 19 Safeguards Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <th className="pb-3">Code</th>
                <th className="pb-3">Full Name</th>
                <th className="pb-3">RSA ID / Passport</th>
                <th className="pb-3">Age</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Monthly Gross</th>
                <th className="pb-3">Bank Details</th>
                <th className="pb-3">Status</th>
                {canEdit && <th className="pb-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 font-semibold text-white font-sans">{emp.employeeNumber}</td>
                  <td className="py-3 font-medium text-slate-200 font-sans">
                    <div>{emp.fullName}</div>
                    <div className="text-[10px] text-slate-400">{emp.jobTitle}</div>
                  </td>
                  <td className="py-3 text-slate-300">
                    {showMaskedData ? emp.idNumber : maskSouthAfricanId(emp.idNumber)}
                  </td>
                  <td className="py-3 text-slate-300">
                    <span>{emp.age}</span>
                    {emp.age >= 65 && (
                      <span className="ml-1 text-[10px] bg-indigo-950 text-indigo-300 px-1 rounded border border-indigo-800 font-sans">
                        Rebate 65+
                      </span>
                    )}
                    {emp.age <= 29 && emp.grossMonthlySalary <= 7500 && (
                      <span className="ml-1 text-[10px] bg-emerald-950 text-emerald-300 px-1 rounded border border-emerald-800 font-sans">
                        ETI Youth
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-slate-400 font-sans">{emp.department}</td>
                  <td className="py-3 font-bold text-slate-100">
                    R{emp.grossMonthlySalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 text-slate-400 font-sans">
                    <div>{emp.bankName || 'Standard Bank'}</div>
                    <div className="text-[10px] font-mono">
                      {showMaskedData ? emp.bankAccountNumber || '62849102948' : maskBankAccount(emp.bankAccountNumber || '62849102948')}
                    </div>
                  </td>
                  <td className="py-3 font-sans">
                    <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                      Active
                    </span>
                  </td>
                  {canEdit && (
                    <td className="py-3 text-right font-sans">
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${emp.fullName} from active payroll?`)) {
                            onDeleteEmployee(emp.id);
                          }
                        }}
                        className="p-1 hover:text-red-400 text-slate-500 transition-colors"
                        title="Delete employee record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Add New Employee</span>
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveNewEmployee} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-950/60 border border-red-500/60 rounded-lg text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label htmlFor="emp-name" className="block text-slate-300 font-medium mb-1">Full Name (as per ID document) *</label>
                  <input
                    id="emp-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sipho Nkosi"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                  />
                </div>

                <div>
                  <label htmlFor="emp-code" className="block text-slate-300 font-medium mb-1">Employee Number</label>
                  <input
                    id="emp-code"
                    type="text"
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value)}
                    placeholder="e.g. VAN004"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="emp-salary" className="block text-slate-300 font-medium mb-1">Gross Monthly Salary (R) *</label>
                  <input
                    id="emp-salary"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="e.g. 25000"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label htmlFor="emp-id" className="block text-slate-300 font-medium mb-1">South African 13-Digit ID Number</label>
                  <input
                    id="emp-id"
                    type="text"
                    value={idNumber}
                    onChange={(e) => handleIdChange(e.target.value)}
                    placeholder="YYMMDD GSSS C A Z"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  {/* ID Validation Feedback */}
                  {idValidation && (
                    <div className="mt-1.5 p-2 rounded text-[11px] font-sans">
                      {idValidation.isValid ? (
                        <div className="text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 p-2 rounded flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>
                            Valid RSA ID! Age: <strong>{idValidation.age} years</strong> | Gender: {idValidation.gender === 'M' ? 'Male' : 'Female'} | Born: {idValidation.birthDate}
                          </span>
                        </div>
                      ) : (
                        <div className="text-amber-400 bg-amber-950/50 border border-amber-800/40 p-2 rounded flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{idValidation.error}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="emp-job" className="block text-slate-300 font-medium mb-1">Job Title</label>
                  <input
                    id="emp-job"
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Accountant"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                  />
                </div>

                <div>
                  <label htmlFor="emp-dept" className="block text-slate-300 font-medium mb-1">Department</label>
                  <input
                    id="emp-dept"
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Finance"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                  />
                </div>

                <div>
                  <label htmlFor="emp-bank" className="block text-slate-300 font-medium mb-1">Bank Name</label>
                  <input
                    id="emp-bank"
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. FNB / Standard Bank / Capitec"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                  />
                </div>

                <div>
                  <label htmlFor="emp-acct" className="block text-slate-300 font-medium mb-1">Account Number</label>
                  <input
                    id="emp-acct"
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="e.g. 62849102948"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Spreadsheet / CSV Importer Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span>Smart Spreadsheet &amp; CSV Importer</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Heuristic column classifier (13 digits = RSA ID, age &lt; 100, salary &gt;= 100). Works without exact headers.
                </p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Importer Error Feedback */}
            {importError && (
              <div className="p-3 bg-red-950/60 border border-red-500/60 rounded-lg text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Step 1: Paste CSV or Sample Data */}
            {!detectedCols ? (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="csv-input" className="font-semibold text-slate-300">
                      Paste CSV or Spreadsheet Data:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setRawCsvInput(
                          `Thabo Molefe, 8805125009087, R35000, 38, Operations\nZanele Dlamini, 0308140029081, R5500, 23, Packing\nPieter Van Wyk, 5811055009087, R28000, 68, Agronomy\nNomvula Sithole, 9507110029084, R18500, 31, Warehouse`
                        );
                      }}
                      className="text-emerald-400 hover:text-emerald-300 underline font-medium"
                    >
                      Insert Messy Farmer Sample Data
                    </button>
                  </div>
                  <textarea
                    id="csv-input"
                    rows={7}
                    value={rawCsvInput}
                    onChange={(e) => setRawCsvInput(e.target.value)}
                    placeholder="Paste rows from Excel, Google Sheets, or CSV here (e.g. Name, ID, Salary, Department)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300 block mb-1">Auto-Detection Capabilities:</span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Handles currency formats: R35,000 | 35000.00 | ZAR 35000</li>
                    <li>Validates 13-digit South African ID numbers</li>
                    <li>Supports separate first and surname columns</li>
                    <li>Auto-generates employee codes if missing</li>
                  </ul>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAnalyzeSpreadsheet}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow flex items-center gap-1.5"
                  >
                    <span>Detect Columns &amp; Analyze</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Confirm Detected Column Types & Preview */
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="font-semibold text-slate-200 mb-2">Detected Column Mappings:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {detectedCols.map((col) => (
                      <div key={col.index} className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Column {col.index + 1}</span>
                          <span className="text-[10px] text-emerald-400 font-mono">{col.confidence}% match</span>
                        </div>

                        <div>
                          <label htmlFor={`reassign-col-${col.index}`} className="sr-only">Assign Column {col.index + 1} Type</label>
                          <select
                            id={`reassign-col-${col.index}`}
                            aria-label={`Assign Column ${col.index + 1} Type`}
                            value={col.assignedType}
                            onChange={(e) => handleColumnTypeReassign(col.index, e.target.value as DetectedColumnType)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-emerald-300 font-bold focus:outline-none"
                          >
                            <option value="name">Full Name</option>
                            <option value="surname">Surname</option>
                            <option value="rsa_id">RSA ID Number (13 digits)</option>
                            <option value="salary">Gross Monthly Salary</option>
                            <option value="age">Age</option>
                            <option value="employee_id">Employee Code / ID</option>
                            <option value="unknown">Skip Column</option>
                          </select>
                        </div>

                        <div className="text-[10px] text-slate-500 truncate">
                          Samples: {col.sampleValues.join(', ') || 'empty'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Parsed Preview Table */}
                {parsedImportRows && (
                  <div>
                    <h3 className="font-semibold text-slate-200 mb-2">
                      Parsed Employee Preview ({parsedImportRows.filter((r) => r.isValid).length} ready to import):
                    </h3>
                    <div className="border border-slate-800 rounded-lg overflow-x-auto max-h-48">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                          <tr>
                            <th className="p-2">#</th>
                            <th className="p-2">Code</th>
                            <th className="p-2">Name</th>
                            <th className="p-2">RSA ID</th>
                            <th className="p-2">Age</th>
                            <th className="p-2">Salary</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                          {parsedImportRows.map((r) => (
                            <tr key={r.rowNumber} className={r.isValid ? 'hover:bg-slate-800/40' : 'bg-red-950/20'}>
                              <td className="p-2 text-slate-500 font-sans">{r.rowNumber}</td>
                              <td className="p-2 text-slate-300 font-sans">{r.employeeNumber}</td>
                              <td className="p-2 font-medium text-white font-sans">{r.fullName}</td>
                              <td className="p-2 text-slate-400">{r.idNumber || '—'}</td>
                              <td className="p-2 text-slate-300">{r.age}</td>
                              <td className="p-2 text-emerald-400 font-bold">R{r.grossSalary.toFixed(2)}</td>
                              <td className="p-2 font-sans">
                                {r.isValid ? (
                                  <span className="text-emerald-400 text-[10px] font-semibold">
                                    Valid
                                    {r.warnings && r.warnings.length > 0 && (
                                      <span className="text-amber-400 ml-1 font-normal" title={r.warnings.join(', ')}>
                                        (Notice)
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-red-400 text-[10px] font-semibold">{r.validationErrors[0]}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setDetectedCols(null)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded font-medium"
                  >
                    &larr; Back to Raw Text
                  </button>
                  <button
                    onClick={handleCommitImport}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow"
                  >
                    Confirm &amp; Import Employees
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
