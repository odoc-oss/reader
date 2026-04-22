import { getDomainOrigin, isInElectron, isInTauri, isOfflineMode } from '../util/env';
import { message } from 'ant-design-vue';
import {
  reportGoogleTranslateError,
  reportGoogleAPITranslateError,
} from '~/src/api/report';
import { useUserStore } from '../common/src/stores/user';

export const ELECTRON_CHANNEL_NAME = 'electron-client';
export const ELECTRON_CHANNEL_NAME_LOGIN = `${ELECTRON_CHANNEL_NAME}-login`;
export const ELECTRON_CHANNEL_EVENT_TRANSLATE_CALL = `${ELECTRON_CHANNEL_NAME}-translate-call`;

class BridgeAdaptor {
  private isElectron = isInElectron();
  login(redirectUrl?: string) {
    // 离线模式下不触发任何登录跳转
    if (isOfflineMode()) {
      console.warn('[bridge] 离线模式，跳过登录跳转');
      return;
    }
    if (this.isElectron) {
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
    } else if (isInTauri()) {
      const userStore = useUserStore();
      userStore.openLogin();
    } else {
      const userStore = useUserStore();
      userStore.openLogin();
      window.location.href = `${getDomainOrigin()}/account/login`;
    }
  }

  async translateOnTX(param: {
    secretId: string;
    secretKey: string;
    text: string;
  }) {
    if (this.isElectron) {
      const res = await (window as any).electron?.readpaperBridge?.invoke(
        ELECTRON_CHANNEL_EVENT_TRANSLATE_CALL,
        {
          method: 'tencent',
          payload: param,
        }
      );
      if (res?.code === 0) {
        return res.data;
      }
      message.error(res?.message);
    }
  }

  async translateOnAli(param: {
    accessKeyId: string;
    accessKeySecret: string;
    scene: string;
    text: string;
  }) {
    if (this.isElectron) {
      const res = await (window as any).electron?.readpaperBridge?.invoke(
        ELECTRON_CHANNEL_EVENT_TRANSLATE_CALL,
        {
          method: param.scene === 'general' ? 'ali' : 'aliPro',
          payload: param,
        }
      );
      if (res?.code === 0) {
        return res.data;
      }
      message.error(res?.message);
    }
  }

  async translateOnGoogle(param: { projectId: string; text: string }) {
    if (this.isElectron) {
      const res = await (window as any).electron?.readpaperBridge?.invoke(
        ELECTRON_CHANNEL_EVENT_TRANSLATE_CALL,
        {
          method: 'google',
          payload: param,
        }
      );
      if (res?.code === 0) {
        return res.data;
      }
      /// An error is reported only when the default translation interface is used
      if (param.text.length === 0) {
        reportGoogleTranslateError({
          source_content: param.text,
          error_message: res?.message,
          request_time: new Date().getTime(),
        });
      } else {
        reportGoogleAPITranslateError({
          source_content: param.text,
          error_message: res?.message,
          request_time: new Date().getTime(),
          api_ke: param.projectId,
        });
      }
      message.error(res?.message);
      return '';
    }
  }

  async translateOnDeepl(param: {
    authKey: string;
    text: string;
    api: string;
  }) {
    if (this.isElectron) {
      const res = await (window as any).electron?.readpaperBridge?.invoke(
        ELECTRON_CHANNEL_EVENT_TRANSLATE_CALL,
        {
          method: 'deepl',
          payload: param,
        }
      );
      if (res?.code === 0) {
        return res.data;
      }
      message.error(res?.message);
    }
  }
}

export const bridgeAdaptor = new BridgeAdaptor();
