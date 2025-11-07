import { NextResponse } from 'next/server';
import { verifyOTP } from '../../../services/otpService';

export async function POST(request) {
  try {
    const { email, otp } = await request.json();
    
    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }
    
    const result = await verifyOTP(email, otp);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'OTP verified successfully'
      });
    } else {
      return NextResponse.json(
        { 
          error: result.message,
          attemptsLeft: result.attemptsLeft 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}
