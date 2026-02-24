'use client';
import React, { useEffect, useState } from 'react';
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

type ReleaseInfo = {
	version: string;
	publishedAt: string;
	assetName: string;
	downloadUrl: string;
	assetSizeBytes: number;
};

const FALLBACK_RELEASE: ReleaseInfo = {
	version: '1.0.3',
	publishedAt: 'latest',
	assetName: 'LoanPro.Setup.1.0.3.exe',
	downloadUrl: 'https://github.com/jakshat296/loanpro_web/releases/download/v1.0.3/LoanPro.Setup.1.0.3.exe',
	assetSizeBytes: 130 * 1024 * 1024,
};

const DownloadPage = () => {
	const [checkedRequirements, setCheckedRequirements] = useState<{[key: number]: boolean}>({});
	const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
	const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo>(FALLBACK_RELEASE);
	const [isReleaseLoading, setIsReleaseLoading] = useState(true);

	useEffect(() => {
		const fetchLatestRelease = async () => {
			try {
				const response = await fetch('https://api.github.com/repos/jakshat296/loanpro_web/releases/latest', {
					headers: {
						Accept: 'application/vnd.github+json',
					},
					cache: 'no-store',
				});

				if (!response.ok) {
					throw new Error(`Failed to fetch release: ${response.status}`);
				}

				const data = await response.json();
				const exeAsset = (data.assets || []).find((asset: any) =>
					typeof asset?.name === 'string' && asset.name.toLowerCase().endsWith('.exe')
				);

				if (!exeAsset) {
					throw new Error('No .exe asset found in latest release');
				}

				setReleaseInfo({
					version: String(data.tag_name || '').replace(/^v/i, '') || FALLBACK_RELEASE.version,
					publishedAt: data.published_at || FALLBACK_RELEASE.publishedAt,
					assetName: exeAsset.name,
					downloadUrl: exeAsset.browser_download_url,
					assetSizeBytes: exeAsset.size || FALLBACK_RELEASE.assetSizeBytes,
				});
			} catch {
				setReleaseInfo(FALLBACK_RELEASE);
			} finally {
				setIsReleaseLoading(false);
			}
		};

		fetchLatestRelease();
	}, []);

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

	const formatSize = (bytes: number) => {
		if (!bytes) return 'Unknown size';
		const mb = bytes / (1024 * 1024);
		return `${mb.toFixed(1)} MB`;
	};

	return (
		<div className="min-h-screen bg-slate-50 pt-20">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
				{/* Header Section */}
				<div className="text-center mb-16">
					<div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600">
						<ArrowDownTrayIcon className="w-4 h-4 text-blue-600" />
						Desktop app
					</div>
					<h1 className="mt-6 text-3xl sm:text-4xl font-semibold text-slate-900 font-display">
						Download LoanPro for Windows
					</h1>
					<p className="mt-3 text-lg text-slate-600 max-w-3xl mx-auto">
						Install the desktop application to manage loans locally with optional cloud backup and biometric access.
					</p>

					<div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
						<a
							href={releaseInfo.downloadUrl}
							download
							className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
						>
							<ArrowDownTrayIcon className="w-5 h-5" />
							Download for Windows
						</a>

						<div className="text-center text-sm text-slate-500">
							<div>
								Version {releaseInfo.version} • {formatSize(releaseInfo.assetSizeBytes)}
							</div>
							<div className="text-slate-500">Digitally signed installer</div>
							{isReleaseLoading ? (
								<div className="text-xs text-slate-400">Fetching latest release...</div>
							) : null}
						</div>
					</div>
				</div>

				{/* Screenshots Section */}
				<div className="mb-20">
					<h2 className="text-2xl sm:text-3xl font-semibold text-center text-slate-900 mb-10 font-display">See LoanPro in action</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
							<img
								src="/screenshots/download/dashboard.png"
								alt="LoanPro Dashboard"
								className="w-full h-48 object-cover rounded-lg mb-4"
							/>
							<h3 className="font-semibold text-slate-900 mb-2">Main Dashboard</h3>
							<p className="text-sm text-slate-600">Overview of loan operations and daily performance.</p>
						</div>

						<div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
							<img
								src="/screenshots/download/add-new-record.png"
								alt="Add New Record"
								className="w-full h-48 object-cover rounded-lg mb-4"
							/>
							<h3 className="font-semibold text-slate-900 mb-2">Add New Record</h3>
							<p className="text-sm text-slate-600">Create loan records quickly with verification.</p>
						</div>

						<div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
							<img
								src="/screenshots/download/view-accounts.png"
								alt="View Accounts"
								className="w-full h-48 object-cover rounded-lg mb-4"
							/>
							<h3 className="font-semibold text-slate-900 mb-2">Account Management</h3>
							<p className="text-sm text-slate-600">Track customer accounts and loan details.</p>
						</div>

						<div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
							<img
								src="/screenshots/download/daily-report.png"
								alt="Daily Report"
								className="w-full h-48 object-cover rounded-lg mb-4"
							/>
							<h3 className="font-semibold text-slate-900 mb-2">Settings</h3>
							<p className="text-sm text-slate-600">Configure application preferences and system settings.</p>
						</div>

						<div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
							<img
								src="/screenshots/download/stock-details.png"
								alt="Stock Details"
								className="w-full h-48 object-cover rounded-lg mb-4"
							/>
							<h3 className="font-semibold text-slate-900 mb-2">Cloud Backup</h3>
							<p className="text-sm text-slate-600">Automatic backup and synchronization with cloud storage.</p>
						</div>

						<div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
							<img
								src="/screenshots/download/dashboard-dark-mode.png"
								alt="Dark Mode Dashboard"
								className="w-full h-48 object-cover rounded-lg mb-4"
							/>
							<h3 className="font-semibold text-slate-900 mb-2">Support Tickets</h3>
							<p className="text-sm text-slate-600">Get help and support for LoanPro desktop application.</p>
						</div>
					</div>
				</div>

				{/* Features Grid */}
				<div className="mb-20">
					<h2 className="text-2xl sm:text-3xl font-semibold text-center text-slate-900 mb-10 font-display">Why choose LoanPro Desktop</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{features.map((feature, idx) => {
							const IconComponent = feature.icon;
							return (
								<div
									key={idx}
									className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
								>
									<div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
										<IconComponent className="w-5 h-5 text-blue-600" />
									</div>
									<h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
									<p className="text-sm text-slate-600">{feature.description}</p>
								</div>
							);
						})}
					</div>
				</div>

				{/* Setup Guide */}
				<HowToSetup showTitle={true} />

				{/* System Requirements & Installation */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
					{/* System Requirements - Interactive Checklist */}
					<div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
						<h3 className="text-xl font-semibold text-slate-900 mb-2 flex items-center gap-2">
							<ComputerDesktopIcon className="w-5 h-5 text-blue-600" />
							<span>System requirements</span>
						</h3>
						<p className="text-slate-600 text-sm mb-6">Check your system before installing:</p>
						<ul className="space-y-3">
							{systemRequirements.map((req, idx) => (
								<li 
									key={idx}
									onClick={() => toggleRequirementCheck(idx)}
									className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
										checkedRequirements[idx] 
											? 'bg-green-50 border border-green-200' 
											: 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
									}`}
								>
									<div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
										checkedRequirements[idx]
											? 'bg-green-500 border-green-500'
											: 'border-gray-300'
									}`}>
										{checkedRequirements[idx] && <CheckIcon className="w-4 h-4 text-white" />}
									</div>
									<span className={`${checkedRequirements[idx] ? 'text-slate-900 font-medium line-through opacity-60' : 'text-slate-700'}`}>
										{req}
									</span>
								</li>
							))}
						</ul>
						<div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
							<p className="text-sm text-slate-700">
								Once all items are checked, you're ready to install.
							</p>
						</div>
					</div>

					{/* Installation Instructions */}
					<div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
						<h3 className="text-xl font-semibold text-slate-900 mb-2 flex items-center gap-2">
							<RocketLaunchIcon className="w-5 h-5 text-blue-600" />
							<span>Installation guide</span>
						</h3>
						<p className="text-slate-600 text-sm mb-6">Follow these steps:</p>
						<ol className="space-y-4">
							<li className="flex items-start space-x-3">
								<div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 mt-0.5">
									1
								</div>
								<div>
									<p className="text-slate-900 font-semibold">Download</p>
									<p className="text-sm text-slate-600">Click the Download for Windows button above.</p>
								</div>
							</li>
							<li className="flex items-start space-x-3">
								<div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 mt-0.5">
									2
								</div>
								<div>
									<p className="text-slate-900 font-semibold">Run</p>
									<p className="text-sm text-slate-600">Open LoanPro-Setup-1.0.1.exe from your Downloads folder.</p>
								</div>
							</li>
							<li className="flex items-start space-x-3">
								<div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 mt-0.5">
									3
								</div>
								<div>
									<p className="text-slate-900 font-semibold">Install</p>
									<p className="text-sm text-slate-600">Follow the setup wizard and choose an install location.</p>
								</div>
							</li>
							<li className="flex items-start space-x-3">
								<div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 mt-0.5">
									4
								</div>
								<div>
									<p className="text-slate-900 font-semibold">Launch & login</p>
									<p className="text-sm text-slate-600">Open LoanPro and sign in with your account.</p>
								</div>
							</li>
						</ol>
						<div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
							<ExclamationTriangleIcon className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
							<p className="text-sm text-slate-700">
								If Windows SmartScreen appears, select More info, then Run anyway.
							</p>
						</div>
					</div>
				</div>

				{/* Device Binding Walkthrough */}
				<div className="mb-16">
					<h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-10 text-center font-display">Bind your device</h2>
					<div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
						<div className="flex items-start gap-3 mb-6">
							<FingerPrintIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
							<div>
								<h3 className="text-lg font-semibold text-slate-900">Device binding for biometric access</h3>
								<p className="text-sm text-slate-600">Required for Pro and Enterprise plans that use fingerprint login.</p>
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							{[
								{ title: 'Connect scanner', text: 'Plug in the SecuGen Hamster Pro 20-AP via USB.' },
								{ title: 'Enroll fingerprints', text: 'Scan 4-5 fingers in the setup flow.' },
								{ title: 'Bind device', text: 'Confirm the device in Settings → Devices.' },
								{ title: 'Start using', text: 'Use fingerprint login for secure access.' }
							].map((item, idx) => (
								<div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
									<div className="text-xs font-semibold text-slate-500">Step {idx + 1}</div>
									<p className="mt-2 font-semibold text-slate-900 text-sm">{item.title}</p>
									<p className="text-xs text-slate-600 mt-1">{item.text}</p>
								</div>
							))}
						</div>
						<div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
							<p className="text-sm text-slate-700">
								Need help? Visit Settings → Devices in LoanPro or contact support.
							</p>
						</div>
					</div>
				</div>

				{/* Troubleshooting FAQ */}
				<div className="mb-16">
					<h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-10 text-center font-display">Troubleshooting & FAQs</h2>
					<div className="max-w-3xl mx-auto space-y-4">
						{faqs.map((faq, idx) => (
							<div 
								key={idx}
								className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
							>
								<button
									onClick={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}
									className="w-full flex items-center justify-between p-5 text-left"
								>
									<h4 className="text-base font-semibold text-slate-900">{faq.question}</h4>
									<ChevronDownIcon className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform ${expandedFAQ === idx ? 'rotate-180' : ''}`} />
								</button>
								{expandedFAQ === idx && (
									<div className="px-5 pb-5 text-sm text-slate-600">
										{faq.answer}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
				<div className="text-center">
					<div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl mx-auto shadow-sm">
						<h3 className="text-xl font-semibold text-slate-900 mb-3">Need help getting started?</h3>
						<p className="text-slate-600 mb-6">
							Our support team can help with installation and setup.
						</p>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-3">
							<a
								href="mailto:support@loanpro.tech"
								className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
							>
								Email support
							</a>
							<a
								href="tel:+911234567890"
								className="bg-white border border-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-lg hover:border-slate-300 transition-colors"
							>
								Call support
							</a>
						</div>
						<p className="text-slate-500 text-sm mt-4">
							Support hours: Monday-Friday, 9 AM - 6 PM IST
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DownloadPage;