/**
 * 设备 ID 管理工具
 * 使用 UUID v7 生成唯一的设备标识符，支持匿名登录
 */
import { v7 as uuidv7 } from 'uuid';

const DEVICE_ID_KEY = 'sea_reader_device_id';

/**
 * 生成设备 ID（UUID v7，无减号）
 */
const generateDeviceId = (): string => {
  // UUID v7 是时间有序的，去掉减号
  return uuidv7().replace(/-/g, '');
};

/**
 * 获取设备 ID，如果不存在则生成一个新的
 */
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    console.log('[device] 生成新的设备 ID:', deviceId);
  }
  
  return deviceId;
};

/**
 * 清除设备 ID（用于调试或重置）
 */
export const clearDeviceId = (): void => {
  localStorage.removeItem(DEVICE_ID_KEY);
};
