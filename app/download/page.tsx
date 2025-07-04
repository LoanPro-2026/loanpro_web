import React from 'react';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const features = [
  'Fast and secure loan management',
  'Easy record keeping and reporting',
  'Modern, intuitive interface',
  'Offline-first desktop experience',
  'Automatic updates',
  'Dedicated support',
];

const systemRequirements = [
  'Windows 10 or later (64-bit)',
  '2 GB RAM minimum',
  '200 MB free disk space',
  'Internet connection for updates',
];

const DownloadPage = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-white to-blue-50 flex flex-col items-center py-12 px-2">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-10 border border-gray-200 dark:border-gray-800 flex flex-col items-center">
        <DownloadIcon className="text-6xl text-blue-700 mb-4" />
        <h1 className="text-4xl font-extrabold mb-2 text-blue-700 text-center">Download LoanPro Desktop</h1>
        <p className="text-lg text-gray-700 mb-6 text-center max-w-xl">Get the official LoanPro desktop app for fast, secure, and easy loan management. Designed for professionals, built for speed.</p>
        <a href="/downloads/LoanProSetup.exe" download className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold text-lg shadow hover:bg-blue-700 transition mb-8 flex items-center gap-2">
          <DownloadIcon /> Download for Windows
        </a>
        {/* Screenshots/Product Image */}
        <div className="w-full flex flex-col md:flex-row gap-6 justify-center items-center mb-10">
          <img src="/screenshots/react Ui/Dashboard Page UI.png" alt="Dashboard Screenshot" className="rounded-lg shadow w-full md:w-1/2 object-cover" />
          <img src="/screenshots/react Ui/Add New Record Ui.png" alt="Add Record Screenshot" className="rounded-lg shadow w-full md:w-1/2 object-cover" />
        </div>
        {/* Features */}
        <div className="w-full mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Key Features</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-gray-700 text-base">
                <CheckCircleIcon className="text-green-500" /> {feature}
              </li>
            ))}
          </ul>
        </div>
        {/* System Requirements */}
        <div className="w-full mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">System Requirements</h2>
          <ul className="list-disc list-inside text-gray-700">
            {systemRequirements.map((req) => (
              <li key={req}>{req}</li>
            ))}
          </ul>
        </div>
        {/* Installation Instructions */}
        <div className="w-full mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Installation Instructions</h2>
          <ol className="list-decimal list-inside text-gray-700 space-y-1">
            <li>Click the <b>Download for Windows</b> button above.</li>
            <li>Open the downloaded <b>LoanProSetup.exe</b> file.</li>
            <li>Follow the on-screen instructions to complete installation.</li>
            <li>Launch LoanPro from your desktop and sign in with your account.</li>
          </ol>
        </div>
        {/* Support/Contact */}
        <div className="w-full text-center mt-6">
          <p className="text-gray-700">Need help? Contact our support team at <a href="mailto:support@loanpro.in" className="text-blue-600 hover:underline">support@loanpro.in</a></p>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage; 