import axios from 'axios';
import { IOtpProvider, IOtpSendResult } from './otpProvider.interface';
import { env } from '../../config/env';

export class Msg91Provider implements IOtpProvider {
  public name = 'msg91';

  async sendOtp(phone: string, otp: string): Promise<IOtpSendResult> {
    if (!env.MSG91_AUTH_KEY) {
      throw new Error('MSG91_AUTH_KEY is not configured in environment variables');
    }

    // MSG91 expects mobile format without '+' prefix e.g. 919876543210
    const cleanMobile = phone.replace(/^\+/, '');

    try {
      const response = await axios.post(
        'https://control.msg91.com/api/v5/otp',
        {
          template_id: env.MSG91_TEMPLATE_ID || undefined,
          otp: otp,
          sender: env.MSG91_SENDER_ID || undefined,
        },
        {
          params: {
            mobile: cleanMobile,
            template_id: env.MSG91_TEMPLATE_ID,
            authkey: env.MSG91_AUTH_KEY,
            otp: otp,
          },
          headers: {
            authkey: env.MSG91_AUTH_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      return {
        success: response.data?.type === 'success' || response.status === 200,
        message: response.data?.message || 'OTP dispatched via MSG91',
        provider: this.name,
        referenceId: response.data?.request_id,
      };
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message;
      console.error('❌ MSG91 Send OTP Failed:', errMsg);
      throw new Error(`MSG91 Error: ${errMsg}`);
    }
  }
}
