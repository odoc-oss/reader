<template>
  <div class="login-container">
    <LoginForm @success="handleLoginSuccess" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@common/stores/user';
import { initTheme } from '@common/theme';
import LoginForm from '~/src/components/Login/LoginForm.vue';

// 确保主题正确初始化
onMounted(() => {
  if (typeof window !== 'undefined') {
    initTheme();
  }
});

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

// 如果已登录，跳转到来源页面或首页
const checkLoginStatus = async () => {
  if (userStore.isLogin()) {
    const redirect = route.query.redirect as string || '/workbench';
    router.replace(redirect);
  }
};

onMounted(() => {
  checkLoginStatus();
});

// 登录成功后跳转
const handleLoginSuccess = () => {
  const redirect = route.query.redirect as string || '/workbench';
  router.replace(redirect);
};
</script>

<style lang="less" scoped>
/* 登录页面容器 */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--site-theme-bg-primary);
  color: var(--site-theme-text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}
</style>