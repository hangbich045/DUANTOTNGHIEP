'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Loader2, ArrowRight, Mail, KeyRound, ArrowLeft, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { setSession } = useAuth();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const queryEmail = searchParams.get('email');
    if (queryEmail) {
      setEmail(decodeURIComponent(queryEmail));
    } else if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const param = urlParams.get('email');
      if (param) setEmail(decodeURIComponent(param));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast('Vui lòng nhập địa chỉ email tài khoản', 'warning');
      return;
    }
    if (!otp.trim()) {
      toast('Vui lòng nhập mã OTP 6 chữ số', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await api.post('/auth/verify', {
        email: email.trim(),
        otp: otp.trim(),
      });

      const payload = res?.data || res;
      const accessToken = payload.accessToken || res.accessToken;
      const user = payload.user || res.user;

      if (accessToken && user) {
        setSession(accessToken, user);
        toast(`Xác thực thành công! Chào mừng ${user.fullName}`, 'success');
        if (user.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else {
          router.push('/');
        }
      } else {
        toast('Xác thực tài khoản thành công! Vui lòng đăng nhập.', 'success');
        router.push('/auth/login');
      }
    } catch (err: any) {
      toast(err.message || 'Mã OTP không chính xác hoặc đã hết hạn', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email.trim()) {
      toast('Vui lòng nhập email để nhận lại mã OTP', 'warning');
      return;
    }

    setResending(true);
    try {
      const res: any = await api.post('/auth/resend-otp', { email: email.trim() });
      toast(res?.message || 'Mã OTP mới đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư!', 'success');
    } catch (err: any) {
      toast(err.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.', 'error');
    } finally {
      setResending(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-studio-dark">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-studio-dark relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-brand-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-brand-secondary/10 blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full bg-[#141726] p-8 sm:p-10 rounded-[32px] border-2 border-[#2B3553] shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-2 mb-2">
            <div className="w-11 h-11 flex items-center justify-center">
              <Image src="/LOGO.png" alt="LHU Media" width={44} height={44} className="object-contain drop-shadow-lg" priority />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">
              LHU <span className="text-gradient">MEDIA</span>
            </span>
          </Link>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#1E263D] border border-[#3B82F6] text-[#93C5FD] text-xs font-bold mb-1">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Xác thực OTP 2 lớp</span>
          </div>
          <h2 className="text-2xl font-black text-white">Kích Hoạt Tài Khoản</h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Hệ thống đã gửi mã OTP 6 số đến email của bạn. Vui lòng kiểm tra hộp thư (kể cả thư rác/spam).
          </p>
        </div>

        {/* Form xác thực */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Email (nếu chưa có trong URL thì hiển thị ô nhập) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#CBD5E1]">
              Địa chỉ Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 transform -translate-y-1/2" />
              <input
                type="email"
                placeholder="ten.nv@lhu.edu.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0D101A] border border-[#2B3553] rounded-2xl py-3 pl-11 pr-4 text-white text-xs placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] transition-all font-medium"
                disabled={submitting}
                required
              />
            </div>
          </div>

          {/* Mã OTP */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#CBD5E1]">
                Mã OTP (6 chữ số)
              </label>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending || submitting}
                className="text-xs text-[#60A5FA] hover:text-white font-semibold hover:underline flex items-center space-x-1 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                <span>{resending ? 'Đang gửi lại...' : 'Gửi lại mã'}</span>
              </button>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ví dụ: 123456"
                value={otp}
                maxLength={6}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-[#0D101A] border border-[#2B3553] rounded-2xl py-3 pl-11 pr-4 text-white text-base tracking-widest placeholder-[#64748B] text-center font-bold focus:outline-none focus:border-[#3B82F6] transition-all"
                disabled={submitting}
                autoFocus
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-600/30 border border-[#3B82F6] transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:hover:translate-y-0"
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Xác thực và Đăng nhập</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Footer links */}
        <div className="pt-2 border-t border-[#23293D] flex items-center justify-between text-xs text-[#94A3B8]">
          <Link
            href="/auth/login"
            className="flex items-center space-x-1 text-[#60A5FA] hover:text-white font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Đăng nhập</span>
          </Link>

          <Link
            href="/auth/register"
            className="text-[#94A3B8] hover:text-white font-semibold transition-colors"
          >
            Đăng ký tài khoản mới
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-studio-dark">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
