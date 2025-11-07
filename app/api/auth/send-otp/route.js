import { NextResponse } from 'next/server';
import { generateAndSendOTP } from '../../../services/otpService';

export async function POST(request) {
  try {
    console.log('Send OTP API called');
    const { email, phone } = await request.json();
    console.log('Request data:', { email, phone });
    
    if (!email || !phone) {
      return NextResponse.json(
        { error: 'Email and phone are required' },
        { status: 400 }
      );
    }
    
    console.log('Calling generateAndSendOTP...');
    const result = await generateAndSendOTP(email, phone);
    console.log('OTP generation result:', result);
    
    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      expiresAt: result.expiresAt
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: `Failed to send OTP: ${error.message}` },
      { status: 500 }
    );
  }
}
