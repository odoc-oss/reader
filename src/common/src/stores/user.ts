import { defineStore } from 'pinia';
// import { getUserInfo } from '~/src/api/user';
import { doLogout } from '~/src/api/user';
import { User } from 'go-sea-proto/gen/ts/user/User'
import { MembershipType, UserMembershipInfo } from 'go-sea-proto/gen/ts/membership/MembershipApi';
import { getMembershipUserInfo, getUserCredit } from '~/src/api/membership';
import { UserRole } from 'go-sea-proto/gen/ts/user/UserRole';
export interface UserState {
  userInfo?: User;
  membershipInfo?: UserMembershipInfo;
  loginDialogVisible: boolean;
}

export const useUserStore = defineStore('user', {
  state: (): UserState => (
    { loginDialogVisible: false }
  ),
  actions: {
    isLogin() {
      return !!this.userInfo;
    },
    async getUserInfo() {
      const userAndMembershipInfo = await getMembershipUserInfo();
      if (userAndMembershipInfo) {
        console.log(userAndMembershipInfo)
        this.userInfo = userAndMembershipInfo.user;
        this.membershipInfo = userAndMembershipInfo.info;
      }
    },
    isAnonymous() {
      return this.userInfo?.roles?.includes(UserRole.ROLE_GUEST);
    },
    openLogin() {
      this.loginDialogVisible = true;
    },
    closeLogin() {
      this.loginDialogVisible = false;
    },
    async refreshUserCredits() {
      const userCredits  = await getUserCredit();
      if (userCredits) {
        console.log(userCredits)
        if (this.membershipInfo?.baseInfo) {
          // Coerce incoming values (number|string|bigint|undefined) to bigint safely
          const toBigInt = (v: unknown): bigint => {
            if (typeof v === 'bigint') return v;
            if (typeof v === 'number') return BigInt(Math.trunc(v));
            if (typeof v === 'string' && v !== '') return BigInt(v);
            return 0n;
          };
          this.membershipInfo.baseInfo.credit = toBigInt(userCredits.credit ?? 0);
          this.membershipInfo.baseInfo.addOnCredit = toBigInt(userCredits.addOnCredit ?? 0);
        }
      }
    },
    getTotalCredits() {
      const credit = Number(this.membershipInfo?.baseInfo?.credit || 0);
      const addOnCredit = Number(this.membershipInfo?.baseInfo?.addOnCredit || 0);
      const credits = (credit + addOnCredit) / 100;
      return credits;
    },
    getCurrentMembershipInfo() {
      return this.membershipInfo?.baseInfo;
    },
    getCurrentMembershipPermission() {
      return this.membershipInfo?.permission;
    },
    getAiModelList() {
      return this.membershipInfo?.permission?.ai?.copilot?.models;
    },
    isGuest() {
      return this.membershipInfo?.baseInfo?.type === MembershipType.GUEST;
    },
    isFree() {
      return this.membershipInfo?.baseInfo?.type === MembershipType.FREE;
    },
    isPro() {
      return this.membershipInfo?.baseInfo?.type === MembershipType.PRO;
    },
    setOfflineUserInfo(user: User, membershipInfo?: UserMembershipInfo) {
      this.userInfo = user;
      this.membershipInfo = membershipInfo;
    },
    async logout() {
      await doLogout();
      this.userInfo = undefined;
    },
  },
});
