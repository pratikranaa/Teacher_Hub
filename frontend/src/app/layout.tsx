import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/components/auth/AuthProvider';
import { WebSocketProvider } from '@/contexts/websocket-service';


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | Teacher Hub",
    default: "Teacher Hub",
  },
  description: "A platform for teachers to manage their resources and classes",
};



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <WebSocketProvider>
          {children}
          <Toaster />
          </WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}