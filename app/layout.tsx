import "./globals.css";
import ThemeProvider from "./theme-provider";

export const metadata = {
  title: "Klynexa",
  description: "Intelligent systems for serious work",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg)] text-[var(--text)] antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
