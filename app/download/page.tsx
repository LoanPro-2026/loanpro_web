'use client';
import React, { useEffect, useState } from 'react';
import { ArrowDownTrayIcon, CheckCircleIcon, ComputerDesktopIcon, ShieldCheckIcon, RocketLaunchIcon, ClockIcon, DevicePhoneMobileIcon, ChevronDownIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import HowToSetup from '../../components/HowToSetup';
import { trackEvent } from '@/lib/googleAnalytics';

const features = [
    {
        title: 'Simple Dashboard',
        description: 'Track your daily cash, total loans, and total collections easily.',
        icon: RocketLaunchIcon,
    },
    {
        title: 'Customer Photos',
        description: 'Easily capture photos of customers and items directly from your Android phone.',
        icon: DevicePhoneMobileIcon,
    },
    {
        title: 'Works Offline',
        description: 'Your app works perfectly fine even if your shop internet connection is slow or drops.',
        icon: ComputerDesktopIcon,
    },
    {
        title: 'Cloud Backup',
        description: 'Automated backups to Google Drive keep your records completely safe.',
        icon: ClockIcon,
    },
    {
        title: 'Cash Tracking',
        description: 'Keep a clean record of all deposits, payments, and withdrawals.',
        icon: CheckCircleIcon,
    },
    {
        title: 'Simple Reports',
        description: 'See which customers owe you money and exactly how much profit you made.',
        icon: ShieldCheckIcon,
    },
];

const systemRequirements = [
    'Windows 10 or later (64-bit)',
    '4 GB RAM minimum (8 GB recommended)',
    '500 MB free disk space',
    'Internet connection for cloud sync',
    'Android phone with camera (for companion photo capture)',
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
    version: 'latest',
    publishedAt: 'latest',
    assetName: 'LoanPro.Setup.latest.exe',
    downloadUrl: `https://github.com/${process.env.NEXT_PUBLIC_GITHUB_RELEASE_ORGANIZATION || 'LoanPro-2026'}/${process.env.NEXT_PUBLIC_GITHUB_RELEASE_REPO || 'loanpro_web'}/releases/latest`,
    assetSizeBytes: 130 * 1024 * 1024,
};

const DownloadPage = () => {
    const [checkedRequirements, setCheckedRequirements] = useState<{ [key: number]: boolean }>({});
    const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
    const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo>(FALLBACK_RELEASE);
    const [isReleaseLoading, setIsReleaseLoading] = useState(true);

    useEffect(() => {
        const fetchLatestRelease = async () => {
            try {
                const response = await fetch(`/api/releases/latest?ts=${Date.now()}`, {
                    cache: 'no-store',
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch release: ${response.status}`);
                }

                const data = await response.json();
                if (!data?.success || !data?.release) {
                    throw new Error(data?.error || 'No latest release found');
                }

                const release = data.release;
                setReleaseInfo({
                    version: String(release.version || FALLBACK_RELEASE.version),
                    publishedAt: String(release.publishedAt || FALLBACK_RELEASE.publishedAt),
                    assetName: String(release.assetName || FALLBACK_RELEASE.assetName),
                    downloadUrl: String(release.downloadUrl || FALLBACK_RELEASE.downloadUrl),
                    assetSizeBytes: Number(release.assetSizeBytes || FALLBACK_RELEASE.assetSizeBytes),
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
            question: 'What if my computer shows a warning when installing?',
            answer: 'Windows might show a blue screen warning because it is a new app. Please click "More info" and then "Run anyway" to install it. It is perfectly safe.'
        },
        {
            question: 'Can I use this on Apple Macbook or Linux?',
            answer: 'No, LoanPro only works on Windows computers because that is what most shop owners use.'
        },
        {
            question: 'Is an Android phone absolutely necessary?',
            answer: 'No, your Windows computer is all you need. You only need the Android app if you want to take pictures of your customers and their gold/silver items.'
        },
        {
            question: 'What if my shop internet goes down?',
            answer: 'You can keep using LoanPro completely offline. Your daily work won\'t be affected. It will sync your backups once the internet is back.'
        },
        {
            question: 'How long does it take to learn and set up?',
            answer: 'You can download, install, and create your first loan in less than 5 minutes. It is very simple to understand.'
        },
        {
            question: 'What happens if I buy a new computer?',
            answer: 'If you use Cloud Backup, you just log into LoanPro on your new computer and all your shop records will be restored instantly.'
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

    const installerName = releaseInfo.assetName || 'LoanPro installer';

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
                        Install LoanPro on your Windows computer and start managing your shop without paper registers.
                    </p>

                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a
                            href={releaseInfo.downloadUrl}
                            download
                            onClick={() =>
                                trackEvent('file_download', {
                                    file_name: releaseInfo.assetName,
                                    file_extension: releaseInfo.assetName?.split('.').pop() || 'exe',
                                    version: releaseInfo.version,
                                    source: 'download_page',
                                })
                            }
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
                            <p className="text-sm text-slate-600">Real-time snapshot of collections, receivables, and daily operational status.</p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <img
                                src="/screenshots/download/add-new-record.png"
                                alt="Add New Record"
                                className="w-full h-48 object-cover rounded-lg mb-4"
                            />
                            <h3 className="font-semibold text-slate-900 mb-2">Add New Record</h3>
                            <p className="text-sm text-slate-600">Create validated customer loan entries with structured fields and guided flow.</p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <img
                                src="/screenshots/download/view-accounts.png"
                                alt="View Accounts"
                                className="w-full h-48 object-cover rounded-lg mb-4"
                            />
                            <h3 className="font-semibold text-slate-900 mb-2">Account Management</h3>
                            <p className="text-sm text-slate-600">Review customer account history, balances, and repayment progress in one place.</p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <img
                                src="/screenshots/download/daily-report.png"
                                alt="Daily Report"
                                className="w-full h-48 object-cover rounded-lg mb-4"
                            />
                            <h3 className="font-semibold text-slate-900 mb-2">Settings</h3>
                            <p className="text-sm text-slate-600">Configure office profile, device setup, backup preferences, and workflow behavior.</p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <img
                                src="/screenshots/download/stock-details.png"
                                alt="Stock Details"
                                className="w-full h-48 object-cover rounded-lg mb-4"
                            />
                            <h3 className="font-semibold text-slate-900 mb-2">Cloud Backup</h3>
                            <p className="text-sm text-slate-600">Schedule secure backup cycles and keep operational data recoverable over time.</p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <img
                                src="/screenshots/download/dashboard-dark-mode.png"
                                alt="Dark Mode Dashboard"
                                className="w-full h-48 object-cover rounded-lg mb-4"
                            />
                            <h3 className="font-semibold text-slate-900 mb-2">Support Tickets</h3>
                            <p className="text-sm text-slate-600">Raise support requests with context and track updates through your support flow.</p>
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
                                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${checkedRequirements[idx]
                                            ? 'bg-green-50 border border-green-200'
                                            : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${checkedRequirements[idx]
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
                                Once all items are checked, proceed with installation and account authentication.
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
                                    <p className="text-sm text-slate-600">Use the official Download for Windows button shown on this page.</p>
                                </div>
                            </li>
                            <li className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 mt-0.5">
                                    2
                                </div>
                                <div>
                                    <p className="text-slate-900 font-semibold">Run</p>
                                    <p className="text-sm text-slate-600">Open {installerName} from your Downloads folder and allow required permissions.</p>
                                </div>
                            </li>
                            <li className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 mt-0.5">
                                    3
                                </div>
                                <div>
                                    <p className="text-slate-900 font-semibold">Install</p>
                                    <p className="text-sm text-slate-600">Complete the setup wizard and choose your preferred installation location.</p>
                                </div>
                            </li>
                            <li className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 mt-0.5">
                                    4
                                </div>
                                <div>
                                    <p className="text-slate-900 font-semibold">Launch & login</p>
                                    <p className="text-sm text-slate-600">Open LoanPro, sign in, and complete initial workspace setup.</p>
                                </div>
                            </li>
                        </ol>
                        <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-700">
                                If SmartScreen appears, select More info and then Run anyway to continue with installation.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Device Binding Walkthrough */}
                <div className="mb-16">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-10 text-center font-display">Bind your device</h2>
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-start gap-3 mb-6">
                            <DevicePhoneMobileIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Pair your phone for photo capture (Pro plan)</h3>
                                <p className="text-sm text-slate-600">Easily take customer photos from your Android phone and save them to your computer automatically.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { title: 'Install companion app', text: 'Install the LoanPro companion application on your Android phone.' },
                                { title: 'Pair the device', text: 'Pair your phone from the Devices section inside desktop settings.' },
                                { title: 'Allow camera access', text: 'Grant camera permissions so capture requests can be completed successfully.' },
                                { title: 'Use in workflow', text: 'Capture photos during record creation and verify them during repayment or closure.' }
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
                                If pairing fails, verify phone and desktop are on the same network, re-open device settings, and retry pairing before contacting support.
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
                            Call or email us anytime. We can help you install the app and move your paper records to LoanPro.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <a
                                href="mailto:support@loanpro.tech"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                            >
                                Email support
                            </a>
                            <a
                                href="tel:+917898885129"
                                className="bg-white border border-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-lg hover:border-slate-300 transition-colors"
                            >
                                Call support
                            </a>
                        </div>
                        <p className="text-slate-500 text-sm mt-4">
                            Support hours: Monday-Saturday, 10:00 AM - 7:00 PM IST
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DownloadPage;