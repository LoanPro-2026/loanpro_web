'use client'
import { useState } from "react";
import { InfoOutlined, CalendarToday, Refresh, TrendingUp, AccountBalance, AttachMoney, ShowChart } from "@mui/icons-material";
import clsx from "clsx";


const cardData = [
  {
    title: "Total Investment",
    value: "₹ 30,357,989",
    icon: <TrendingUp fontSize="medium" />,
    subtext: { text: "+12.5%", badge: "[3630 records]", color: "green" },
    info: true,
    bg: "from-[#f3e8ff] to-[#f8fafc] dark:from-[#3b0764] dark:to-[#1e293b]",
    iconBg: "bg-purple-100 dark:bg-purple-900",
    iconColor: "text-purple-600 dark:text-purple-200",
    text: "text-purple-900 dark:text-purple-100",
    badgeBg: "bg-green-100 dark:bg-green-900",
    badgeText: "text-green-700 dark:text-green-200",
    wave: "#a78bfa",
  },
  {
    title: "Investment",
    value: "₹ 10,000",
    icon: <AccountBalance fontSize="medium" />,
    subtext: { text: "-5.2%", badge: "[1 records]", color: "red" },
    info: true,
    bg: "from-[#e0f2fe] to-[#f8fafc] dark:from-[#0c4a6e] dark:to-[#1e293b]",
    iconBg: "bg-blue-100 dark:bg-blue-900",
    iconColor: "text-blue-600 dark:text-blue-200",
    text: "text-blue-900 dark:text-blue-100",
    badgeBg: "bg-red-100 dark:bg-red-900",
    badgeText: "text-red-700 dark:text-red-200",
    wave: "#38bdf8",
  },
  {
    title: "Returns",
    value: "₹ 0",
    icon: <ShowChart fontSize="medium" />,
    subtext: { text: "+8.7%", badge: "[0 records]", color: "green" },
    info: true,
    bg: "from-[#fff7ed] to-[#f8fafc] dark:from-[#7c2d12] dark:to-[#1e293b]",
    iconBg: "bg-orange-100 dark:bg-orange-900",
    iconColor: "text-orange-600 dark:text-orange-200",
    text: "text-orange-900 dark:text-orange-100",
    badgeBg: "bg-green-100 dark:bg-green-900",
    badgeText: "text-green-700 dark:text-green-200",
    wave: "#fb923c",
  },
  {
    title: "Interest",
    value: "₹ 0",
    icon: <AttachMoney fontSize="medium" />,
    subtext: { text: "+3.2%", badge: "", color: "green" },
    info: true,
    bg: "from-[#f0fdf4] to-[#f8fafc] dark:from-[#14532d] dark:to-[#1e293b]",
    iconBg: "bg-green-100 dark:bg-green-900",
    iconColor: "text-green-600 dark:text-green-200",
    text: "text-green-900 dark:text-green-100",
    badgeBg: "bg-green-100 dark:bg-green-900",
    badgeText: "text-green-700 dark:text-green-200",
    wave: "#22c55e",
  },
];

const options = ["Today", "Week", "Month"];

export default function Dashboard() {
  const [selectedOption, setSelectedOption] = useState("Month");
  const today = new Date();
  const dateString = today.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1 dark:text-white">Dashboard Overview</h1>
          <div className="flex items-center text-gray-500 dark:text-gray-300 text-sm">
            <CalendarToday className="mr-2" fontSize="small" />
            <span>{dateString}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 md:mt-0">
          {options.map((opt) => (
            <button
              key={opt}
              className={clsx(
                "px-4 py-2 rounded-lg font-medium transition-colors",
                selectedOption === opt
                  ? "bg-blue-600 text-white dark:bg-blue-500"
                  : "bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900"
              )}
              onClick={() => setSelectedOption(opt)}
            >
              {opt}
            </button>
          ))}
          <button className="ml-2 p-2 rounded-lg bg-gray-100 dark:bg-neutral-700 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
            <Refresh />
          </button>
        </div>
      </div>

      {/* Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardData.map((card, idx) => (
          <div
            key={card.title}
            className={clsx(
              "relative rounded-3xl shadow-lg p-6 flex flex-col justify-between overflow-hidden border border-gray-100 dark:border-neutral-800",
              "bg-gradient-to-br",
              card.bg
            )}
            style={{ minHeight: 210 }}
          >
            {/* Info icon */}
            <div className="absolute top-4 right-4">
              {card.info && <InfoOutlined fontSize="small" className="opacity-60" />}
            </div>
            {/* Icon in colored circle */}
            <div className={clsx("z-10 w-12 h-12 flex items-center justify-center rounded-full mb-4 shadow-md", card.iconBg)}>
              <span className={clsx("text-2xl", card.iconColor)}>{card.icon}</span>
            </div>
            {/* Title and Value */}
            <div className={clsx("z-10 text-lg font-semibold mb-1", card.text)}>{card.title}</div>
            <div className={clsx("z-10 text-3xl font-bold mb-2", card.text)}>{card.value}</div>
            {/* Subtext badge */}
            <div className="z-10 flex items-center gap-2 mt-auto">
              {card.subtext && (
                <span className={clsx(
                  "px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1",
                  card.badgeBg,
                  card.badgeText
                )}>
                  {card.subtext.text}
                  {card.subtext.badge && (
                    <span className="ml-2 text-gray-500 dark:text-gray-300 font-normal">{card.subtext.badge}</span>
                  )}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 