// requestIdleCallback polyfill for macOS WKWebView
if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  (window as any).requestIdleCallback = (cb: IdleRequestCallback, options?: IdleRequestOptions) => {
    const start = Date.now();
    return window.setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      } as IdleDeadline);
    }, options?.timeout ?? 1) as unknown as number;
  };
  (window as any).cancelIdleCallback = (id: number) => window.clearTimeout(id);
}

import { createApp } from 'vue';
import App from './App.vue';
import Antd, { message } from 'ant-design-vue';
import router from './routes';
import { useStore } from 'vuex';
import { setupInterceptors } from './api/interceptors';

import PerfectScrollbar from 'vue3-perfect-scrollbar';
import 'vue3-perfect-scrollbar/dist/vue3-perfect-scrollbar.css';

import './assets/less/tailwind.css';
import './assets/less/font.less'

import 'tippy.js/dist/tippy.css';

// 替代阿里 iconfont
import '@idea/aiknowledge-icon/dist/css/iconfont.css';

import './assets/less/antd.less';
import './assets/less/pdf.less';
import './assets/less/style.less';
import { isInElectron, isInTauri } from './util/env';
import { usePinaStore } from './stores';

// 导入主题相关
import './theme'
import './assets/less/theme.less'
import i18n from './locals/i18n';
import { resetLSCurrentTranslateTabKey } from './stores/translateStore';

// 导入 Microsoft Clarity 服务
import { initClarity } from './utils/clarity';

import { useUserStore } from './common/src/stores/user';
import { getCurrentLanguage } from './locals/i18n';
import { tryAnonymousLogin } from './util/login';
import { isOfflineMode } from './util/env';

if (!isInElectron()) {
  message.config({
    top: '60px',
  });
}

// 初始化存储服务，包括迁移旧键名数据到新键名
const initStorage = () => {
  console.log('Storage service initialized');
};

// 在应用初始化之前就启动 Clarity
if (!isInElectron() && typeof window !== 'undefined') {
  initClarity();
}

const initApp = (container: string | Element = '#app') => {
  // 初始化存储服务
  initStorage();
  
  // 初始化 Axios 拦截器
  setupInterceptors();
  
  // initSentry();

  const app = createApp(App);
  
  // 在 Vue 应用创建后初始化语言设置
  console.log('[main.ts] 开始初始化语言设置');
  // 直接使用统一语言服务，不依赖 Vue Hook
  import('./shared/language/service').then(({ getLanguageCookie, setLanguageCookie, getDefaultLanguage }) => {
    const cookieLang = getLanguageCookie();
    if (!cookieLang) {
      // 没有 Cookie 时设置默认语言
      const defaultLang = getDefaultLanguage();
      setLanguageCookie(defaultLang);
      console.log(`[main.ts] 设置默认语言: ${defaultLang}`);
    } else {
      console.log(`[main.ts] 读取到语言Cookie: ${cookieLang}`);
    }
    console.log('[main.ts] 语言初始化完成');
  }).catch(error => {
    console.error('[main.ts] 语言初始化失败:', error);
  });

  const pinaStore = usePinaStore()

  app.use(pinaStore);

  // 不要直接使用 useStore 作为插件，这会导致 Vue 警告
  
  app.use(router);

  app.use(Antd);

  app.use(PerfectScrollbar);

  app.use(i18n);

  app.mount(container);

  resetLSCurrentTranslateTabKey();

  return app;
};

const getRedirectPath = () => {
  // 从 i18n store 获取当前语言设置
  const lang = getCurrentLanguage();
  console.log('lang', lang);
  return lang.toLowerCase().startsWith('zh') ? '/docs/zh/' : '/docs/';
};

const startup = async () => {
  const pinaStore = usePinaStore();
  const userStore = useUserStore(pinaStore);

  if (isOfflineMode()) {
    // 离线模式：注入 mock 用户数据，跳过所有登录流程
    console.log('[main.ts] 离线模式已启用，跳过登录验证');
    const { createOfflineUser, createOfflineMembershipInfo } = await import('./util/offlineMode');
    userStore.setOfflineUserInfo(createOfflineUser(), createOfflineMembershipInfo());
  } else {
    await userStore.getUserInfo();
    if (!userStore.isLogin()) {
      const isLogin = await tryAnonymousLogin()
      if (window.location.pathname === '/') {
        window.location.href = getRedirectPath();
        return;
      }
      if(isLogin) {
        await userStore.getUserInfo();
      }
    }
  }
  // Tauri 环境下获取云端服务状态（仅调用一次，结果缓存到 store）
  if (isInTauri()) {
    console.log('[main.ts] Tauri 环境，准备调用 getServiceOff');
    const { getServiceOff } = await import('./api/system');
    const { useServiceOffStore } = await import('./stores/serviceOffStore');
    const serviceOffStore = useServiceOffStore(pinaStore);
    try {
      console.log('[main.ts] 开始调用 getServiceOff API...');
      const res = await getServiceOff();
      console.log('[main.ts] getServiceOff 返回结果:', res);
      serviceOffStore.setServiceOff(res);
    } catch (e) {
      console.error('[main.ts] getServiceOff 调用失败:', e);
      serviceOffStore.setServiceOff({ off: false });
    }
  }

  // 检查通过或无需检查，正常初始化应用
  initApp();
};

// 启动应用
startup();

// 同时导出，以便其他地方可以使用
export default initApp;
