
import api from './axios';
import { SuccessResponse } from './type';

/**
 * 根据文件大小计算合适的超时时间
 * @param fileSize 文件大小（字节）
 * @returns 超时时间（毫秒）
 */
function calculateTimeout(fileSize: number): number {
  const fileSizeMB = fileSize / (1024 * 1024);
  // 基础超时 30 秒 + 每 100MB 增加 60 秒
  const timeout = 30000 + Math.ceil(fileSizeMB / 100) * 60000;
  // 最大超时 30 分钟（与后端保持一致）
  return Math.min(timeout, 30 * 60 * 1000);
}

/**
 * 上传 ZIP 文件以导入数据
 * @param formData 包含文件的 FormData 对象
 * @param onUploadProgress 上传进度回调函数
 * @param fileSize 文件大小（字节），用于计算超时时间
 */
export const importZip = (
  formData: FormData,
  onUploadProgress: (progressEvent: any) => void,
  fileSize?: number
) => {
  const timeout = fileSize ? calculateTimeout(fileSize) : 5 * 60 * 1000;
  
  console.log('[API/importZip] 准备发起请求:', {
    fileSize: fileSize ? (fileSize / 1024 / 1024).toFixed(2) + 'MB' : '未知',
    timeout: timeout + 'ms (' + (timeout / 1000 / 60).toFixed(1) + '分钟)',
    endpoint: '/sync/import-zip'
  });
  
  return api.post<SuccessResponse<{ status: number }>>('/sync/import-zip', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      console.log('[API/importZip] 进度事件:', progressEvent);
      onUploadProgress(progressEvent);
    },
    timeout,
  }).then(response => {
    console.log('[API/importZip] 请求成功:', response);
    return response;
  }).catch(error => {
    console.error('[API/importZip] 请求失败:', error);
    throw error;
  });
};
