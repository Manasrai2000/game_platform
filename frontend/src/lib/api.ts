/**
 * API Client for Modular Monolith Backend
 * Configured with credentials: 'include' to handle HttpOnly cookies automatically.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

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
  activeDeviceId: number | null;
  activeDeviceLabel: string | null;
  activeDeviceLastSeen: string | null;
  activeDeviceBoundIp: string | null;
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
    playUrl: string;
  };
  progress?: {
    currentCheckpoint: number;
    maxCompletedCheckpoint: number;
    isCompleted: boolean;
    journeyState: any;
    lastPlayedAt: string;
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
      return {
        success: false,
        error: json.error || {
          code: "HTTP_" + res.status,
          message: json.message || "An error occurred with your request",
        },
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
  register: (data: {
    fullName: string;
    email: string;
    mobileNumber: string;
    classGrade: string;
    schoolName: string;
    city: string;
    state: string;
    password: string;
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

  adminSetPassword: (targetUserId: number, newPassword: string) =>
    request<{ message: string }>("/auth/admin/set-password", {
      method: "POST",
      body: JSON.stringify({ targetUserId, newPassword }),
    }),

  // Admin User Management
  getStudents: (search = "", page = 1, limit = 10) =>
    request<{
      students: StudentListItem[];
      pagination?: PaginationMeta;
      page?: number;
      limit?: number;
    }>(
      `/users/students?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`,
      { method: "GET" }
    ),

  toggleStudentStatus: (id: number) =>
    request<{ isActive: boolean }>(`/users/students/${id}/status`, {
      method: "PATCH",
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
    }>("/activities/my-journey/checkpoint", {
      method: "POST",
      body: JSON.stringify({ completedCheckpoint, nextCheckpoint, stateData }),
    }),
};
