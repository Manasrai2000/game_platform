import { deviceRepository } from "../infrastructure/device-repository";
import { VerifyDeviceParams, DeviceBindingResult } from "../domain/device";

export class DeviceLockService {
  async verifyOrBind(params: VerifyDeviceParams): Promise<DeviceBindingResult | null> {
    return await deviceRepository.verifyOrBindDevice(params);
  }

  async adminRevoke(
    adminUserId: number,
    targetUserId: number,
    reason: string,
    adminIp: string
  ): Promise<void> {
    await deviceRepository.adminRevokeDevice(adminUserId, targetUserId, reason, adminIp);
  }
}

export const deviceLockService = new DeviceLockService();
