<template>
  <a-modal
    v-model:visible="visible"
    destroy-on-close
    :title="null"
    :footer="null"
    :closable="false"
    :width="500"
    class="login-modal"
    :mask-closable="true"
    @cancel="closeLoginDialog"
  >
    <div class="close-btn" @click="closeLoginDialog">
      <close-outlined style="font-size: 18px" />
    </div>
    <div class="login-content">
      <LoginForm :is-dialog="true" @success="closeLoginDialog" />
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { CloseOutlined } from '@ant-design/icons-vue';
import { useUserStore } from '@common/stores/user';
import LoginForm from '~/src/components/Login/LoginForm.vue';

defineProps<{ showCancel?: boolean; isWebEN?: boolean }>();

const userStore = useUserStore();

const visible = ref(false);

watch(
  () => userStore.loginDialogVisible,
  (val) => {
    visible.value = val;
  },
  { immediate: true }
);

const closeLoginDialog = () => {
  userStore.closeLogin();
};
</script>

<style lang="less" scoped>
.login-content {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.close-btn {
  position: absolute;
  right: 16px;
  top: 16px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  color: var(--site-theme-text-secondary-color);
  transition: all 0.3s;
  z-index: 10;
  
  &:hover {
    background-color: var(--site-theme-background-hover);
    color: var(--site-theme-text-primary);
  }
}
</style>

<style lang="less">
.login-modal {
  .ant-modal-content {
    background-color: var(--site-theme-bg-secondary);
    border-radius: 12px;
    overflow: hidden;
  }
  
  .ant-modal-body {
    padding: 0;
  }
  
  // 弹窗内的 login-box 不需要额外的边框和阴影
  .login-box {
    box-shadow: none;
    border: none;
  }
}
</style>
