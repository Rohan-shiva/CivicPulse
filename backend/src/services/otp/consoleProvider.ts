import { IOtpProvider, IOtpSendResult } from './otpProvider.interface';

export class ConsoleOtpProvider implements IOtpProvider {
  public name = 'console';

  async sendOtp(phone: string, otp: string): Promise<IOtpSendResult> {
    console.log(`\n=================================================`);
    console.log(`📱 [Console OTP Provider - Local Dev & Testing]`);
    console.log(`Recipient: ${phone}`);
    console.log(`OTP Code:  👉 ${otp} 👈`);
    console.log(`Expires in: 5 minutes`);
    console.log(`=================================================\n`);

    return {
      success: true,
      message: 'OTP printed to server console for testing/development',
      provider: this.name,
    };
  }
}
