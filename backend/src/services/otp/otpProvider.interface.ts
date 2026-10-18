export interface IOtpSendResult {
  success: boolean;
  message: string;
  provider: string;
  referenceId?: string;
}

export interface IOtpVerifyResult {
  success: boolean;
  message: string;
}

export interface IOtpProvider {
  name: string;
  sendOtp(phone: string, otp: string): Promise<IOtpSendResult>;
  verifyOtp?(phone: string, otp: string): Promise<IOtpVerifyResult>;
}
