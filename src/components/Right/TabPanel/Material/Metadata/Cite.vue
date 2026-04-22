<template>
  <div class="metadata-cite-container">
    <div 
      :class="['cite-wrapper', { 'disabled': !serviceOffStore.isServiceOn }]"
      @click="handleCiteClick"
    >
      <PaperCite
        class="cite-wrap"
        :paper-id="paperId || ''"
        :pdf-id="pdfId || ''"
        :page-type="PageType.note"
        :type-parameter="pdfId || ''"
        @update:success="onUpdateSuccess"
      >
        <i
          class="aiknowledge-icon icon-cite"
          aria-hidden="true"
        >
          {{
            $t('viewer.quoteLabel')
          }}
        </i>
      </PaperCite>
    </div>
    <Update
      :pdf-id="pdfId || ''"
      :paper-id="paperId || ''"
      @update:success="onUpdateSuccess"
      @loading="onUpdateLoading"
    />

    <!-- 移除了原来的 Modal 组件，现在使用 PaperCite 组件来处理 -->
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { selfNoteInfo, store } from '~/src/store';
import { PageType, getPdfIdFromUrl } from '@/api/report';
import Update from './Update.vue';
import PaperCite from '@/components/Paper/Quote/cite.vue';
import { useEnvStore } from '~/src/stores/envStore';
import { useServiceOffStore } from '~/src/stores/serviceOffStore';

const props = defineProps<{
  paperId?: string;
  pdfId?: string;
}>();

const pdfId = selfNoteInfo.value?.pdfId ?? getPdfIdFromUrl();

const emit = defineEmits<{
  (event: 'update:success'): void;
}>();
const onUpdateSuccess = () => {
  emit('update:success');
};

const onUpdateLoading = (loading: boolean) => {
  // 简化处理，不再需要发送消息
};

const envStore = useEnvStore();
const serviceOffStore = useServiceOffStore();

const handleCiteClick = (e: Event) => {
  if (!serviceOffStore.isServiceOn) {
    e.preventDefault();
    e.stopPropagation();
  }
};
</script>

<style lang="less" scoped>
@import url('./Cite.less');
.metadata-cite-container {
  display: flex;
  color: var(--site-theme-text-primary);
}

.cite-wrapper {
  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
}
</style>
<style lang="less">
.cite-modal-wrap,
.manage-citation-style-modal {
  .ant-modal-content {
    .ant-modal-header {
      background: var(--site-theme-bg-light);
      border: none;
      .ant-modal-title {
        font-family: 'Noto Sans SC';
        font-weight: 600;
        font-size: 15px;
        line-height: 24px;
        color: var(--site-theme-text-primary);
      }
    }
    .ant-modal-close-icon {
      color: var(--site-theme-text-secondary);
    }
    .ant-modal-body {
      background: var(--site-theme-bg-light);
      .cite-modal-content {
        margin: -24px;
        padding: 0 20px 20px;
      }
    }
  }
}
.manage-citation-style-modal {
  .ant-modal-content {
    margin: 32px 0 0 24px;
    width: 100%;
  }
}
.cite-iframe {
  border-width: 0;
}
</style>
