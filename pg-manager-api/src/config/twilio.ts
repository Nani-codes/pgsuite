import { env } from './env.js';
import logger from '../utils/logger.js';

interface TwilioVerifyResponse {
  sid: string;
  status: string;
  valid?: boolean;
  message?: string;
}

const BASE_URL = `https://verify.twilio.com/v2/Services/${env.TWILIO_VERIFY_SID}`;

function authHeader(): string {
  const credentials = Buffer.from(
    `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
  ).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Send an OTP verification SMS via Twilio Verify.
 * @param to  E.164 phone number, e.g. "+919553721960"
 */
export async function sendVerification(to: string): Promise<{ status: string; sid: string }> {
  const res = await fetch(`${BASE_URL}/Verifications`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, Channel: 'sms' }),
  });

  const json = (await res.json()) as TwilioVerifyResponse;

  if (!res.ok) {
    logger.error({ twilioError: json }, 'Twilio sendVerification failed');
    throw new Error(json.message || 'Failed to send OTP');
  }

  return { status: json.status, sid: json.sid };
}

/**
 * Check an OTP code against Twilio Verify.
 * @param to   E.164 phone number
 * @param code The 6-digit code entered by the user
 */
export async function checkVerification(
  to: string,
  code: string,
): Promise<{ valid: boolean; status: string }> {
  const res = await fetch(`${BASE_URL}/VerificationCheck`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, Code: code }),
  });

  const json = (await res.json()) as TwilioVerifyResponse;

  if (!res.ok) {
    logger.error({ twilioError: json }, 'Twilio checkVerification failed');
    // Twilio returns 404 when verification has expired or doesn't exist
    if (res.status === 404) {
      return { valid: false, status: 'expired' };
    }
    throw new Error(json.message || 'Failed to verify OTP');
  }

  return { valid: json.valid === true, status: json.status };
}
