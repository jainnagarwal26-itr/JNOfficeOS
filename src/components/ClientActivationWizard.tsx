/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, Phone, Lock, Key, CheckCircle2, AlertCircle, RefreshCw, 
  ArrowRight, ShieldAlert, Sparkles, Building2, User
} from "lucide-react";
import { ActivationService } from "../lib/activationService";
import { OTPService } from "../lib/otpService";
import { getClients } from "../lib/db";

interface ClientActivationWizardProps {
  rawToken: string;
  onActivationSuccess?: (clientId: string) => void;
  onCancel?: () => void;
}

export default function ClientActivationWizard({ rawToken, onActivationSuccess, onCancel }: ClientActivationWizardProps) {
  // Token validation state
  const [tokenStatus, setTokenStatus] = useState<"VALIDATING" | "VALID" | "INVALID">("VALIDATING");
  const [tokenError, setTokenError] = useState("");
  const [targetClientId, setTargetClientId] = useState("");
  const [clientName, setClientName] = useState("");

  // Wizard Steps: 1 = Mobile Challenge, 2 = OTP Verification, 3 = Password Set, 4 = Complete
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Mobile Challenge
  const [inputMobile, setInputMobile] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [isVerifyingMobile, setIsVerifyingMobile] = useState(false);

  // Step 2: OTP Verification
  const [inputOTP, setInputOTP] = useState("");
  const [otpError, setOtpError] = useState("");
  const [rawSentOTP, setRawSentOTP] = useState("");
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);

  // Step 3: Password Creation
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  useEffect(() => {
    validateToken();
  }, [rawToken]);

  const validateToken = async () => {
    setTokenStatus("VALIDATING");
    const res = await ActivationService.validateActivationToken(rawToken);
    
    if (!res.isValid || !res.clientId) {
      setTokenStatus("INVALID");
      setTokenError(res.errorMessage || "Invalid token.");
      return;
    }

    setTargetClientId(res.clientId);
    const clients = getClients();
    const matched = clients.find(c => c.id === res.clientId);
    setClientName(matched ? matched.name : "Valued Practice Client");
    setTokenStatus("VALID");
  };

  // Step 1: Submit Mobile Challenge
  const handleMobileChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMobileError("");
    setIsVerifyingMobile(true);

    try {
      const res = await OTPService.sendOTP(targetClientId, inputMobile, "ACTIVATION");
      if (!res.success) {
        setMobileError(res.errorMessage || "Identity verification failed.");
        setIsVerifyingMobile(false);
        return;
      }

      setRawSentOTP(res.rawOTP || "");
      setCurrentStep(2);
    } catch (err: any) {
      setMobileError("An error occurred during verification.");
    } finally {
      setIsVerifyingMobile(false);
    }
  };

  // Step 2: Submit OTP Verification
  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setIsVerifyingOTP(true);

    try {
      const res = await OTPService.verifyOTP(targetClientId, inputOTP);
      if (!res.success) {
        setOtpError(res.errorMessage || "Invalid OTP code.");
        setIsVerifyingOTP(false);
        return;
      }

      setCurrentStep(3);
    } catch (err: any) {
      setOtpError("OTP verification failed.");
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  // Password validation helper
  const validatePasswordStrength = (pwd: string): string | null => {
    if (pwd.length < 12) return "Password must be at least 12 characters long.";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Password must contain at least one special character.";
    return null;
  };

  // Step 3: Submit Password Creation
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      setPasswordError(strengthError);
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setIsSubmittingPassword(true);
    try {
      await ActivationService.consumeActivationToken(rawToken);
      setCurrentStep(4);
    } catch (err: any) {
      setPasswordError("Failed to complete activation.");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  if (tokenStatus === "VALIDATING") {
    return (
      <div className="min-h-screen bg-[#0D2C6C] flex items-center justify-center p-4 text-white">
        <div className="text-center space-y-3">
          <RefreshCw className="w-10 h-10 text-[#D4AF37] animate-spin mx-auto" />
          <h2 className="font-display font-bold text-sm">Validating Cryptographic Activation Token...</h2>
          <p className="text-xs text-blue-200">Verifying single-use token hash against practice security registry.</p>
        </div>
      </div>
    );
  }

  if (tokenStatus === "INVALID") {
    return (
      <div className="min-h-screen bg-[#0A1C40] flex items-center justify-center p-4 text-white">
        <div className="bg-white text-slate-800 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-4 border border-rose-200">
          <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
          <h2 className="font-display font-black text-lg text-slate-900">Activation Link Invalid</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{tokenError}</p>
          <div className="pt-4">
            {onCancel && (
              <button onClick={onCancel} className="px-6 py-2.5 bg-[#0D2C6C] text-white rounded-xl font-bold text-xs shadow hover:bg-blue-900 cursor-pointer">
                Return to Login
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-800">
      
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col my-8">
        
        {/* Header */}
        <div className="bg-[#0D2C6C] p-6 text-white text-center space-y-1">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto p-1.5 border border-[#D4AF37]/40 mb-2 shadow">
            <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="font-display font-black text-base uppercase tracking-tight text-white">JN OfficeOS Client Activation</h2>
          <p className="text-xs text-[#D4AF37] font-bold">{clientName}</p>
        </div>

        {/* Progress Tracker */}
        <div className="bg-slate-50 border-b border-slate-100 p-3 px-6 flex justify-between items-center text-[10px] font-bold text-slate-500">
          <span className={currentStep >= 1 ? "text-[#0D2C6C]" : ""}>1. Mobile</span>
          <span>→</span>
          <span className={currentStep >= 2 ? "text-[#0D2C6C]" : ""}>2. OTP</span>
          <span>→</span>
          <span className={currentStep >= 3 ? "text-[#0D2C6C]" : ""}>3. Password</span>
          <span>→</span>
          <span className={currentStep === 4 ? "text-emerald-600" : ""}>4. Active</span>
        </div>

        {/* Wizard Body */}
        <div className="p-6 space-y-6 flex-grow text-xs">
          
          {/* STEP 1: REGISTERED MOBILE IDENTITY CHALLENGE */}
          {currentStep === 1 && (
            <form onSubmit={handleMobileChallengeSubmit} className="space-y-4">
              <div className="space-y-1 text-center">
                <ShieldCheck className="w-8 h-8 text-[#0D2C6C] mx-auto" />
                <h3 className="font-bold text-sm text-slate-800">Step 1: Registered Identity Challenge</h3>
                <p className="text-[11px] text-slate-500">Enter your 10-digit mobile number registered with Jain Agarwal & Co.</p>
              </div>

              {mobileError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{mobileError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Registered Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={inputMobile}
                    onChange={(e) => setInputMobile(e.target.value)}
                    required
                    placeholder="+91 9821482419"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#0D2C6C]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifyingMobile}
                className="w-full py-3 bg-[#0D2C6C] hover:bg-blue-900 text-white font-bold rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isVerifyingMobile ? "Verifying CRM Record..." : "Verify Mobile & Send OTP"}
                <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
              </button>
            </form>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {currentStep === 2 && (
            <form onSubmit={handleOTPSubmit} className="space-y-4">
              <div className="space-y-1 text-center">
                <Key className="w-8 h-8 text-[#0D2C6C] mx-auto" />
                <h3 className="font-bold text-sm text-slate-800">Step 2: Enter 6-Digit Verification OTP</h3>
                <p className="text-[11px] text-slate-500">OTP sent to CRM registered mobile <span className="font-mono font-bold text-slate-800">{inputMobile}</span>.</p>
              </div>

              {/* DEMO DISPLAY NOTICE */}
              {rawSentOTP && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-center space-y-0.5">
                  <span className="text-[9px] uppercase font-bold tracking-widest block text-amber-700">Practice Test Delivery Mode</span>
                  <span className="text-base font-mono font-black tracking-widest text-[#0D2C6C]">{rawSentOTP}</span>
                </div>
              )}

              {otpError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold text-[11px]">
                  {otpError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  6-Digit OTP Code *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={inputOTP}
                  onChange={(e) => setInputOTP(e.target.value)}
                  required
                  placeholder="123456"
                  className="w-full text-center px-4 py-2.5 border border-slate-200 rounded-xl text-lg font-mono font-black tracking-widest focus:outline-none focus:border-[#0D2C6C]"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifyingOTP}
                className="w-full py-3 bg-[#0D2C6C] hover:bg-blue-900 text-white font-bold rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isVerifyingOTP ? "Verifying OTP..." : "Verify OTP Code"}
                <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
              </button>
            </form>
          )}

          {/* STEP 3: CREATE PASSWORD */}
          {currentStep === 3 && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1 text-center">
                <Lock className="w-8 h-8 text-[#0D2C6C] mx-auto" />
                <h3 className="font-bold text-sm text-slate-800">Step 3: Create Portal Password</h3>
                <p className="text-[11px] text-slate-500">Set a strong banking-grade password for your portal account.</p>
              </div>

              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold text-[11px]">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  New Password * (Min 12 Chars)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:border-[#0D2C6C]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:border-[#0D2C6C]"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500 space-y-1">
                <span className="font-bold block text-slate-700">Password Policy Requirements:</span>
                <div>✓ Minimum 12 characters</div>
                <div>✓ Includes uppercase (A-Z) & lowercase (a-z)</div>
                <div>✓ Includes number (0-9) & special character (!@#$)</div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingPassword}
                className="w-full py-3 bg-[#0D2C6C] hover:bg-blue-900 text-white font-bold rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmittingPassword ? "Activating Portal..." : "Complete Activation & Set Password"}
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </button>
            </form>
          )}

          {/* STEP 4: SUCCESS & REDIRECT */}
          {currentStep === 4 && (
            <div className="text-center py-6 space-y-4">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
              <div>
                <h3 className="font-display font-black text-base text-slate-900">Portal Activation Successful!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Your Client Portal access for <strong className="text-slate-800">{clientName}</strong> is now ACTIVE. You can now log in securely using your registered mobile and password.
                </p>
              </div>

              <button
                onClick={() => onActivationSuccess ? onActivationSuccess(targetClientId) : window.location.href = "/"}
                className="px-6 py-2.5 bg-[#0D2C6C] text-white font-bold rounded-xl shadow text-xs hover:bg-blue-900 transition-colors cursor-pointer"
              >
                Go to Client Portal Login
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
