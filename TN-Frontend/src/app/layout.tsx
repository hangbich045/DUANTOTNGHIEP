import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";

const inter = { variable: "--font-outfit" };

export const metadata: Metadata = {
  title: "LHU Media Studio - Hệ thống Quản lý Thiết bị & Lịch đặt phòng",
  description: "Trang đăng ký mượn thiết bị và đặt phòng Studio Media tại LHU. Dành cho giảng viên và sinh viên LHU.",
};

// Script khởi tạo theme tức thì trước khi React hydrate để tránh nhấp nháy (FOUC)
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('lhu_theme_active');if(t!=='light'&&t!=='dark'){t='dark';}var d=document.documentElement;d.setAttribute('data-theme',t);d.classList.remove('light','dark');d.classList.add(t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-theme="dark" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-studio-dark text-studio-text">
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
