import { User } from 'go-sea-proto/gen/ts/user/User';
import { UserRole } from 'go-sea-proto/gen/ts/user/UserRole';
import { UserStatus } from 'go-sea-proto/gen/ts/user/UserStatus';
import { MembershipType, UserMembershipInfo, UserMembershipBaseInfo } from 'go-sea-proto/gen/ts/membership/MembershipApi';

/**
 * 离线模式 mock 用户数据
 * 用于在后台服务不可用时，跳过登录验证，直接查看前端渲染效果
 */
export const createOfflineUser = (): User => ({
  id: 'offline-user',
  username: 'offline',
  email: 'offline@localhost',
  password: '',
  nickname: 'Offline User',
  avatar: '',
  roles: [UserRole.ROLE_USER],
  accessToken: 'offline-mock-token',
  accessTokenExpires: BigInt(Date.now() + 86400000),
  refreshToken: 'offline-mock-refresh-token',
  refreshTokenExpires: BigInt(Date.now() + 86400000 * 30),
  lastLogin: BigInt(Date.now()),
  googleOpenId: '',
  status: UserStatus.STATUS_ACTIVE,
});

export const createOfflineMembershipInfo = (): UserMembershipInfo => ({
  baseInfo: {
    userId: 'offline-user',
    type: MembershipType.FREE,
    typeName: 'Free',
    credit: 0n,
    addOnCredit: 0n,
    isExpired: false,
    expiredDay: 365,
    startAt: BigInt(Date.now()),
    endAt: BigInt(Date.now() + 86400000 * 365),
  } as UserMembershipBaseInfo,
});
