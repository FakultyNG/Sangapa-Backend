import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type EmailOptions = {
  to: string;
  subject: string;
  text: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendEmail(options: EmailOptions): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');

    if (!apiKey) {
      if (nodeEnv === 'production') {
        throw new Error('RESEND_API_KEY is required to send email in production');
      }

      this.logger.warn(
        JSON.stringify({
          message: 'Email delivery skipped because RESEND_API_KEY is not configured',
          to: options.to,
          subject: options.subject,
          text: options.text,
        }),
      );
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.get<string>('EMAIL_FROM', 'SangaPay <no-reply@sangapay.com>'),
        to: [options.to],
        subject: options.subject,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Email provider rejected request with ${response.status}: ${body}`);
    }
  }

  async sendOtp(to: string, code: string, purposeLabel: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Your SangaPay ${purposeLabel} code`,
      text: `Your SangaPay ${purposeLabel} code is ${code}. It expires in 10 minutes.`,
    });
  }
}
