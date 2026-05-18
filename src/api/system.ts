import api from './axios';
import { ServiceOffResponse } from 'go-sea-proto/gen/ts/system/System';
import { SuccessResponse } from './type';
import { HEADER_CANCLE_AUTO_ERROR } from './const';

export const getServiceOff = async (): Promise<ServiceOffResponse> => {
  const res = await api.get<SuccessResponse<ServiceOffResponse>>(
    `/system/serviceOff`,
    {
      headers: {
        [HEADER_CANCLE_AUTO_ERROR]: true,
      },
    }
  );
  return res.data.data;
};
