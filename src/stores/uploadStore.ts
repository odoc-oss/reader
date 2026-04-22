import { defineStore } from 'pinia';
import { ref } from 'vue';
import { notification } from 'ant-design-vue';
import { importZip } from '@/api/syncdata';
import { isInTauri } from '@/util/env';

export const useUploadStore = defineStore('importUpload', () => {
  const isUploading = ref(false);
  const progress = ref(0);
  const fileName = ref('');
  const fileSize = ref(0);
  const status = ref<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const errorMsg = ref('');

  const uploadFile = async (file: File) => {
    if (isUploading.value) return;

    isUploading.value = true;
    progress.value = 0;
    fileName.value = file.name;
    fileSize.value = file.size;
    status.value = 'uploading';
    errorMsg.value = '';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await importZip(
        formData,
        ({ total, loaded }) => {
          if (total) {
            progress.value = Math.round((loaded / total) * 100);
          }
        },
        file.size
      );

      status.value = 'success';
      if (isInTauri()) {
        notification.success({
          message: '导入完成',
          description: `${file.name} 导入成功`,
          duration: 5,
          key: 'import-upload',
        });
      }
      return response;

    } catch (err) {
      status.value = 'error';
      errorMsg.value = err instanceof Error ? err.message : '导入失败';
      if (isInTauri()) {
        notification.error({
          message: '导入失败',
          description: `${file.name} ${errorMsg.value}`,
          duration: 8,
          key: 'import-upload',
        });
      }
      throw err;
    } finally {
      isUploading.value = false;
    }
  };

  const resetState = () => {
    isUploading.value = false;
    progress.value = 0;
    fileName.value = '';
    fileSize.value = 0;
    status.value = 'idle';
    errorMsg.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  };

  return {
    isUploading,
    progress,
    fileName,
    fileSize,
    status,
    errorMsg,
    uploadFile,
    resetState,
    formatFileSize,
  };
});
