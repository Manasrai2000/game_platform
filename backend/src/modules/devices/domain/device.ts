export interface DeviceBindingResult {
  deviceId: number;
  rawDeviceToken: string | null;
  isNewBinding: boolean;
}

export interface VerifyDeviceParams {
  userId: number;
  role: "STUDENT" | "ADMIN";
  rawDeviceToken?: string;
  clientPublicKeySpki?: string;
  dbscSessionId?: string;
  deviceLabel: string;
  clientIp: string;
}
