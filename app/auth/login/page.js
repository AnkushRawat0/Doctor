"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "../../store/hooks";
import { loginSuccess, setError, clearError } from "../../store/slices/authSlice";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }
      
      // Store token in localStorage
      localStorage.setItem('authToken', result.token);
      
      // Dispatch login success to Redux
      dispatch(loginSuccess({
        user: result.user,
        role: result.user.role,
        profile: result.profile
      }));
      
      // Redirect based on role
      if (result.user.role === 'patient') {
        router.push('/patient-profile');
      } else if (result.user.role === 'doctor') {
        router.push('/doctor-profile');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{
      backgroundImage: `
        linear-gradient(to right, #f3f4f6 1px, transparent 1px),
        linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)
      `,
      backgroundSize: '20px 20px'
    }}>
      {/* Purple header bar */}
      <div className="w-full h-2 bg-purple-500"></div>
      
      {/* Logo section */}
      <div className="px-6 py-6 bg-white">
        <div className="flex items-center justify-center">
          <Image 
            src="/icons/logo.png" 
            alt="Doctar" 
            width={135}
            height={40}
            className="h-10 w-auto cursor-pointer"
            onClick={() => router.push("/")}
          />
        </div>
      </div>

      {/* Content section */}
      <div className="px-6">
        <div className="w-full bg-white rounded-t-3xl p-6 -mt-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Welcome Back</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Email or Phone*</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none bg-white"
                type="text"
                name="email"
                placeholder="Example@domain"
                autoComplete="username"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-900">Password*</label>
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Forgot ?
                </Link>
              </div>
              <div className="relative">
                <input
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 pr-12 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none bg-white"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-red-600 text-sm">{error}</div>
              </div>
            )}

            {/* Login button */}
            <button 
              type="submit"
              disabled={isLoading || !formData.email || !formData.password} 
              className="w-full bg-black text-white py-4 rounded-full font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
            >
              {isLoading ? 'Logging in…' : 'Login'}
            </button>

            {/* Register link */}
            <div className="text-center">
              <span className="text-gray-600 text-sm">New here ? </span>
              <Link 
                href="/auth/signup" 
                className="text-purple-600 text-sm z-20 relative font-medium hover:text-purple-700"
              >
                Get Started
              </Link>
            </div>
          </form>
        </div>

        {/* Doctor illustration */}
        <div className="fixed bottom-0 right-0 w-full flex justify-end pointer-events-none">
          <div className="absolute bottom-0 right-0 w-full">
            <Image 
              src="/icons/curvy-bg.png" 
              alt="Background" 
              width={400}
              height={200}
              className="w-full h-[25vh] object-stretch"
              unoptimized
            />
          </div>
          <div className="relative">
            <div className="relative w-48 h-56 mb-0">
              <div className="w-full h-full absolute bottom-0">
                <Image 
                  src="/icons/doctor-image.png" 
                  alt="Doctor" 
                  width={192}
                  height={224}
                  className="w-full h-full bottom-0 object-contain"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
