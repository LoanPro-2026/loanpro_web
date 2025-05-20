import './globals.css';
import NavBar from '../components/NavBar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <NavBar />
        <main>{children}</main>
      </body>
    </html>
  );
} 