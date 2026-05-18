import { defineStore } from 'pinia';
import { ServiceOffResponse } from 'go-sea-proto/gen/ts/system/System';
import { isInTauri } from '../util/env';

export const useServiceOffStore = defineStore('serviceOff', {
  state: (): ServiceOffResponse => ({
    off: true,
  }),
  getters: {
    /** 云端解析服务是否可用（非 Tauri 环境始终返回 true） */
    isServiceOn(): boolean {
      if (!isInTauri()) return true;
      return this.off;
    },
  },
  actions: {
    setServiceOff(response: ServiceOffResponse) {
      this.off = response.off;
    },
  },
});
