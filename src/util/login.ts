import { Base64 } from 'js-base64';
import * as forge from 'node-forge'
import { getDomainOrigin } from './env';
import api from '../api/axios';
import {GetRSAKeyResponse, SignInAuthCodeRequest, SignInAuthCodeResponse, SignInAnonymousRequest, SignInAnonymousResponse} from 'go-sea-proto/gen/ts/oauth2/OAuth2'
import { SuccessResponse } from '../api/type';

export const gotoLogin = () => {
  window.location.href = `${getDomainOrigin()}/account/login?redirect_url=${encodeURIComponent(
    window.location.href
  )}`;
};

// export function setAuthorization(clientId: string, clientSecret: string) {
//   return 'Basic ' + Base64.encode(clientId + ':' + clientSecret);
// }

export const signIn = async (email: string, password: string) => {
  const encryptKey = await getEncryptKey()
  const encryptEmail = encrypt(encryptKey, email)
  const encryptPassword = encrypt(encryptKey, password)
  return await api.post<SuccessResponse<SignInAuthCodeResponse>>(`/oauth2/sign_in`, SignInAuthCodeRequest.create({
    username: encryptEmail,
    password: encryptPassword
  }))
}

export const signInAnonymous = async (deviceId: string) => {
  const encryptKey = await getEncryptKey()
  const encryptDeviceId = encrypt(encryptKey, deviceId)

  return await api.post<SuccessResponse<SignInAnonymousResponse>>(`/oauth2/anonymous`, {
    deviceId: encryptDeviceId
  } as SignInAnonymousRequest)
}

/**
 * 尝试匿名登录
 * @returns 是否登录成功
 */
export const tryAnonymousLogin = async (): Promise<boolean> => {
  try {
    // 动态导入避免循环依赖
    const { getDeviceId } = await import('./device');
    const deviceId = getDeviceId();
    
    console.log('[login] 尝试匿名登录，设备ID:', deviceId);
    const result = await signInAnonymous(deviceId);
    
    if (result.data.data?.accessToken) {
      console.log('[login] 匿名登录成功');
      return true;
    }
    
    console.log('[login] 匿名登录失败：未获取到 accessToken');
    return false;
  } catch (error) {
    console.error('[login] 匿名登录失败:', error);
    return false;
  }
}

export const getEncryptKey = async () => {
  const response = await api.post<SuccessResponse<GetRSAKeyResponse>>(`/oauth2/rsa_key`)
  const publicKey = response.data.data?.publicKey
  return publicKey
}


export const encrypt = (key: string, value: string) => {
  const pki = forge.pki

  try {
    // 检查公钥是否为空
    if (!key) {
      console.error('公钥为空，无法加密')
      return value
    }
    
    // 检查公钥是否已经包含 BEGIN/END 标记
    let formattedKey = key
    if (!key.includes('BEGIN PUBLIC KEY')) {
      formattedKey = `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`
    }
    
    // 尝试使用 forge 的 publicKeyFromPem 方法
    const publicKey = pki.publicKeyFromPem(formattedKey)
    
    // 如果成功解析公钥，继续加密
    const res = publicKey.encrypt(value, 'RSA-OAEP', {
      mgf: forge.mgf.mgf1.create(forge.md.sha1.create()),
    })
    return Base64.btoa(res) as string
  } catch (error) {
    console.error('RSA 加密错误:', error)
    return value
  }
}
