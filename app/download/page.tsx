import React from 'react';
import { ArrowDownTrayIcon, CheckCircleIcon, ComputerDesktopIcon, ShieldCheckIcon, RocketLaunchIcon, ClockIcon } from '@heroicons/react/24/outline';

const features = [
  {
    title: 'Lightning Fast Performance',
    description: 'Native desktop app optimized for speed and efficiency',
    icon: RocketLaunchIcon
  },
  {
    title: 'Bank-Grade Security',
    description: 'Advanced encryption and biometric authentication',
    icon: ShieldCheckIcon
  },
  {
    title: 'Offline Capabilities',
    description: 'Work seamlessly even without internet connection',
    icon: ComputerDesktopIcon
  },
  {
    title: 'Real-time Sync',
    description: 'Automatic synchronization with cloud when online',
    icon: ClockIcon
  },
  {
    title: 'Modern Interface',
    description: 'Intuitive design that makes complex tasks simple',
    icon: CheckCircleIcon
  },
  {
    title: 'Automatic Updates',
    description: 'Always stay up-to-date with latest features',
    icon: ArrowDownTrayIcon
  }
];

const systemRequirements = [
  'Windows 10 or later (64-bit)',
  '4 GB RAM minimum (8 GB recommended)',
  '500 MB free disk space',
  'Internet connection for initial setup and sync',
  '.NET Framework 4.8 or later',
  'DirectX 11 compatible graphics card'
];

const DownloadPage = () => {
  return (
    <div className="relative min-h-screen overflow-hidden pt-20">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-white/30 backdrop-blur-sm border border-white/40 rounded-full px-6 py-2 mb-6">
            <ArrowDownTrayIcon className="w-5 h-5 text-blue-600" />
            <span className="text-blue-600 font-semibold">Desktop Application</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Download 
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> LoanPro Desktop</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Get the official LoanPro desktop application for Windows. Fast, secure, and designed specifically for loan management professionals.
          </p>
          
          {/* Download Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12">
            <a 
              href="/downloads/LoanProSetup.exe" 
              download 
              className="group relative bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold px-8 py-4 rounded-2xl shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300 flex items-center space-x-3"
            >
              <ArrowDownTrayIcon className="w-6 h-6" />
              <span>Download for Windows</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </a>
            
            <div className="text-center">
              <div className="text-sm text-gray-500">Version 2.1.0 • 45.2 MB</div>
              <div className="text-sm text-green-600 font-medium">✓ Virus-free & Digitally Signed</div>
            </div>
          </div>
        </div>

        {/* Screenshots Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            See LoanPro in Action
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 shadow-2xl">
                <img 
                  src="/screenshots/react Ui/Dashboard Page UI.png" 
                  alt="LoanPro Dashboard" 
                  className="w-full rounded-xl shadow-lg"
                />
                <div className="mt-4 text-center">
                  <h3 className="text-lg font-semibold text-gray-900">Main Dashboard</h3>
                  <p className="text-gray-600">Comprehensive overview of your loan portfolio</p>
                </div>
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 shadow-2xl">
                <img 
                  src="/screenshots/react Ui/Add New Record Ui.png" 
                  alt="Add New Record" 
                  className="w-full rounded-xl shadow-lg"
                />
                <div className="mt-4 text-center">
                  <h3 className="text-lg font-semibold text-gray-900">Add New Records</h3>
                  <p className="text-gray-600">Streamlined data entry with smart validation</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose LoanPro Desktop?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const IconComponent = feature.icon;
              return (
                <div 
                  key={idx}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-6 hover:bg-white/30 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Requirements & Installation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* System Requirements */}
          <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-3">
              <ComputerDesktopIcon className="w-7 h-7 text-blue-600" />
              <span>System Requirements</span>
            </h3>
            <ul className="space-y-3">
              {systemRequirements.map((req, idx) => (
                <li key={idx} className="flex items-center space-x-3">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Installation Instructions */}
          <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-3">
              <RocketLaunchIcon className="w-7 h-7 text-purple-600" />
              <span>Installation Guide</span>
            </h3>
            <ol className="space-y-4">
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                <span className="text-gray-700">Click the <strong>Download for Windows</strong> button above</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                <span className="text-gray-700">Run the downloaded <strong>LoanProSetup.exe</strong> file</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                <span className="text-gray-700">Follow the installation wizard prompts</span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">4</div>
                <span className="text-gray-700">Launch LoanPro and sign in with your account</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Support Section */}
        <div className="text-center">
          <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Need Help Getting Started?
            </h3>
            <p className="text-gray-600 mb-6">
              Our support team is here to help you with installation, setup, and any questions you might have.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <a 
                href="mailto:support@loanpro.tech" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Email Support
              </a>
              <a 
                href="tel:+911234567890" 
                className="bg-white/30 hover:bg-white/40 text-gray-700 font-semibold px-6 py-3 rounded-xl border border-white/40 transition-all duration-300"
              >
                Call Support
              </a>
            </div>
            <p className="text-gray-500 text-sm mt-4">
              📞 Available Monday-Friday, 9 AM - 6 PM IST
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage; 