// import { useUserStore } from '@common/stores/user'

import { getDomainOrigin, isInElectron } from '../utils/env';

export const ELECTRON_CHANNEL_NAME = 'electron-client';
export const ELECTRON_CHANNEL_NAME_LOGIN = `${ELECTRON_CHANNEL_NAME}-login`;

const isOfflineMode = () => import.meta.env.VITE_OFFLINE_MODE === 'true';

class BridgeAdaptor {
  private isElectron = isInElectron();
  login(redirectUrl?: string) {
    // 离线模式下不触发任何登录跳转
    if (isOfflineMode()) {
      console.warn('[bridge/common] 离线模式，跳过登录跳转');
      return;
    }
    if (this.isElectron) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).electron?.readpaperBridge?.invoke(
        ELECTRON_CHANNEL_NAME_LOGIN,
        {
          method: 'openLogin',
        }
      );
    } else if (redirectUrl) {
      window.location.replace(
        `${getDomainOrigin()}/login?redirect_url=${encodeURIComponent(
          redirectUrl
        )}`
      );
    } else {
      // const userStore = useUserStore();
      // userStore.openLogin();
    }
  }
}

export const bridgeAdaptor = new BridgeAdaptor();
