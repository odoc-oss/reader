<template>
  <div class="import-data-container">
    <div class="upload-card">
      <h2>{{ t('workbench.importData') }}</h2>
      <p class="upload-subtitle">{{ t('importData.uploadZipDescription') }}</p>

      <!-- 上传中或已完成的状态显示 -->
      <div v-if="uploadStore.status !== 'idle'" class="upload-status">
        <div v-if="uploadStore.status === 'uploading'" class="upload-progress">
          <p class="upload-file-name">{{ uploadStore.fileName }} ({{ uploadStore.formatFileSize(uploadStore.fileSize) }})</p>
          <a-progress :percent="uploadStore.progress" :stroke-width="8" status="active" />
          <p class="upload-hint-text">{{ t('importData.uploadingHint') }}</p>
        </div>
        <div v-else-if="uploadStore.status === 'success'" class="upload-result success">
          <check-circle-outlined class="result-icon success-icon" />
          <p>{{ uploadStore.fileName }} {{ t('importData.uploadSuccess') }}</p>
          <a-button type="link" @click="uploadStore.resetState()">{{ t('importData.uploadAnother') }}</a-button>
        </div>
        <div v-else-if="uploadStore.status === 'error'" class="upload-result error">
          <close-circle-outlined class="result-icon error-icon" />
          <p>{{ uploadStore.fileName }} {{ t('importData.uploadFailed') }}</p>
          <p class="error-detail">{{ uploadStore.errorMsg }}</p>
          <a-button type="link" @click="uploadStore.resetState()">{{ t('importData.retryUpload') }}</a-button>
        </div>
      </div>

      <!-- 上传区域：仅在空闲时显示 -->
      <a-upload-dragger
        v-if="uploadStore.status === 'idle'"
        v-model:fileList="fileList"
        name="file"
        :multiple="false"
        accept=".zip"
        :customRequest="customUpload"
        :before-upload="beforeUpload"
        @change="handleChange"
        @drop="handleDrop"
      >
        <p class="ant-upload-drag-icon">
          <inbox-outlined></inbox-outlined>
        </p>
        <p class="ant-upload-text">{{ t('importData.dragOrClick') }}</p>
        <p class="ant-upload-hint">
          {{ t('importData.dragOrClickHint') }}
        </p>
      </a-upload-dragger>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { InboxOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import type { UploadChangeParam, UploadProps } from 'ant-design-vue';
import { useUploadStore } from '@/stores/uploadStore';

const { t } = useI18n();
const fileList = ref([]);
const uploadStore = useUploadStore();

const beforeUpload: UploadProps['beforeUpload'] = file => {
  const isZip = file.type === 'application/zip' || file.name.endsWith('.zip');
  if (!isZip) {
    message.error(t('importData.zipOnlyError'));
  }
  const isLt2G = file.size / 1024 / 1024 < 2048;
  if (!isLt2G) {
    message.error(t('importData.sizeLimitError'));
  }
  return isZip && isLt2G;
};

const handleChange = (info: UploadChangeParam) => {
  const { status } = info.file;
  if (status !== 'uploading') {
    console.log(info.file, info.fileList);
  }
};

function handleDrop(e: DragEvent) {
  console.log(e);
}

const customUpload = async (options: any) => {
  const { file, onSuccess, onError, onProgress } = options;

  // 监听 store 进度变化，同步给上传组件
  const stopWatch = watch(() => uploadStore.progress, (percent) => {
    onProgress({ percent }, file);
  });

  try {
    const response = await uploadStore.uploadFile(file);
    onSuccess(response?.data, file);
  } catch (error) {
    onError(error);
  } finally {
    stopWatch();
  }
};
</script>

<style lang="less" scoped>
.import-data-container {
  display: flex;
  justify-content: center;
  align-items: flex-start; /* 改为flex-start以避免垂直方向过度拉伸 */
  padding-top: 5%; /* 顶部留出一些空间 */
  height: 100%;
  background-color: var(--site-theme-background);
}

.upload-card {
  width: 100%;
  max-width: 680px;
  padding: 40px;
  background-color: var(--site-theme-background-secondary);
  border-radius: 8px;
  border: 1px solid var(--site-theme-border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  text-align: center;

  h2 {
    font-size: 24px;
    color: var(--site-theme-text-color);
    margin-bottom: 8px;
  }

  .upload-subtitle {
    font-size: 14px;
    color: var(--site-theme-text-secondary-color);
    margin-bottom: 24px;
  }
}

:deep(.ant-upload-drag-icon .anticon) {
  color: var(--site-theme-primary-color);
  font-size: 48px;
}

:deep(.ant-upload-text) {
  color: var(--site-theme-text-color);
  font-size: 16px;
}

:deep(.ant-upload-hint) {
  color: var(--site-theme-text-secondary-color);
}

.upload-status {
  padding: 24px 0;
}

.upload-progress {
  text-align: left;

  .upload-file-name {
    font-size: 14px;
    color: var(--site-theme-text-color);
    margin-bottom: 12px;
    word-break: break-all;
  }

  .upload-hint-text {
    font-size: 12px;
    color: var(--site-theme-text-secondary-color);
    margin-top: 8px;
  }
}

.upload-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  .result-icon {
    font-size: 48px;
  }

  &.success .success-icon {
    color: #52c41a;
  }

  &.error .error-icon {
    color: #ff4d4f;
  }

  p {
    font-size: 14px;
    color: var(--site-theme-text-color);
    margin: 0;
  }

  .error-detail {
    font-size: 12px;
    color: var(--site-theme-text-secondary-color);
  }
}
</style>
