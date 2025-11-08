'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function AuthPage() {
  const [selectedRole, setSelectedRole] = useState(null);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">About me</h2>
          <p className="text-gray-600">Please let us know your purpose of visit, select from the options below</p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Patient Card */}
          <div 
            className={`relative bg-white rounded-2xl p-6 border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
              selectedRole === 'patient' 
                ? 'border-[#5f4191] shadow-lg' 
                : 'border-gray-200 hover:border-purple-300'
            }`}
            onClick={() => handleRoleSelect('patient')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Patient</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  I am looking for medical consultation, want to book appointments with doctors, 
                  and need healthcare services for myself or my family.
                </p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <div className="w-20 h-20 bg-blue-50 rounded-lg flex items-center justify-center">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>
            {selectedRole === 'patient' && (
              <div className="absolute top-4 right-4">
                <div className="w-6 h-6 bg-[#5f4191] rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Doctor Card */}
          <div 
            className={`relative bg-white rounded-2xl p-6 border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
              selectedRole === 'doctor' 
                ? 'border-[#5f4191] shadow-lg' 
                : 'border-gray-200 hover:border-purple-300'
            }`}
            onClick={() => handleRoleSelect('doctor')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Doctor</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  I am a medical professional, want to provide consultation services, 
                  manage my practice, and connect with patients.
                </p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <div className="w-20 h-20 bg-green-50 rounded-lg flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            {selectedRole === 'doctor' && (
              <div className="absolute top-4 right-4">
                <div className="w-6 h-6 bg-[#5f4191] rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {selectedRole && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={selectedRole === 'patient' ? '/auth/patient-onboarding' : '/auth/doctor-onboarding'}
              className="w-full sm:w-auto px-8 py-3 bg-[#5f4191] text-white rounded-lg font-semibold hover:bg-[#4d3374] transition-colors text-center"
            >
              Create {selectedRole === 'patient' ? 'Patient' : 'Doctor'} Account
            </Link>
            <Link 
              href="/auth/login"
              className="w-full sm:w-auto px-8 py-3 border-2 border-[#5f4191] text-[#5f4191] rounded-lg font-semibold hover:bg-[#5f4191] hover:text-white transition-colors text-center"
            >
              Already have an account? Login
            </Link>
          </div>
        )}

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link 
            href="/"
            className="text-gray-600 hover:text-[#5f4191] transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
