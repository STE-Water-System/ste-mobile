import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

// Storage keys
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user_data',
};

// Get stored token
export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// Store auth data
export const storeAuthData = async (token: string, refreshToken: string, user: any) => {
  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.TOKEN, token],
      [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
      [STORAGE_KEYS.USER, JSON.stringify(user)],
    ]);
  } catch (error) {
    console.error('Error storing auth data:', error);
    throw error;
  }
};

// Clear auth data
export const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
    ]);
  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw error;
  }
};

// Get stored user
export const getStoredUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Error getting stored user:', error);
    return null;
  }
};

// Error carrying the HTTP status so callers can react to 401/403/404/409 specifically
export class ApiError extends Error {
  status: number;
  payload: any;

  constructor(message: string, status: number, payload: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
}

// The backend reports failures either as { message } or as express-validator { errors: [{ msg, path }] }
const extractErrorMessage = (data: any, status: number): string => {
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const messages = data.errors
      .map((err: any) => err?.msg || err?.message)
      .filter(Boolean);
    if (messages.length > 0) return messages.join('\n');
  }
  return data?.message || data?.error || `Erreur requête (${status})`;
};

const parseResponse = async (response: Response): Promise<any> => {
  let data: any = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data, response.status), response.status, data);
  }

  return data;
};

// API request helper
const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  return await parseResponse(response);
};

// API upload helper (multipart/form-data). Content-Type is left unset so
// fetch adds the multipart boundary itself.
const apiUpload = async (
  endpoint: string,
  formData: FormData,
  method: 'POST' | 'PUT' = 'POST'
): Promise<any> => {
  const token = await getToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: formData,
  });

  return await parseResponse(response);
};

// Auth API endpoints
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      const { token, refreshToken, user } = response.data;
      await storeAuthData(token, refreshToken, user);
      return response.data;
    }

    throw new Error(response.message || 'Login failed');
  },

  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      await clearAuthData();
    }
  },

  getCurrentUser: async () => {
    return await apiRequest('/auth/me', { method: 'GET' });
  },

  refreshToken: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) throw new Error('No refresh token');

      const response = await apiRequest('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });

      if (response.success && response.data) {
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.TOKEN, response.data.token],
          [STORAGE_KEYS.REFRESH_TOKEN, response.data.refreshToken],
        ]);
        return response.data;
      }

      throw new Error('Token refresh failed');
    } catch (error) {
      await clearAuthData();
      throw error;
    }
  },
};

// ---------------------------------------------------------------------------
// Meter reading domain constants (mirror of the backend enums)
// ---------------------------------------------------------------------------

/** Values accepted by the backend `accessReason` field. */
export const ACCESS_REASONS = {
  Accessed: 'Accessed',
  Meter_Blocked: 'Meter_Blocked',
  Door_Closed: 'Door_Closed',
  Meter_Illegible: 'Meter_Illegible',
  Meter_Cut_Off: 'Meter_Cut_Off',
  Meter_Removed: 'Meter_Removed',
} as const;

export type AccessReason = keyof typeof ACCESS_REASONS;

/** Reading statuses. Note RE_SUBMITED is spelled with a single T backend-side. */
export const READING_STATUS = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RE_SUBMITED: 'RE_SUBMITED',
} as const;

export type ReadingStatus = keyof typeof READING_STATUS;

export const normalizeStatus = (reading: any): string =>
  String(reading?.status || '').trim().toUpperCase();

/**
 * A row the agent may still fill in: PENDING is a fresh assignment created by
 * the commercial, REJECTED one the validator sent back for correction.
 * Everything else is out of the agent's hands.
 */
export const isEditableStatus = (reading: any): boolean => {
  const status = normalizeStatus(reading);
  return status === READING_STATUS.PENDING || status === READING_STATUS.REJECTED;
};

/** Submitted to the validator and not yet ruled on — read only for the agent. */
export const isAwaitingValidation = (reading: any): boolean => {
  const status = normalizeStatus(reading);
  return status === READING_STATUS.SUBMITTED || status === READING_STATUS.RE_SUBMITED;
};

export const isApprovedStatus = (reading: any): boolean =>
  normalizeStatus(reading) === READING_STATUS.APPROVED;

export const isRejectedStatus = (reading: any): boolean =>
  normalizeStatus(reading) === READING_STATUS.REJECTED;

/** The primary key, whichever name the route serialises it under. */
export const readingIdOf = (reading: any): number | null => {
  const id = Number(reading?.meterReadingId ?? reading?.readingId ?? reading?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
};

export const readingDateOf = (reading: any): number =>
  new Date(reading?.readingDate || reading?.createdAt || 0).getTime();

/** Most recent first. `sortBy=readingDate` is not honoured by the backend, so sort here. */
const sortByDateDesc = (readings: any[]): any[] =>
  [...readings].sort((a, b) => readingDateOf(b) - readingDateOf(a));

/** The customer behind a reading, wherever the route happens to nest them. */
export const customerOf = (reading: any): any =>
  reading?.customer ||
  reading?.meter?.customer ||
  reading?.meter?.connectionRequest?.customer ||
  null;

export const customerNameOf = (customer: any): string =>
  `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim();

/** What still needs doing comes first; a rejected reading is the most urgent of all. */
const roundRank = (reading: any): number => {
  if (isRejectedStatus(reading)) return 0;
  if (isEditableStatus(reading)) return 1;
  if (isAwaitingValidation(reading)) return 2;
  return 3;
};

const sortRound = (readings: any[]): any[] =>
  [...readings].sort((a, b) => roundRank(a) - roundRank(b) || readingDateOf(b) - readingDateOf(a));

export interface RoundSummary {
  /** Readings assigned to the agent for this round. */
  total: number;
  /** Still to record: PENDING plus REJECTED. */
  todo: number;
  /** Handed to the validator: SUBMITTED plus RE_SUBMITED. */
  sent: number;
}

/** Counted from the round itself — always consistent with the rows on screen. */
export const summarizeRound = (readings: any[]): RoundSummary => ({
  total: readings.length,
  todo: readings.filter(isEditableStatus).length,
  sent: readings.filter(isAwaitingValidation).length,
});

/** `currentIndex` / `consumption` are validated with isDecimal({ decimal_digits: '0,2' }). */
const toDecimalString = (value: any): string => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0.00';
  return (Math.round(num * 100) / 100).toFixed(2);
};

/** `previousIndex` is validated with isInt({ min: 0 }) — decimals are rejected. */
const toIntString = (value: any): string => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return String(Math.max(0, Math.round(num)));
};

const toIsoDate = (date: Date = new Date()): string => date.toISOString().slice(0, 10);

/** YYYY-MM-DD out of whatever shape the API serialises a date in. */
export const toDateOnly = (value: any): string | undefined => {
  if (!value) return undefined;
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : toIsoDate(date);
};

/** Built by hand rather than with URLSearchParams, whose support is patchy on React Native. */
const buildQuery = (params: Record<string, string | number | undefined | null>): string => {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
};

/** GET /api/meter-readings answers { success, data: { data: [], pagination: {} } }. */
const normalizeListResponse = (response: any) => {
  const payload = response?.data;
  const items = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
    ? payload
    : [];
  const pagination = payload?.pagination || null;

  return {
    success: response?.success !== false,
    items,
    pagination: {
      currentPage: Number(pagination?.currentPage) || 1,
      totalPages: Number(pagination?.totalPages) || 1,
      totalItems: Number(pagination?.totalItems) ?? items.length,
      itemsPerPage: Number(pagination?.itemsPerPage) || items.length,
    },
    raw: response,
  };
};

/** Attach the React Native file descriptor multipart uploads expect. */
const appendPhoto = (form: FormData, imageUri: string) => {
  const extension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
  form.append('evidencePhotoUrl', {
    uri: imageUri,
    name: `evidence-${Date.now()}.${extension === 'png' ? 'png' : 'jpg'}`,
    type: mimeType,
  } as any);
};

export interface ReadingPayload {
  meterId: number;
  readingDate?: string;
  currentIndex?: number;
  previousIndex?: number;
  consumption?: number;
  accessReason?: AccessReason;
  /** Convenience flag: maps to accessReason Door_Closed and a zero consumption. */
  isInaccessible?: boolean;
  longitude?: string;
  latitude?: string;
  comments?: string;
  imageUri?: string;
}

/**
 * Multipart body for PUT /api/meter-readings/:id.
 *
 * `status` is deliberately absent: the backend derives the transition from the
 * row it is updating (PENDING → SUBMITTED, REJECTED → RE_SUBMITED).
 */
const buildReadingForm = (data: ReadingPayload): FormData => {
  const form = new FormData();

  form.append('meterId', String(data.meterId));
  form.append('readingDate', data.readingDate || toIsoDate());

  const previous = Number(data.previousIndex) || 0;
  const inaccessible = data.isInaccessible === true;

  // No access: the index cannot advance, so carry the previous one over at zero consumption.
  const current = inaccessible
    ? previous
    : Number.isFinite(Number(data.currentIndex))
    ? Number(data.currentIndex)
    : 0;

  const consumption = inaccessible
    ? 0
    : Number.isFinite(Number(data.consumption))
    ? Number(data.consumption)
    : Math.max(0, current - previous);

  form.append('currentIndex', toDecimalString(current));
  form.append('previousIndex', toIntString(previous));
  form.append('consumption', toDecimalString(consumption));

  const accessReason =
    data.accessReason || (inaccessible ? ACCESS_REASONS.Door_Closed : ACCESS_REASONS.Accessed);
  form.append('accessReason', accessReason);

  if (data.longitude) form.append('longitude', String(data.longitude));
  if (data.latitude) form.append('latitude', String(data.latitude));
  if (data.comments) form.append('comments', data.comments);
  if (data.imageUri) appendPhoto(form, data.imageUri);

  return form;
};

/** First day of the current billing month, as YYYY-MM-DD. */
const startOfMonthISO = (): string => {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
};

/**
 * Fallback for roles that may not call GET /meter-readings/customer/:code — the
 * route is ADMIN/OPERATOR only, so agents get a 403. Rebuilds the customer and
 * their meters from the connection-request listing instead.
 */
const findCustomerInConnectionRequests = async (codeOrId: string, search?: string) => {
  const query = buildQuery({ page: 1, limit: 100, search });
  const response = await apiRequest(`/connection-request${query}`, { method: 'GET' });
  const rows = Array.isArray(response?.data?.data) ? response.data.data : [];

  const matches = rows.filter((row: any) => {
    const customer = row?.customer;
    if (!customer) return false;
    return (
      String(customer.customerCode) === codeOrId || String(customer.customerId) === codeOrId
    );
  });

  if (matches.length === 0) {
    throw new ApiError('Client introuvable.', 404, response);
  }

  // One meter per connection request. Unlike the customer route, this listing
  // carries no embedded readings — callers fetch them separately.
  const meters = matches.map((row: any) => row.meter).filter(Boolean);
  const customer = { ...matches[0].customer, meters };

  return { success: true, customer, meters };
};

// Meter API endpoints
export const meterApi = {
  /**
   * GET /api/meter-readings/customer/:customerCodeOrId
   *
   * Returns the customer with their address, their meters, and — per the
   * backend query — only the readings of the CURRENT billing month.
   * The lookup matches on customerCode, so a numeric id is resolved through
   * GET /api/customers/:id first. The route is ADMIN/OPERATOR only; other roles
   * fall back to the connection-request listing.
   */
  getCustomerWithMeters: async (
    customerCodeOrId: string | number,
    options: { search?: string } = {}
  ) => {
    const input = String(customerCodeOrId).trim();

    const fetchByCode = (code: string) =>
      apiRequest(`/meter-readings/customer/${encodeURIComponent(code)}`, { method: 'GET' });

    let response: any;
    try {
      response = await fetchByCode(input);
    } catch (error) {
      const apiError = error as ApiError;

      // A numeric input that is not a customerCode: resolve the code from the id.
      if (apiError?.isNotFound && /^\d+$/.test(input)) {
        try {
          const customerResp = await apiRequest(`/customers/${input}`, { method: 'GET' });
          const code = customerResp?.data?.customerCode;
          if (code) response = await fetchByCode(code);
        } catch {
          // Ignore and try the listing below.
        }
      }

      if (!response) {
        if (apiError?.isForbidden || apiError?.isNotFound) {
          console.warn('Customer route unavailable, using connection-request:', apiError.message);
          return await findCustomerInConnectionRequests(input, options.search);
        }
        throw error;
      }
    }

    const customer = response?.data;
    if (!customer) {
      throw new ApiError('Client introuvable.', 404, response);
    }

    const meters = Array.isArray(customer.meters) ? customer.meters : [];
    return { success: true, customer, meters };
  },

  /**
   * GET /api/meter-readings?meterId=X&page=1&limit=50&startDate=
   * History of a meter's readings, newest first.
   */
  getReadings: async (
    meterId: number,
    options: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      status?: ReadingStatus;
    } = {}
  ) => {
    const { page = 1, limit = 50, startDate, endDate, status } = options;

    const query = buildQuery({
      meterId,
      page,
      limit,
      startDate,
      endDate,
      status,
      // readingDate is not an accepted sort field backend-side; sorting is redone locally.
      sortBy: 'createdAt',
      order: 'DESC',
    });

    const response = await apiRequest(`/meter-readings${query}`, { method: 'GET' });
    const normalized = normalizeListResponse(response);

    return { ...normalized, items: sortByDateDesc(normalized.items) };
  },

  /**
   * GET /api/meter-readings?status=PENDING&all=true — the round assigned to the
   * signed-in agent. The listing is scoped to them backend-side, and `all=true`
   * widens it past PENDING so rows already sent (SUBMITTED / RE_SUBMITED) and
   * sent back (REJECTED) come along.
   */
  getAssignedRound: async (options: { limit?: number } = {}) => {
    const query = buildQuery({
      status: READING_STATUS.PENDING,
      all: 'true',
      page: 1,
      limit: options.limit ?? 200,
      sortBy: 'createdAt',
      order: 'DESC',
    });

    const response = await apiRequest(`/meter-readings${query}`, { method: 'GET' });
    const normalized = normalizeListResponse(response);

    return { ...normalized, items: sortRound(normalized.items) };
  },

  /**
   * Latest APPROVED reading of a meter — the source of truth for previousIndex.
   * The customer endpoint only exposes the current month, so this is its own query.
   */
  getLastApprovedReading: async (meterId: number) => {
    try {
      const { items } = await meterApi.getReadings(meterId, {
        limit: 20,
        status: READING_STATUS.APPROVED,
      });
      return items.length > 0 ? items[0] : null;
    } catch (error: any) {
      console.warn('Could not load last approved reading:', error?.message);
      return null;
    }
  },

  /** GET /api/meter-readings/:id */
  getReadingById: async (readingId: number) => {
    const response = await apiRequest(`/meter-readings/${readingId}`, { method: 'GET' });
    return response?.data || null;
  },

  /**
   * Everything the reading screen needs about a customer: identity, meters, the
   * previous index and the row the agent is expected to complete.
   *
   * Readings are no longer created from the mobile app — the commercial creates
   * one PENDING row per meter when assigning the round, and the agent fills it
   * in. So each meter resolves to at most one editable row, and when there is
   * none the meter simply is not part of this month's round.
   */
  loadCustomerForReading: async (customerCodeOrId: string | number) => {
    const { customer, meters } = await meterApi.getCustomerWithMeters(customerCodeOrId);

    const details = await Promise.all(
      meters.map(async (meter: any) => {
        // The customer route embeds the current month's readings; the
        // connection-request fallback does not, so query them separately.
        let monthReadings: any[] = Array.isArray(meter.meterReading) ? meter.meterReading : [];
        if (!Array.isArray(meter.meterReading)) {
          try {
            const { items } = await meterApi.getReadings(meter.meterId, {
              limit: 50,
              startDate: startOfMonthISO(),
            });
            monthReadings = items;
          } catch (error: any) {
            console.warn('Could not load current month readings:', error?.message);
          }
        }
        const currentMonthReadings = sortByDateDesc(monthReadings);

        const lastApproved = await meterApi.getLastApprovedReading(meter.meterId);
        const approvedThisMonth = currentMonthReadings.find(isApprovedStatus) || null;

        // The row the agent has to complete with PUT /api/meter-readings/:id.
        const assignment = currentMonthReadings.find(isEditableStatus) || null;
        const awaitingValidation = currentMonthReadings.find(isAwaitingValidation) || null;

        // previousIndex: the value the commercial set on the assignment, else
        // the last APPROVED reading, else an approved reading of the current
        // month, else the index recorded when the meter was installed.
        const previousIndex =
          Number(assignment?.previousIndex) ||
          Number(lastApproved?.currentIndex) ||
          Number(approvedThisMonth?.currentIndex) ||
          Number(meter.installationIndex) ||
          0;

        return {
          meter,
          currentMonthReadings,
          lastApprovedReading: lastApproved,
          previousIndex,
          assignment,
          awaitingValidation,
          approvedThisMonth,
        };
      })
    );

    return { success: true, customer, meters, details };
  },

  /**
   * PUT /api/meter-readings/:id — multipart/form-data.
   *
   * The only write the mobile app performs on a reading. The row already exists,
   * created by the commercial when the round was assigned, so this fills it in
   * (first submission) or corrects it (after a rejection); the backend moves the
   * status to SUBMITTED or RE_SUBMITED accordingly.
   */
  updateReading: async (readingId: number, data: ReadingPayload) => {
    return await apiUpload(`/meter-readings/${readingId}`, buildReadingForm(data), 'PUT');
  },
};

// Billing API endpoints
export const billingApi = {
  /** Normalized bill list for a customer code, newest first. */
  listByCustomerCode: async (customerCode: string) => {
    const response = await apiRequest(
      `/bills/getBillsByCustomerId/${encodeURIComponent(customerCode)}?all=true`,
      { method: 'GET' }
    );
    const { items } = normalizeListResponse(response);
    return [...items].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  },
};

/** Human readable address out of the nested address relation. */
export const formatAddress = (address: any): string => {
  if (!address) return '';
  const street = [address.streetName, address.streetNumber].filter(Boolean).join(' ');
  return [street, address.area?.name, address.center?.name, address.city?.name || address.city?.cityName]
    .filter(Boolean)
    .join(', ');
};

/**
 * Client-facing endpoints under /api/client. These are the only routes mounted
 * without verifyToken, so the customer side of the app needs no JWT.
 */
export const clientApi = {
  /**
   * POST /api/client/verify-customer — the customer "login".
   * Matches on customerCode + phone exactly; 401 when either is wrong.
   * Returns the customer with their address and ACTIVE meters.
   */
  verifyCustomer: async (customerCode: string, mobileNumber: string) => {
    const response = await apiRequest('/client/verify-customer', {
      method: 'POST',
      body: JSON.stringify({
        customerCode: customerCode.trim(),
        mobileNumber: mobileNumber.trim(),
      }),
    });

    const customer = response?.data;
    if (!customer) {
      throw new ApiError('Client introuvable.', 404, response);
    }

    // The session is persisted as-is, so `meters` has to be an array even when
    // the customer has none and the backend omits the relation.
    return { ...customer, meters: Array.isArray(customer.meters) ? customer.meters : [] };
  },

  /** GET /api/client/bills/:customerId — newest first, optional status filter. */
  getBills: async (customerId: number, status?: string) => {
    const query = buildQuery({ status: status ? status.toUpperCase() : undefined });
    const response = await apiRequest(`/client/bills/${customerId}${query}`, { method: 'GET' });
    return normalizeListResponse(response).items;
  },

  /** GET /api/client/consumption/:meterId — the meter's last 12 readings. */
  getConsumption: async (meterId: number) => {
    const response = await apiRequest(`/client/consumption/${meterId}`, { method: 'GET' });
    return sortByDateDesc(normalizeListResponse(response).items);
  },
};

/** The `complainType` column is an ENUM; the client route writes it verbatim. */
export const COMPLAINT_CATEGORIES = ['Technical', 'Billing', 'Service', 'Other'] as const;
export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

/** Likewise `priority` — note it is Critical here, not Urgent. */
export const COMPLAINT_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export type ComplaintPriority = (typeof COMPLAINT_PRIORITIES)[number];

export const complaintsApi = {
  /**
   * POST /api/client/complaints — no JWT, because customers never get one:
   * verify-customer returns the record alone, so the protected /api/complaints
   * route is out of reach for them.
   *
   * The route spreads the body straight into Complain.create, so field names
   * must match the model, not the validator: it checks `title` while the column
   * is `subject`, and ignores `complainType` entirely though it is NOT NULL.
   * Both are sent.
   *
   * This currently fails for everyone. After the spread the handler forces
   * `status: 'PENDING'`, and that column is ENUM('Open','In_Progress',
   * 'Resolved','Closed'), so MySQL answers "Data truncated for column
   * 'status'". Changing that one word to 'Open' server-side makes it work with
   * no change here.
   */
  create: async (data: {
    customerId: number;
    subject: string;
    description: string;
    category: ComplaintCategory;
    priority?: ComplaintPriority;
  }) => {
    return await apiRequest('/client/complaints', {
      method: 'POST',
      body: JSON.stringify({
        customerId: data.customerId,
        title: data.subject,
        subject: data.subject,
        description: data.description,
        complainType: data.category,
        priority: data.priority || 'Medium',
      }),
    });
  },
};

/** Bill status helpers — the backend stores uppercase strings. */
export const billStatusOf = (bill: any): string => String(bill?.status || '').trim().toUpperCase();
export const isBillPaid = (bill: any): boolean => billStatusOf(bill) === 'PAID';

/** Amount still owed on a bill, guarding against missing paidAmount. */
export const billBalance = (bill: any): number => {
  const total = Number(bill?.totalAmount) || 0;
  const paid = Number(bill?.paidAmount) || 0;
  return Math.max(0, total - paid);
};

export const formatCurrency = (value: any): string => {
  const amount = Number(value) || 0;
  // Intl is unreliable on Android/Hermes without polyfills, so group manually.
  return amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

export default apiRequest;
