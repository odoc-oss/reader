<template>
  <div class="login-box">
    <div class="logo">
      <div class="logo-text">ODOC.AI</div>
    </div>
    <h1 class="title">{{ t('account.loginPage.title') }}</h1>
    
    <!-- Google 登录块 -->
    <div v-if="loginConfig?.isGoogleLoginEnabled" class="social-login">
      <button class="google-btn" @click="handleGoogleLogin">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
        {{ t('account.loginPage.continueWithGoogle') }}
      </button>
    </div>
    
    <!-- 用户名密码登录块 -->
    <div v-if="loginConfig?.isUsernamePasswordLoginEnabled" class="username-password-login">
      <div v-if="loginConfig?.isGoogleLoginEnabled" class="divider">
        <span>{{ t('account.loginPage.orContinueWithEmail') }}</span>
      </div>
      
      <a-form :model="formState" @finish="handleSubmit" class="login-form">
        <a-form-item
          name="email"
          :rules="[{ required: true, message: t('account.loginPage.emailRequired') }]"
        >
          <a-input 
            v-model:value="formState.email" 
            type="email" 
            :placeholder="t('account.loginPage.emailPlaceholder')"
            size="large"
            class="email-input"
            :style="{ lineHeight: '24px' }"
          >
            <template #prefix>
              <mail-outlined class="form-icon" />
            </template>
          </a-input>
        </a-form-item>
        
        <a-form-item
          name="password"
          :rules="[{ required: true, message: t('account.loginPage.passwordRequired') }]"
        >
          <a-input-password 
            v-model:value="formState.password" 
            :placeholder="t('account.loginPage.passwordPlaceholder')"
            size="large"
            class="password-input"
            :style="{ lineHeight: '24px' }"
          >
            <template #prefix>
              <lock-outlined class="form-icon" />
            </template>
          </a-input-password>
        </a-form-item>
        
        <div v-if="loginConfig?.isForgetPasswordEnabled" class="forgot-password">
          <a href="#" @click.prevent="handleForgotPassword">{{ t('account.loginPage.forgotPassword') }}</a>
        </div>
        
        <a-form-item>
          <a-button 
            type="primary" 
            html-type="submit" 
            class="login-btn" 
            block 
            size="large"
            :loading="isLoading"
          >
            {{ t('account.loginPage.signIn') }}
          </a-button>
        </a-form-item>
      </a-form>
    </div>
    
    <!-- 注册链接 -->
    <div v-if="loginConfig?.isRegisterEnabled" class="signup">
      <p>{{ t('account.loginPage.newToOdoc') }} <a href="#" @click.prevent="handleSignUp">{{ t('account.loginPage.createAccount') }}</a></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { MailOutlined, LockOutlined } from '@ant-design/icons-vue';
import { useUserStore } from '@common/stores/user';
import { signIn } from '~/src/util/login';
import { useI18n } from 'vue-i18n';
import { getLoginPageConfig } from '~/src/api/membership';
import type { GetLoginPageConfigResponse } from 'go-sea-proto/gen/ts/membership/MembershipApi';

const props = defineProps<{
  /** 是否在弹窗中使用 */
  isDialog?: boolean;
}>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const userStore = useUserStore();
const { t } = useI18n();

const formState = reactive({
  email: '',
  password: ''
});

const isLoading = ref(false);

// 登录页面配置
const loginConfig = ref<GetLoginPageConfigResponse | null>(null);

onMounted(() => {
  getConfig();
});

const getConfig = async () => {
  try {
    const res = await getLoginPageConfig();
    if (res) {
      loginConfig.value = res;
    } else {
      loginConfig.value = {
        isGoogleLoginEnabled: true,
        isUsernamePasswordLoginEnabled: true,
        isRegisterEnabled: true,
        isForgetPasswordEnabled: true
      };
    }
  } catch (error) {
    console.error('获取登录配置出错:', error);
    loginConfig.value = {
      isGoogleLoginEnabled: true,
      isUsernamePasswordLoginEnabled: true,
      isRegisterEnabled: true,
      isForgetPasswordEnabled: true
    };
  }
};

// 处理表单提交
const handleSubmit = async () => {
  isLoading.value = true;
  try {
    const res = await signIn(formState.email, formState.password);
    if (!res) {
      message.error(t('account.loginPage.loginFailed'));
      return;
    }

    // 登录成功后，获取用户信息
    await userStore.getUserInfo();
    
    if (!userStore.isLogin()) {
      message.error('Login failed, please try again');
      return;
    }

    message.success(t('account.loginPage.loginSuccess') || 'Login successful');
    emit('success');
    
    // 如果是弹窗模式，刷新页面
    if (props.isDialog) {
      window.location.reload();
    }
  } catch (error) {
    console.error('登录失败:', error);
    message.error(t('account.loginPage.loginFailed'));
  } finally {
    isLoading.value = false;
  }
};

// Google 登录
const handleGoogleLogin = () => {
  window.location.href = '/api/oauth2/google/login';
};

// 忘记密码
const handleForgotPassword = () => {
  message.info('密码重置功能暂时不可用');
};

// 注册
const handleSignUp = () => {
  message.info('注册功能暂时不可用');
};
</script>

<style lang="less" scoped>
.login-box {
  width: 100%;
  max-width: 420px;
  padding: 40px;
  background-color: var(--site-theme-bg-secondary);
  border-radius: 12px;
  box-shadow: var(--site-theme-shadow-3);
  border: 1px solid var(--site-theme-divider);
  transition: background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.logo {
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
  
  .logo-text {
    font-size: 32px;
    font-weight: 700;
    background: linear-gradient(90deg, var(--site-theme-brand) 0%, var(--site-theme-brand-light) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: 1px;
  }
}

.title {
  text-align: center;
  font-size: 28px;
  margin-bottom: 24px;
  font-weight: 600;
  color: var(--site-theme-text-primary);
}

.social-login {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
  
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 6px;
    border: 1px solid var(--site-theme-divider);
    background-color: var(--site-theme-background-hover);
    color: var(--site-theme-text-primary);
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
    
    img {
      width: 20px;
      height: 20px;
    }
    
    &:hover {
      background-color: var(--site-theme-background-hover);
      border-color: var(--site-theme-brand);
      transform: translateY(-2px);
    }
  }
}

.username-password-login {
  margin-bottom: 24px;
}

.divider {
  display: flex;
  align-items: center;
  margin: 24px 0;
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background-color: var(--site-theme-divider);
  }
  
  span {
    padding: 0 16px;
    color: var(--site-theme-text-secondary-color);
    font-size: 14px;
    font-weight: 500;
  }
}

// 自定义 Ant Design 组件样式
:deep(.ant-form) {
  .ant-form-item {
    margin-bottom: 20px;
    position: relative;
  }
  
  .ant-form-item-explain-error {
    color: var(--site-theme-danger-color);
    font-size: 12px;
    margin-top: 4px;
  }
  
  .ant-input,
  .ant-input-password {
    width: 100%;
    height: 48px;
    padding: 12px 16px 12px 45px;
    border-radius: 6px;
    border: 1px solid var(--site-theme-divider);
    background-color: var(--site-theme-bg-mute);
    color: var(--site-theme-text-primary);
    font-size: 15px;
    transition: all 0.3s;
    box-shadow: none;
    display: flex;
    align-items: center;
    
    &:focus,
    &-focused {
      outline: none;
      border-color: var(--site-theme-brand);
      box-shadow: 0 0 0 2px var(--site-theme-primary-color-fade);
    }
    
    &::placeholder {
      color: var(--site-theme-placeholder-color);
      line-height: 24px;
      vertical-align: middle;
    }
  }
  
  .ant-input-password {
    display: flex;
    align-items: center;
    padding-left: 45px;
    
    .ant-input {
      background-color: transparent;
      border: none;
      padding-left: 0;
      height: 24px;
      box-shadow: none;
      line-height: 24px;
    }
  }
  
  .email-input,
  .password-input {
    .ant-input-prefix {
      position: absolute;
      left: 0;
      height: 100%;
      display: flex;
      align-items: center;
      padding-left: 16px;
    }
  }
  
  .email-input {
    border: 1px solid var(--site-theme-divider);
    border-radius: 6px;
    overflow: hidden;
    background-color: var(--site-theme-bg-mute) !important;
    height: 48px;
    padding-left: 45px;
    display: flex;
    align-items: center;
    
    .ant-input {
      border: none;
      box-shadow: none;
      background-color: transparent !important;
      padding-left: 0;
      height: 100%;
      line-height: 24px;
    }
    
    &.ant-input-affix-wrapper-focused,
    &:hover,
    &:focus {
      background-color: var(--site-theme-bg-mute) !important;
    }
  }
  
  .password-input {
    .ant-input-password-icon {
      margin-right: 0px;
    }
  }
  
  .ant-input-password-icon {
    color: var(--site-theme-text-secondary-color);
  }
  
  .form-icon {
    color: var(--site-theme-text-secondary-color);
    font-size: 20px;
    margin-right: 8px;
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
  }
  
  .ant-btn {
    width: 100%;
    padding: 12px;
    height: auto;
    border-radius: 6px;
    border: none;
    background: linear-gradient(90deg, #6889ff 0%, #8662e9 50%, #e74694 100%);
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.3s;
    
    &:hover {
      background: linear-gradient(90deg, #7a97ff 0%, #9775f0 50%, #f05da6 100%);
      transform: translateY(-2px);
      box-shadow: var(--site-theme-shadow-2);
    }
  }
}

.forgot-password {
  text-align: right;
  margin-bottom: 20px;
  
  a {
    color: var(--site-theme-brand);
    font-size: 14px;
    text-decoration: none;
    transition: all 0.3s;
    
    &:hover {
      color: var(--site-theme-brand-light);
      text-decoration: underline;
    }
  }
}

.login-form {
  margin-bottom: 10px;
  
  :deep(.ant-form-item-control-input) {
    box-shadow: none;
    border: none;
  }
  
  :deep(.ant-form-item-has-error) {
    .ant-input, .ant-input-password {
      border-color: var(--site-theme-danger-color);
    }
  }
  
  /* 覆盖浏览器自动填充的背景色 */
  :deep(input:-webkit-autofill),
  :deep(input:-webkit-autofill:hover), 
  :deep(input:-webkit-autofill:focus),
  :deep(input:-webkit-autofill:active) {
    -webkit-box-shadow: 0 0 0 30px var(--site-theme-bg-mute) inset !important;
    -webkit-text-fill-color: var(--site-theme-text-color) !important;
    transition: background-color 5000s ease-in-out 0s;
  }
}

.login-btn {
  width: 100%;
  padding: 12px;
  border-radius: 6px;
  border: none;
  background: linear-gradient(90deg, #6889ff 0%, #8662e9 50%, #e74694 100%);
  color: var(--site-theme-text-inverse);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    background: linear-gradient(90deg, #7a97ff 0%, #9775f0 50%, #f05da6 100%);
    transform: translateY(-2px);
    box-shadow: var(--site-theme-shadow-2);
  }
}

.signup {
  margin-top: 24px;
  text-align: center;
  font-size: 15px;
  color: var(--site-theme-text-secondary-color);
  
  a {
    color: var(--site-theme-brand);
    text-decoration: none;
    font-weight: 500;
    transition: all 0.3s;
    
    &:hover {
      color: var(--site-theme-brand-light);
      text-decoration: underline;
    }
  }
}
</style>
