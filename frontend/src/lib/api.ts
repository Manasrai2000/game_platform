/**
 * API Client for Modular Monolith Backend
 * Configured with credentials: 'include' to handle HttpOnly cookies automatically.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
export const BACKEND_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1").replace(/\/api\/v1\/?$/, "");

export interface ApiUser {
  id: number;
  email: string;
  fullName: string;
  role: "STUDENT" | "ADMIN";
  mobileNumber?: string;
  classGrade?: string;
  schoolName?: string;
  city?: string;
  state?: string;
  isActive?: boolean;
  referralCode?: string | null;
  referredByCode?: string | null;
  rewardWalletBalance?: number;
}

export interface StudentPaidOrderSummary {
  id: number;
  planTitle: string | null;
  baseAmount: number;
  discountAmount: number;
  walletDiscountUsed: number;
  finalAmount: number;
  referralCodeUsed: string | null;
  gateway: string;
  gatewayPaymentId: string | null;
  paidAt: string;
  createdAt: string;
}

export interface StudentListItem {
  id: number;
  fullName: string;
  email: string;
  mobileNumber: string;
  classGrade: string;
  schoolName: string;
  city: string;
  state: string;
  isActive: boolean;
  createdAt: string;
  rawPassword?: string | null;
  activeDeviceId: number | null;
  activeDeviceLabel: string | null;
  activeDeviceLastSeen: string | null;
  activeDeviceBoundIp: string | null;
  planStatus?: "PREMIUM" | "EXPIRED" | "FREE";
  classPlanPrice?: number | null;
  classPlanTitle?: string | null;
  subscription?: {
    planTitle: string;
    status: "ACTIVE" | "EXPIRED" | "CANCELLED";
    startsAt: string;
    expiresAt: string;
  } | null;
  latestPaidOrder?: StudentPaidOrderSummary | null;
}

export interface StudentsSummary {
  totalStudents: number;
  premiumCount: number;
  expiredCount: number;
  freeCount: number;
}

export interface SessionItem {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface StudentFullDetails {
  student: StudentListItem & { updatedAt?: string };
  activeDevice: {
    id: number;
    deviceLabel: string;
    boundIp: string;
    status: "ACTIVE" | "REVOKED";
    lastSeenAt: string;
    createdAt: string;
  } | null;
  activeSession: SessionItem | null;
  lastLoginAt: string | null;
  recentSessions: SessionItem[];
  planStatus?: "PREMIUM" | "EXPIRED" | "FREE";
  classPlanPrice?: number | null;
  classPlanTitle?: string | null;
  activeSubscription?: {
    id: number;
    planTitle: string | null;
    planCode: string | null;
    planPrice: number | null;
    status: string;
    startsAt: string;
    expiresAt: string;
  } | null;
  subscriptionHistory?: Array<{
    id: number;
    planTitle: string | null;
    planCode: string | null;
    planPrice: number | null;
    status: string;
    startsAt: string;
    expiresAt: string;
    createdAt: string;
  }>;
  paymentOrders?: Array<{
    id: number;
    planTitle: string | null;
    planCode: string | null;
    baseAmount: number;
    discountAmount: number;
    walletDiscountUsed: number;
    finalAmount: number;
    referralCodeUsed: string | null;
    status: "PENDING" | "PAID" | "FAILED";
    gateway: string;
    gatewayOrderId: string;
    gatewayPaymentId: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface StudentFilterParams {
  search?: string;
  status?: "all" | "active" | "inactive";
  planTier?: "all" | "premium" | "free" | "expired";
  classGrade?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface UpdateStudentInput {
  fullName?: string;
  email?: string;
  mobileNumber?: string;
  classGrade?: string;
  schoolName?: string;
  city?: string;
  state?: string;
  password?: string;
  isActive?: boolean;
}

export interface ClassItem {
  id: number;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminActivityItem {
  id: number;
  classId: number;
  className: string;
  title: string;
  version: number;
  storagePath: string;
  entryFile: string;
  totalCheckpoints: number;
  demoCheckpointsCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPlanItem {
  id: number;
  classId: number | null;
  className: string;
  code: string;
  title: string;
  description: string | null;
  priceInr: number;
  durationDays: number;
  badge: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdminPromoCodeItem {
  id: number;
  code: string;
  label: string;
  discount_percent: number;
  discount_flat_inr: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string;
  is_active: boolean;
  isExpired: boolean;
  created_at: string;
}

export interface StudentJourneyResponse {
  hasPackage: boolean;
  message?: string;
  className?: string;
  class?: {
    id: number;
    name: string;
  };
  activity?: {
    id: number;
    title: string;
    description: string;
    version: number;
    storagePath: string;
    entryFile: string;
    totalCheckpoints: number;
    demoCheckpoints?: number;
    playUrl: string;
  };
  progress?: {
    currentCheckpoint: number;
    maxCompletedCheckpoint: number;
    isCompleted: boolean;
    journeyState: any;
    lastPlayedAt: string;
  };
  monetization?: {
    hasActiveSubscription: boolean;
    subscription: {
      planTitle: string;
      planCode: string;
      startsAt: string;
      expiresAt: string;
    } | null;
    isDemoCompleted: boolean;
    subscriptionRequired: boolean;
  };
}

export interface SubscriptionPlan {
  id: number;
  code: string;
  title: string;
  description: string | null;
  price_inr: number;
  duration_days: number;
  badge: string | null;
}

export interface ReferralSettingsModel {
  id: number;
  is_enabled: boolean;
  max_referrals_per_student: number;
  referee_discount_type: "FLAT" | "PERCENT";
  referee_discount_value: number;
  referrer_reward_type: "FLAT" | "PERCENT";
  referrer_reward_value: number;
  reward_trigger: "ON_SUBSCRIPTION" | "ON_SIGNUP";
}

export interface AdminReferralLedgerItem {
  id: number;
  referralCode: string;
  status: "REGISTERED" | "APPLIED" | "REWARDED";
  discountGiven: number;
  rewardCredited: number;
  createdAt: string;
  referrerName: string;
  referrerEmail: string;
  refereeName: string;
  refereeEmail: string;
}

export interface ReferralStatsResponse {
  referralCode: string | null;
  referredByCode: string | null;
  rewardWalletBalance: number;
  totalInvited: number;
  totalConverted: number;
  totalEarned: number;
  history: {
    id: number;
    refereeId: number;
    refereeName: string;
    refereeEmail: string;
    status: "REGISTERED" | "APPLIED" | "REWARDED";
    rewardCredited: number;
    discountGiven: number;
    createdAt: string;
  }[];
  settings: {
    isEnabled: boolean;
    maxReferralsPerStudent: number;
    refereeDiscountType: "FLAT" | "PERCENT";
    refereeDiscountValue: number;
    referrerRewardType: "FLAT" | "PERCENT";
    referrerRewardValue: number;
    rewardTrigger: "ON_SUBSCRIPTION" | "ON_SIGNUP";
    maxEarnableAmount: number;
  };
}

export interface TrackingStatusResponse {
  user: {
    id: number;
    fullName: string;
    classGrade: string;
    myReferralCode: string | null;
  };
  access: {
    isDeviceLocked: boolean;
    isDesktop: boolean;
    hasActiveSubscription: boolean;
    subscription: {
      planTitle: string;
      planCode: string;
      startsAt: string;
      expiresAt: string;
    } | null;
  };
  activity: {
    classId: number;
    title: string;
    totalCheckpoints: number;
    demoCheckpoints: number;
    currentCheckpoint: number;
    maxCompletedCheckpoint: number;
    isDemoCompleted: boolean;
    canProceed: boolean;
    lockReason: "SUBSCRIPTION_REQUIRED" | null;
  } | null;
  referralStats: {
    totalInvited: number;
    totalConverted: number;
    rewardWalletBalance: number;
  };
}

export interface CreateOrderResponse {
  orderId: number;
  gatewayOrderId: string;
  gatewayMode: "RAZORPAY" | "SANDBOX";
  razorpayKeyId: string | null;
  currency: string;
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
  plan: {
    code: string;
    title: string;
    durationDays: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  message?: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const json = (await res.json()) as ApiResponse<T>;

    if (!res.ok) {
      const errObj = json.error || {
        code: "HTTP_" + res.status,
        message: json.message || "An error occurred with your request",
      };
      if (
        Array.isArray(errObj.details) &&
        errObj.details.length > 0 &&
        typeof (errObj.details[0] as { message?: string })?.message === "string"
      ) {
        errObj.message = (errObj.details as { field?: string; message?: string }[])
          .map((d) => (d.field ? `${d.field}: ${d.message}` : d.message))
          .filter(Boolean)
          .join(" • ");
      }
      return {
        success: false,
        error: errObj,
      };
    }

    return json;
  } catch (err) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message:
          "Unable to connect to the Education Game server. Please ensure the backend is running.",
      },
    };
  }
}

export const api = {
  // Auth
  sendRegistrationOtp: (data: { email: string; fullName?: string }) =>
    request<{ message: string }>("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  register: (data: {
    fullName: string;
    email: string;
    mobileNumber: string;
    classGrade: string;
    schoolName: string;
    city: string;
    state: string;
    password: string;
    otp: string;
    referralCode?: string;
    deviceLabel: string;
    clientPublicKeySpki?: string;
  }) => request<{ user: ApiUser; deviceBound: boolean }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  login: (data: {
    email: string;
    password: string;
    deviceLabel: string;
    clientPublicKeySpki?: string;
  }) => request<{ user: ApiUser; deviceBound: boolean }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  logout: () => request<{ message: string }>("/auth/logout", {
    method: "POST",
  }),

  getMe: () => request<{ user: ApiUser }>("/auth/me", {
    method: "GET",
  }),

  updateMyProfile: (data: {
    fullName?: string;
    mobileNumber?: string;
    schoolName?: string;
    city?: string;
    state?: string;
    password?: string;
  }) =>
    request<{ user: ApiUser }>("/auth/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  adminSetPassword: (targetUserId: number, newPassword: string) =>
    request<{ message: string }>("/auth/admin/set-password", {
      method: "POST",
      body: JSON.stringify({ targetUserId, newPassword }),
    }),

  // Admin User Management
  getStudents: (
    paramsOrSearch: string | StudentFilterParams = "",
    page = 1,
    limit = 10
  ) => {
    const q = new URLSearchParams();
    if (typeof paramsOrSearch === "string") {
      if (paramsOrSearch) q.set("search", paramsOrSearch);
      q.set("page", String(page));
      q.set("limit", String(limit));
    } else {
      if (paramsOrSearch.search) q.set("search", paramsOrSearch.search);
      if (paramsOrSearch.status && paramsOrSearch.status !== "all") {
        q.set("status", paramsOrSearch.status);
      }
      if (paramsOrSearch.planTier && paramsOrSearch.planTier !== "all") {
        q.set("planTier", paramsOrSearch.planTier);
      }
      if (paramsOrSearch.classGrade && paramsOrSearch.classGrade !== "all") {
        q.set("classGrade", paramsOrSearch.classGrade);
      }
      if (paramsOrSearch.startDate) q.set("startDate", paramsOrSearch.startDate);
      if (paramsOrSearch.endDate) q.set("endDate", paramsOrSearch.endDate);
      q.set("page", String(paramsOrSearch.page || page || 1));
      q.set("limit", String(paramsOrSearch.limit || limit || 10));
    }
    return request<{
      students: StudentListItem[];
      summary?: StudentsSummary;
      pagination?: PaginationMeta;
      page?: number;
      limit?: number;
    }>(`/users/students?${q.toString()}`, { method: "GET" });
  },

  getStudentDetails: (id: number) =>
    request<StudentFullDetails>(`/users/students/${id}`, {
      method: "GET",
    }),

  toggleStudentStatus: (id: number) =>
    request<{ isActive: boolean }>(`/users/students/${id}/status`, {
      method: "PATCH",
    }),

  updateStudent: (id: number, data: UpdateStudentInput) =>
    request<{ student: StudentListItem }>(`/users/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  resetStudentDevice: (id: number, reason: string) =>
    request<{ message: string }>(`/users/students/${id}/reset-device`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  // Classes Management
  getActiveClasses: () =>
    request<{ classes: ClassItem[] }>("/classes/active", {
      method: "GET",
    }),

  getAllClasses: () =>
    request<{ classes: ClassItem[] }>("/classes", {
      method: "GET",
    }),

  createClass: (data: { name: string; displayOrder: number; isActive: boolean }) =>
    request<{ class: ClassItem }>("/classes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateClass: (id: number, data: { name?: string; displayOrder?: number; isActive?: boolean }) =>
    request<{ class: ClassItem }>(`/classes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteClass: (id: number) =>
    request<{ message: string }>(`/classes/${id}`, {
      method: "DELETE",
    }),

  reorderClasses: (items: { id: number; displayOrder: number }[]) =>
    request<{ message: string }>("/classes/reorder", {
      method: "PATCH",
      body: JSON.stringify({ items }),
    }),

  // Activities & Journey Management
  getAdminActivities: () =>
    request<{ activities: AdminActivityItem[] }>("/activities/admin", {
      method: "GET",
    }),

  uploadActivityPackage: async (formData: FormData) => {
    const url = `${API_BASE}/activities/upload`;
    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const json = await res.json();
      return json as ApiResponse<{ activity: AdminActivityItem }>;
    } catch {
      return {
        success: false,
        error: { code: "UPLOAD_ERROR", message: "Failed to upload activity package" },
      };
    }
  },

  deleteActivityPackage: (id: number) =>
    request<{ message: string }>(`/activities/${id}`, {
      method: "DELETE",
    }),

  updateActivityConfig: (
    id: number,
    data: {
      title?: string;
      totalCheckpoints?: number;
      demoCheckpointsCount?: number;
      isActive?: boolean;
    }
  ) =>
    request<{ activity: AdminActivityItem }>(`/activities/admin/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getMyJourney: () =>
    request<StudentJourneyResponse>("/activities/my-journey", {
      method: "GET",
    }),

  advanceCheckpoint: (completedCheckpoint: number, nextCheckpoint: number, stateData?: any) =>
    request<{
      progress: {
        currentCheckpoint: number;
        maxCompletedCheckpoint: number;
        isCompleted: boolean;
        journeyState: any;
      };
      demoCompleted?: boolean;
      subscriptionRequired?: boolean;
    }>("/activities/my-journey/checkpoint", {
      method: "POST",
      body: JSON.stringify({ completedCheckpoint, nextCheckpoint, stateData }),
    }),

  // Tracking, Referrals & Payments
  getTrackingStatus: () =>
    request<TrackingStatusResponse>("/tracking/user-activity-status", {
      method: "GET",
    }),

  trackEvent: (eventType: string, classId?: number | null, metadata?: Record<string, unknown>) =>
    request<{ message: string }>("/tracking/event", {
      method: "POST",
      body: JSON.stringify({ eventType, classId, metadata }),
    }),

  validateReferral: (code: string, planPriceInr?: number) =>
    request<{
      valid: boolean;
      referralCode: string;
      referrerName: string;
      discountPercent: number;
      discountFlatInr?: number;
      discountAmount: number;
    }>("/referrals/validate", {
      method: "POST",
      body: JSON.stringify({ code, planPriceInr }),
    }),

  getPublicReferralInfo: (code: string) =>
    request<{
      valid: boolean;
      referralCode?: string;
      referrerName?: string;
      discountType?: "FLAT" | "PERCENT";
      discountValue?: number;
      reason?: string;
    }>(`/referrals/public-info/${encodeURIComponent(code)}`, {
      method: "GET",
    }),

  getMyReferralStats: () =>
    request<ReferralStatsResponse>("/referrals/my-stats", {
      method: "GET",
    }),

  getAdminReferralSettings: () =>
    request<{ settings: ReferralSettingsModel; ledger: AdminReferralLedgerItem[] }>(
      "/referrals/admin/settings",
      { method: "GET" }
    ),

  updateAdminReferralSettings: (data: {
    isEnabled?: boolean;
    maxReferralsPerStudent?: number;
    refereeDiscountType?: "FLAT" | "PERCENT";
    refereeDiscountValue?: number;
    referrerRewardType?: "FLAT" | "PERCENT";
    referrerRewardValue?: number;
    rewardTrigger?: "ON_SUBSCRIPTION" | "ON_SIGNUP";
  }) =>
    request<{ settings: ReferralSettingsModel }>("/referrals/admin/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getPlans: () =>
    request<{ plans: SubscriptionPlan[] }>("/payments/plans", {
      method: "GET",
    }),

  createOrder: (planCode: string, referralCode?: string, useWallet?: boolean) =>
    request<CreateOrderResponse & { walletDiscountUsed?: number }>("/payments/create-order", {
      method: "POST",
      body: JSON.stringify({ planCode, referralCode, useWallet }),
    }),

  verifyPayment: (gatewayOrderId: string, gatewayPaymentId: string, signature: string) =>
    request<{
      orderId: number;
      planTitle: string;
      startsAt: string;
      expiresAt: string;
      unlocked: boolean;
    }>("/payments/verify", {
      method: "POST",
      body: JSON.stringify({ gatewayOrderId, gatewayPaymentId, signature }),
    }),

  // Admin Class-Wise Plans & Promo Referrals
  getAdminPlans: () =>
    request<{ plans: AdminPlanItem[] }>("/payments/admin/plans", {
      method: "GET",
    }),

  createAdminPlan: (data: {
    classId: number | null;
    code?: string;
    title: string;
    description?: string;
    priceInr: number;
    durationDays: number;
    badge?: string;
    isActive?: boolean;
  }) =>
    request<{ plan: AdminPlanItem }>("/payments/admin/plans", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAdminPlan: (
    id: number,
    data: {
      classId?: number | null;
      title?: string;
      description?: string;
      priceInr?: number;
      durationDays?: number;
      badge?: string | null;
      isActive?: boolean;
    }
  ) =>
    request<{ plan: AdminPlanItem }>(`/payments/admin/plans/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteAdminPlan: (id: number) =>
    request<{ message: string }>(`/payments/admin/plans/${id}`, {
      method: "DELETE",
    }),

  getAdminPaymentOrders: (params?: {
    search?: string;
    status?: "ALL" | "PAID" | "PENDING" | "FAILED";
    classGrade?: string;
    gateway?: "ALL" | "RAZORPAY" | "SANDBOX";
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.status && params.status !== "ALL") q.set("status", params.status);
    if (params?.classGrade && params.classGrade !== "all") q.set("classGrade", params.classGrade);
    if (params?.gateway && params.gateway !== "ALL") q.set("gateway", params.gateway);
    if (params?.startDate) q.set("startDate", params.startDate);
    if (params?.endDate) q.set("endDate", params.endDate);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    return request<{
      orders: AdminPaymentOrderItem[];
      summary: AdminPaymentsSummary;
      pagination: PaginationMeta;
    }>(`/payments/admin/orders?${q.toString()}`, { method: "GET" });
  },

  getAdminPromoCodes: () =>
    request<{ codes: AdminPromoCodeItem[] }>("/referrals/admin/codes", {
      method: "GET",
    }),

  createAdminPromoCode: (data: {
    code?: string;
    label: string;
    discountPercent?: number;
    discountFlatInr?: number;
    maxUses?: number | null;
    expiresAt?: string;
    expiresInDays?: number;
    isActive?: boolean;
  }) =>
    request<{ code: AdminPromoCodeItem }>("/referrals/admin/codes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAdminPromoCode: (
    id: number,
    data: {
      label?: string;
      discountPercent?: number;
      discountFlatInr?: number;
      maxUses?: number | null;
      expiresAt?: string;
      expiresInDays?: number;
      isActive?: boolean;
    }
  ) =>
    request<{ code: AdminPromoCodeItem }>(`/referrals/admin/codes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteAdminPromoCode: (id: number) =>
    request<{ message: string }>(`/referrals/admin/codes/${id}`, {
      method: "DELETE",
    }),

  // Helpdesk & Support Tickets
  submitHelpdeskTicket: (data: {
    name: string;
    email: string;
    mobile?: string;
    category:
      | "LOGIN_DEVICE_LOCK"
      | "REGISTRATION_OTP"
      | "PASSWORD_RESET"
      | "PAYMENT_SUBSCRIPTION"
      | "ACTIVITY_BUG"
      | "OTHER";
    subject: string;
    description: string;
  }) =>
    request<{ ticket: SupportTicketItem }>("/helpdesk/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMyHelpdeskTickets: () =>
    request<{ tickets: SupportTicketItem[] }>("/helpdesk/my-tickets", {
      method: "GET",
    }),

  trackHelpdeskTicket: (ticketNumber: string, email: string) =>
    request<{ ticket: SupportTicketItem }>(
      `/helpdesk/track?ticketNumber=${encodeURIComponent(ticketNumber)}&email=${encodeURIComponent(email)}`,
      { method: "GET" }
    ),

  getAdminHelpdeskTickets: (params?: {
    status?: string;
    userType?: "all" | "registered" | "guest";
    category?: string;
    search?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.userType) q.set("userType", params.userType);
    if (params?.category) q.set("category", params.category);
    if (params?.search) q.set("search", params.search);
    return request<{ tickets: SupportTicketItem[]; summary: HelpdeskSummary }>(
      `/helpdesk/admin/tickets?${q.toString()}`,
      { method: "GET" }
    );
  },

  updateAdminHelpdeskTicket: (
    id: number,
    data: {
      status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
      priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      adminReply?: string;
    }
  ) =>
    request<{ ticket: SupportTicketItem }>(`/helpdesk/admin/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

export type TicketCategory =
  | "LOGIN_DEVICE_LOCK"
  | "REGISTRATION_OTP"
  | "PASSWORD_RESET"
  | "PAYMENT_SUBSCRIPTION"
  | "ACTIVITY_BUG"
  | "OTHER";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type SlaTier = "LATE_CRITICAL" | "AGING_HIGH" | "NORMAL" | "RESOLVED";

export interface SupportTicketItem {
  id: number;
  ticket_number: string;
  user_id: number | null;
  is_registered_user: boolean;
  requester_name: string;
  requester_email: string;
  requester_mobile: string | null;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  admin_reply: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  ageHours: number;
  isUnresolved: boolean;
  slaTier: SlaTier;
  studentClassGrade: string | null;
}

export interface HelpdeskSummary {
  totalAll: number;
  totalOpen: number;
  lateCriticalCount: number;
  agingHighCount: number;
  resolvedCount: number;
}

export interface AdminPaymentOrderItem {
  id: number;
  userId: number;
  studentName: string;
  studentEmail: string;
  studentMobile: string;
  studentClassGrade: string;
  planId: number;
  planCode: string | null;
  planTitle: string | null;
  planClassName: string;
  baseAmount: number;
  discountAmount: number;
  walletDiscountUsed: number;
  finalAmount: number;
  referralCodeUsed: string | null;
  status: "PENDING" | "PAID" | "FAILED";
  gateway: string;
  gatewayOrderId: string;
  gatewayPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPaymentsSummary {
  totalRevenueInr: number;
  totalBaseAmountInr: number;
  totalDiscountGivenInr: number;
  paidOrdersCount: number;
  todayRevenueInr: number;
  thisMonthRevenueInr: number;
  activePremiumStudentsCount: number;
  freeStudentsCount: number;
}
