import { NextResponse } from 'next/server';
import { resendOTP } from '../../../services/otpService';

export async function POST(request) {
  try {
    const { email, phone } = await request.json();
    
    if (!email || !phone) {
      return NextResponse.json(
        { error: 'Email and phone are required' },
        { status: 400 }
      );
    }
    
    const result = await resendOTP(email, phone);
    
    return NextResponse.json({
      success: true,
      message: 'OTP resent successfully',
      expiresAt: result.expiresAt
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to resend OTP' },
      { status: 500 }
    );
  }
}
