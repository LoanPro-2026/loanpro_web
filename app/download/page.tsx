'use client';
import React, { useState } from 'react';
import { ArrowDownTrayIcon, CheckCircleIcon, ComputerDesktopIcon, ShieldCheckIcon, RocketLaunchIcon, ClockIcon, FingerPrintIcon, ChevronDownIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import HowToSetup from '../../components/HowToSetup';

const features = [
	{
		title: 'Advanced Dashboard',
		description: 'Comprehensive loan management with real-time analytics',
		icon: RocketLaunchIcon,
	},
	{
		title: 'Biometric Security',
		description: 'Fingerprint authentication with Secu-Hamster Pro 20-AP scanner',
		icon: FingerPrintIcon,
	},
	{
		title: 'Local Database',
		description: 'Fast SQLite database for secure local data storage',
		icon: ComputerDesktopIcon,
	},
	{
		title: 'Cloud Sync',
		description: 'Automatic backup and synchronization with cloud',
		icon: ClockIcon,
	},
	{
		title: 'Cash Management',
		description: 'Track daily transactions and financial operations',
		icon: CheckCircleIcon,
	},
	{
		title: 'Investment Tracking',
		description: 'Monitor loan portfolios and investment performance',
		icon: ShieldCheckIcon,
	},
];

const systemRequirements = [
	'Windows 10 or later (64-bit)',
	'4 GB RAM minimum (8 GB recommended)',
	'500 MB free disk space',
	'Internet connection for cloud sync',
	'Secu-Hamster Pro 20-AP Fingerprint Scanner (Pro/Enterprise)',
	'Active subscription plan',
];

const DownloadPage = () => {
	const [checkedRequirements, setCheckedRequirements] = useState<{[key: number]: boolean}>({});
	const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

	const faqs = [
		{
			question: 'What if I get a security warning during installation?',
			answer: 'LoanPro is digitally signed by our developers. If you see a Windows SmartScreen warning, click "More info" then "Run anyway". This is normal for newly released apps.'
		},
		{
			question: 'Can I use LoanPro on Mac or Linux?',
			answer: 'Currently, LoanPro is only available for Windows (10 and later). We are working on Mac and Linux versions - check back soon!'
		},
		{
			question: 'Do I need a fingerprint scanner?',
			answer: 'The Secu-Hamster Pro 20-AP fingerprint scanner is required only for the Pro and Enterprise plans for biometric authentication. The Basic plan uses password authentication.'
		},
		{
			question: 'What if I lose my internet connection?',
			answer: 'LoanPro works offline! Your data is stored locally in SQLite database. Once you reconnect, changes automatically sync with the cloud.'
		},
		{
			question: 'How much data can I store?',
			answer: 'Basic: 200 MB cloud storage, Pro: 1 GB cloud storage, Enterprise: Unlimited. Local storage depends on your PC.'
		}
	];

	const toggleRequirementCheck = (index: number) => {
		setCheckedRequirements(prev => ({
			...prev,
			[index]: !prev[index]
		}));
	};

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
						<span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
							{' '}
							LoanPro Desktop
						</span>
					</h1>
					<p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
						Get the official LoanPro desktop application for Windows. Fast, secure, and designed specifically for loan
						management professionals.
					</p>

					{/* Download Button */}
					<div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12">
						<a
							href="/downloads/LoanPro-Setup-1.0.1.exe"
							download
							className="group relative bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold px-8 py-4 rounded-2xl shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300 flex items-center space-x-3"
						>
							<ArrowDownTrayIcon className="w-6 h-6" />
							<span>Download for Windows</span>
							<div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
						</a>

						<div className="text-center">
							<div className="text-sm text-gray-500">Version 1.0.1 • 96.3 MB</div>
							<div className="text-sm text-green-600 font-medium">✓ Virus-free & Digitally Signed</div>
						</div>
					</div>
				</div>

				{/* Screenshots Section */}
				<div className="mb-20">
					<h2 className="text-3xl font-bold text-center text-gray-900 mb-12">See LoanPro in Action</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-4 hover:bg-white/30 transition-all duration-300 group">
							<img
								src="/screenshots/DashBoard.png"
								alt="LoanPro Dashboard"
								className="w-full h-48 object-cover rounded-lg mb-4 group-hover:scale-105 transition-transform"
							/>
							<h3 className="font-semibold text-gray-900 mb-2">Main Dashboard</h3>
							<p className="text-sm text-gray-600">Comprehensive overview of your loan operations</p>
						</div>

						<div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-4 hover:bg-white/30 transition-all duration-300 group">
							<img
								src="/screenshots/Add New Record.png"
								alt="Add New Record"
								className="w-full h-48 object-cover rounded-lg mb-4 group-hover:scale-105 transition-transform"
							/>
							<h3 className="font-semibold text-gray-900 mb-2">Add New Record</h3>
							<p className="text-sm text-gray-600">Easy loan record creation with biometric verification</p>
						</div>

						<div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-4 hover:bg-white/30 transition-all duration-300 group">
							<img
								src="/screenshots/View Accounts.png"
								alt="View Accounts"
								className="w-full h-48 object-cover rounded-lg mb-4 group-hover:scale-105 transition-transform"
							/>
							<h3 className="font-semibold text-gray-900 mb-2">Account Management</h3>
							<p className="text-sm text-gray-600">Track all customer accounts and loan details</p>
						</div>

						<div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-4 hover:bg-white/30 transition-all duration-300 group">
							<img
								src="/screenshots/Daily Report.png"
								alt="Daily Report"
								className="w-full h-48 object-cover rounded-lg mb-4 group-hover:scale-105 transition-transform"
							/>
							<h3 className="font-semibold text-gray-900 mb-2">Daily Reports</h3>
							<p className="text-sm text-gray-600">Detailed financial reports and analytics</p>
						</div>

						<div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-4 hover:bg-white/30 transition-all duration-300 group">
							<img
								src="/screenshots/Stock Details.png"
								alt="Stock Details"
								className="w-full h-48 object-cover rounded-lg mb-4 group-hover:scale-105 transition-transform"
							/>
							<h3 className="font-semibold text-gray-900 mb-2">Investment Tracking</h3>
							<p className="text-sm text-gray-600">Monitor portfolios and investment performance</p>
						</div>

						<div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-4 hover:bg-white/30 transition-all duration-300 group">
							<img
								src="/screenshots/DashBoard Dark Mode.png"
								alt="Dark Mode Dashboard"
								className="w-full h-48 object-cover rounded-lg mb-4 group-hover:scale-105 transition-transform"
							/>
							<h3 className="font-semibold text-gray-900 mb-2">Dark Mode</h3>
							<p className="text-sm text-gray-600">Eye-friendly dark theme for extended use</p>
						</div>
					</div>
				</div>

				{/* Features Grid */}
				<div className="mb-20">
					<h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose LoanPro Desktop?</h2>
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

				{/* Setup Guide */}
				<HowToSetup showTitle={true} />

				{/* System Requirements & Installation */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
					{/* System Requirements - Interactive Checklist */}
					<div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-3xl p-8 hover:shadow-lg transition-shadow">
						<h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center space-x-3">
							<ComputerDesktopIcon className="w-7 h-7 text-blue-600" />
							<span>System Requirements</span>
						</h3>
						<p className="text-gray-600 text-sm mb-6">Check off your system capabilities before installing:</p>
						<ul className="space-y-3">
							{systemRequirements.map((req, idx) => (
								<li 
									key={idx}
									onClick={() => toggleRequirementCheck(idx)}
									className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${
										checkedRequirements[idx] 
											? 'bg-green-100 border border-green-300' 
											: 'bg-white/50 border border-transparent hover:bg-white/80'
									}`}
								>
									<div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
										checkedRequirements[idx]
											? 'bg-green-500 border-green-500'
											: 'border-gray-300'
									}`}>
										{checkedRequirements[idx] && <CheckIcon className="w-4 h-4 text-white" />}
									</div>
									<span className={`${checkedRequirements[idx] ? 'text-gray-900 font-medium line-through opacity-60' : 'text-gray-700'}`}>
										{req}
									</span>
								</li>
							))}
						</ul>
						<div className="mt-6 p-4 bg-green-100 border border-green-300 rounded-xl">
							<p className="text-sm text-green-900">
								<strong>✓ Ready to install?</strong> Once all items are checked, you're good to go!
							</p>
						</div>
					</div>

					{/* Installation Instructions */}
					<div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-3xl p-8 hover:shadow-lg transition-shadow">
						<h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center space-x-3">
							<RocketLaunchIcon className="w-7 h-7 text-purple-600" />
							<span>Installation Guide</span>
						</h3>
						<p className="text-gray-600 text-sm mb-6">Follow these 4 simple steps:</p>
						<ol className="space-y-4">
							<li className="flex items-start space-x-3">
								<div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
									1
								</div>
								<div>
									<p className="text-gray-900 font-semibold">Download</p>
									<p className="text-sm text-gray-600">Click the blue <strong>Download for Windows</strong> button above</p>
								</div>
							</li>
							<li className="flex items-start space-x-3">
								<div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
									2
								</div>
								<div>
									<p className="text-gray-900 font-semibold">Run</p>
									<p className="text-sm text-gray-600">Open the <strong>LoanPro-Setup-1.0.1.exe</strong> file from your Downloads folder</p>
								</div>
							</li>
							<li className="flex items-start space-x-3">
								<div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
									3
								</div>
								<div>
									<p className="text-gray-900 font-semibold">Install</p>
									<p className="text-sm text-gray-600">Follow the wizard, accept terms, and choose your installation location</p>
								</div>
							</li>
							<li className="flex items-start space-x-3">
								<div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
									4
								</div>
								<div>
									<p className="text-gray-900 font-semibold">Launch & Login</p>
									<p className="text-sm text-gray-600">Open LoanPro and sign in with your account credentials</p>
								</div>
							</li>
						</ol>
						<div className="mt-6 p-4 bg-blue-100 border border-blue-300 rounded-xl flex items-start gap-3">
							<ExclamationTriangleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
							<p className="text-sm text-blue-900">
								If you get a security warning, that's normal! Click "More info" then "Run anyway"
							</p>
						</div>
					</div>
				</div>

				{/* Device Binding Walkthrough */}
				<div className="mb-16">
					<h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Next: Bind Your Device</h2>
					<div className="bg-gradient-to-r from-green-100 to-blue-100 border-2 border-green-300 rounded-3xl p-8">
						<div className="flex items-start gap-4 mb-6">
							<div className="text-4xl">📱</div>
							<div>
								<h3 className="text-2xl font-bold text-gray-900">Device Binding Setup</h3>
								<p className="text-gray-700">Secure your account with device binding (required for Pro/Enterprise plans)</p>
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							<div className="bg-white/60 rounded-xl p-4">
								<div className="text-3xl mb-2">🔧</div>
								<p className="font-semibold text-gray-900 text-sm mb-1">Connect Scanner</p>
								<p className="text-xs text-gray-600">Plug in your Secu-Hamster Pro 20-AP fingerprint scanner via USB</p>
							</div>
							<div className="bg-white/60 rounded-xl p-4">
								<div className="text-3xl mb-2">🖐️</div>
								<p className="font-semibold text-gray-900 text-sm mb-1">Enroll Fingers</p>
								<p className="text-xs text-gray-600">Scan 4-5 fingers for biometric authentication setup</p>
							</div>
							<div className="bg-white/60 rounded-xl p-4">
								<div className="text-3xl mb-2">🔐</div>
								<p className="font-semibold text-gray-900 text-sm mb-1">Bind Device</p>
								<p className="text-xs text-gray-600">Confirm device binding in LoanPro settings</p>
							</div>
							<div className="bg-white/60 rounded-xl p-4">
								<div className="text-3xl mb-2">✅</div>
								<p className="font-semibold text-gray-900 text-sm mb-1">Start Using</p>
								<p className="text-xs text-gray-600">Use fingerprint to unlock and manage loans</p>
							</div>
						</div>
						<div className="mt-6 bg-white/80 rounded-xl p-4 border border-green-200">
							<p className="text-sm text-gray-900">
								<strong>Need help with device binding?</strong> Go to Settings → Devices in LoanPro, or contact our support team.
							</p>
						</div>
					</div>
				</div>

				{/* Troubleshooting FAQ */}
				<div className="mb-16">
					<h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Troubleshooting & FAQs</h2>
					<div className="max-w-3xl mx-auto space-y-4">
						{faqs.map((faq, idx) => (
							<div 
								key={idx}
								className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl overflow-hidden hover:border-white/50 transition-all"
							>
								<button
									onClick={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}
									className="w-full flex items-center justify-between p-6 hover:bg-white/10 transition-colors"
								>
									<h4 className="text-lg font-semibold text-gray-900 text-left">{faq.question}</h4>
									<ChevronDownIcon className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${expandedFAQ === idx ? 'rotate-180' : ''}`} />
								</button>
								{expandedFAQ === idx && (
									<div className="px-6 pb-6 border-t border-white/20 bg-white/5">
										<p className="text-gray-700">{faq.answer}</p>
									</div>
								)}
							</div>
						))}
					</div>
				</div>
				<div className="text-center">
					<div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-8 max-w-2xl mx-auto">
						<h3 className="text-2xl font-bold text-gray-900 mb-4">Need Help Getting Started?</h3>
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