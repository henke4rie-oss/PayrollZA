/**
 * Client for the Python (FastAPI) backend in /api.
 * All payroll maths and SA ID validation happens there. This file only
 * sends requests and reshapes the JSON so the React screens can use it.
 */

// Set VITE_API_URL in web/.env.local to point at a deployed API.
const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

/** The fields the UI needs from a payroll calculation. */
export interface PayrollCalculation {
  grossMonthly: number;
  monthlyPaye: number;
  uifEmployee: number;
  uifEmployer: number;
  sdlAmount: number;
  etiAmount: number;
  netPay: number;
  totalEmployerCost: number;
}

export interface SaIdValidation {
  isValid: boolean;
  birthDate?: string;
  age?: number;
  gender?: 'M' | 'F';
  isCitizen?: boolean;
  error?: string;
}

// Shared helper: POST JSON, return parsed JSON, turn failures into readable errors.
async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // fetch only throws when the server can't be reached at all
    throw new Error(`Cannot reach the payroll API at ${API_URL}. Is it running?`);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // 400 = business rule (detail is a string), 422 = bad request shape (detail is a list)
    const detail = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
    throw new Error(detail || `Payroll API error (${response.status})`);
  }
  return data as T;
}

/**
 * Monthly PAYE / UIF / SDL for one employee.
 * The API returns money as strings ("4681.00") because Python's Decimal is
 * serialised that way to avoid float drift, so we convert with Number() here.
 */
export async function calculatePayrollApi(
  grossMonthly: number,
  age: number,
  sdlExempt: boolean,
): Promise<PayrollCalculation> {
  const r = await postJson<Record<string, string>>('/payroll/calculate', {
    gross_monthly: String(grossMonthly),
    age,
    sdl_exempt: sdlExempt,
  });
  return {
    grossMonthly: Number(r.gross_monthly),
    monthlyPaye: Number(r.monthly_paye),
    uifEmployee: Number(r.uif_employee),
    uifEmployer: Number(r.uif_employer),
    sdlAmount: Number(r.sdl_amount),
    etiAmount: Number(r.eti_amount),
    netPay: Number(r.net_pay),
    totalEmployerCost: Number(r.total_employer_cost),
  };
}

/** Luhn checksum + birthdate/gender/citizenship extraction for a 13-digit SA ID. */
export async function validateSaIdApi(idNumber: string): Promise<SaIdValidation> {
  const r = await postJson<{
    is_valid: boolean;
    birth_date: string | null;
    age: number | null;
    gender: 'M' | 'F' | null;
    is_citizen: boolean | null;
    error: string | null;
  }>('/sa-id/validate', { id_number: idNumber.replace(/\s+/g, '') });

  return {
    isValid: r.is_valid,
    birthDate: r.birth_date ?? undefined,
    age: r.age ?? undefined,
    gender: r.gender ?? undefined,
    isCitizen: r.is_citizen ?? undefined,
    error: r.error ?? undefined,
  };
}

/** Pings GET /health so the UI can show whether the Python API is up. */
export async function checkApiHealth(): Promise<{ online: boolean; database?: string }> {
  try {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) return { online: false };
    const data = await response.json();
    return { online: true, database: data.database };
  } catch {
    return { online: false };
  }
}
