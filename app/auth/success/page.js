'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const [type, setType] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    const typeParam = searchParams.get('type');
    const roleParam = searchParams.get('role');
    setType(typeParam || '');
    setRole(roleParam || '');
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image
              src="/icons/logo.png"
              alt="Doctar Logo"
              width={200}
              height={60}
              className="object-contain"
              unoptimized
            />
          </div>
          
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {type === 'signup' ? 'Account Created Successfully!' : 'Success!'}
          </h1>
          
          <p className="text-gray-600 mb-6">
            {type === 'signup' 
              ? `Your ${role === 'patient' ? 'patient' : 'doctor'} account has been created successfully. You can now sign in to access all features.`
              : 'Your action was completed successfully.'
            }
          </p>
        </div>

        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#5f4191] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to Doctar!
            </h2>
            
            <p className="text-gray-600 mb-6">
              {type === 'signup' && role === 'patient' 
                ? 'You can now search for doctors, book appointments, and access healthcare services.'
                : type === 'signup' && role === 'doctor'
                ? 'Your account is being reviewed. You will receive an email once approved.'
                : 'You are now signed in to your account.'
              }
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              {type === 'signup' ? (
                <>
                  <Link 
                    href="/auth/login"
                    className="block w-full px-6 py-3 bg-[#5f4191] text-white rounded-lg font-semibold hover:bg-[#4d3374] transition-colors text-center"
                  >
                    Sign In to Your Account
                  </Link>
                  <Link 
                    href="/"
                    className="block w-full px-6 py-3 border-2 border-[#5f4191] text-[#5f4191] rounded-lg font-semibold hover:bg-[#5f4191] hover:text-white transition-colors text-center"
                  >
                    Explore the Platform
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    href="/"
                    className="block w-full px-6 py-3 bg-[#5f4191] text-white rounded-lg font-semibold hover:bg-[#4d3374] transition-colors text-center"
                  >
                    Go to Dashboard
                  </Link>
                  <Link 
                    href="/auth"
                    className="block w-full px-6 py-3 border-2 border-[#5f4191] text-[#5f4191] rounded-lg font-semibold hover:bg-[#5f4191] hover:text-white transition-colors text-center"
                  >
                    Back to Auth
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Additional Info */}
        {type === 'signup' && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-1">
                  What's Next?
                </h3>
                <p className="text-sm text-blue-700">
                  {role === 'patient' 
                    ? 'Check your email for a verification link. Once verified, you can start booking appointments with doctors.'
                    : 'Your account is under review. Our team will verify your credentials and notify you via email once approved.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
