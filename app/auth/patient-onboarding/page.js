'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAppDispatch } from '../../store/hooks';
import { registerStart, registerSuccess, registerFailure } from '../../store/slices/authSlice';
import { AuthService } from '../../services/auth';

export default function PatientOnboardingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Registration
    name: '',
    email: '',
    phone: '',
    password: '',
    
    // Step 2: OTP Verification
    otp: '',
    
    // Step 3: Location & Language
    location: '',
    language: 'English',
    
    // Step 4: Personal Details
    sex: '',
    age: '',
    dateOfBirth: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleOTPChange = (index, value) => {
    const newOTP = formData.otp.split('');
    newOTP[index] = value;
    setFormData(prev => ({
      ...prev,
      otp: newOTP.join('')
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = 'Name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    }

    if (step === 2) {
      if (!formData.otp || formData.otp.length !== 4) newErrors.otp = 'Please enter 4-digit OTP';
    }

    if (step === 3) {
      if (!formData.location.trim()) newErrors.location = 'Location is required';
    }

    if (step === 4) {
      if (!formData.sex) newErrors.sex = 'Please select your sex';
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sendOTP = async () => {
    setOtpLoading(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          phone: formData.phone
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send OTP');
      }
      
      setOtpSent(true);
      setErrors(prev => ({ ...prev, otp: '', submit: '' }));
      
      // Show success message briefly before moving to next step
      setTimeout(() => {
        setCurrentStep(2);
      }, 1000);
    } catch (error) {
      console.error('Send OTP error:', error);
      setErrors({ submit: error.message || 'Failed to send OTP' });
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOTP = async () => {
    setOtpLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Invalid OTP');
      }
      
      setCurrentStep(3); // Move to next step
      setErrors(prev => ({ ...prev, otp: '' }));
    } catch (error) {
      console.error('Verify OTP error:', error);
      setErrors({ otp: error.message || 'Invalid OTP' });
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOTP = async () => {
    setOtpLoading(true);
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          phone: formData.phone
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend OTP');
      }
      
      setErrors(prev => ({ ...prev, otp: '' }));
    } catch (error) {
      console.error('Resend OTP error:', error);
      setErrors({ submit: error.message || 'Failed to resend OTP' });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 1) {
        // Send OTP after step 1 validation
        sendOTP();
      } else if (currentStep === 2) {
        // Verify OTP in step 2
        verifyOTP();
      } else if (currentStep < 4) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    dispatch(registerStart());
    
    try {
      const registrationData = {
        firstName: formData.name.split(' ')[0],
        lastName: formData.name.split(' ').slice(1).join(' ') || '',
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.sex.toLowerCase(),
        location: formData.location,
        language: formData.language,
        isEmailVerified: true // Email OTP was verified in step 2
      };
      
      // Call the API to register patient
      const response = await fetch('/api/auth/register-patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }
      
      // Create user object for Redux
      const user = {
        id: result.patient.id,
        email: result.patient.email,
        firstName: result.patient.firstName,
        lastName: result.patient.lastName,
        role: 'patient',
        avatar: '/icons/user-placeholder.png'
      };
      
      const profile = {
        firstName: result.patient.firstName,
        lastName: result.patient.lastName,
        email: result.patient.email,
        phone: result.patient.phone,
        dateOfBirth: result.patient.dateOfBirth,
        gender: result.patient.gender,
        location: result.patient.location,
        language: result.patient.language,
        isPhoneVerified: result.patient.isPhoneVerified,
        isEmailVerified: result.patient.isEmailVerified
      };
      
      // Store token in localStorage
      if (result.token) {
        localStorage.setItem('authToken', result.token);
      }
      
      dispatch(registerSuccess({
        user,
        role: 'patient',
        profile
      }));
      
      router.push('/auth/success?type=signup&role=patient');
    } catch (error) {
      console.error('Registration error:', error);
      dispatch(registerFailure(error.message));
      setErrors({ submit: error.message || 'Registration failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration</h2>
            <p className="text-gray-600 mb-8">Please enter your registration details name, email and phone.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name*
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5f4191] ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Full name"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email*
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5f4191] ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Example@domain"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone no.*
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5f4191] ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+91 xxxxx xxxxx"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password*
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5f4191] ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="********"
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification</h2>
            <p className="text-gray-600 mb-8">
              Please enter the O.T.P sent to the mail i.e {formData.email}
            </p>
            
            <div className="flex justify-center space-x-4 mb-8">
              {[0, 1, 2, 3].map((index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  value={formData.otp[index] || ''}
                  onChange={(e) => handleOTPChange(index, e.target.value)}
                  className={`w-12 h-12 text-center text-xl font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5f4191] ${
                    errors.otp ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              ))}
            </div>
            {errors.otp && <p className="text-red-500 text-sm text-center">{errors.otp}</p>}
            
            <div className="text-center">
              <button
                type="button"
                onClick={resendOTP}
                disabled={otpLoading}
                className="text-[#5f4191] hover:text-[#4d3374] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {otpLoading ? 'Sending...' : 'Resend OTP'}
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Help us get more Precise</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select your location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5f4191] ${
                    errors.location ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Eg. Lucknow, Uttar Pradesh"
                />
                {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App Language
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5f4191]"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Bengali">Bengali</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Gujarati">Gujarati</option>
                  <option value="Marathi">Marathi</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Details</h2>
            <p className="text-gray-600 mb-8">Please let us know some basic details for seamless usage and consultancy.</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Sex</label>
                <div className="flex space-x-8">
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, sex: 'Male' }))}
                      className={`w-16 h-16 rounded-full border-2 flex items-center justify-center mb-2 ${
                        formData.sex === 'Male' 
                          ? 'border-[#5f4191] bg-[#5f4191] text-white' 
                          : 'border-gray-300 hover:border-[#5f4191]'
                      }`}
                    >
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                    </button>
                    <span className="text-sm text-gray-700">Male</span>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, sex: 'Female' }))}
                      className={`w-16 h-16 rounded-full border-2 flex items-center justify-center mb-2 ${
                        formData.sex === 'Female' 
                          ? 'border-[#5f4191] bg-[#5f4191] text-white' 
                          : 'border-gray-300 hover:border-[#5f4191]'
                      }`}
                    >
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                    </button>
                    <span className="text-sm text-gray-700">Female</span>
                  </div>
                </div>
                {errors.sex && <p className="text-red-500 text-sm mt-2">{errors.sex}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5f4191] ${
                    errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="DD/MM/YYYY"
                />
                {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</p>}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-4 bg-gray-400 rounded-full mr-2"></div>
          <span className="text-lg font-semibold text-gray-900">Doctar</span>
        </div>
        <div className="text-sm text-gray-500">
          Step {currentStep} of 4
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {renderStep()}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6">
        {otpSent && currentStep === 1 && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 text-sm">✓ OTP sent successfully! Check your email.</p>
          </div>
        )}
        
        {errors.submit && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{errors.submit}</p>
          </div>
        )}
        
        <button
          onClick={handleNext}
          disabled={isLoading || otpLoading}
          className="w-full py-4 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 
           otpLoading ? (currentStep === 1 ? 'Sending OTP...' : 'Verifying OTP...') :
           currentStep === 1 ? 'Send OTP & Continue' :
           currentStep === 2 ? 'Verify OTP & Continue' :
           currentStep === 4 ? 'Finish Setup' : 'Next'}
        </button>
      </div>
    </div>
  );
}
