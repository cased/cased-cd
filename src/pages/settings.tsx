import {
  IconUsers,
  IconShieldCheck,
  IconKey,
  IconArrowRight,
} from "obra-icons-react";
import { useNavigate } from "react-router-dom";
import { useAppearance } from "@/lib/theme";

export function SettingsPage() {
  const navigate = useNavigate();
  const { appearance, setAppearance } = useAppearance();

  const settingsCards = [
    {
      title: "Accounts",
      description: "Manage user accounts and permissions",
      icon: IconUsers,
      count: 24,
      path: undefined,
    },
    {
      title: "Certificates",
      description: "Manage TLS certificates",
      icon: IconShieldCheck,
      count: 6,
      path: undefined,
    },
    {
      title: "GPG Keys",
      description: "Configure GPG keys for commit verification",
      icon: IconKey,
      count: 3,
      path: undefined,
    },
  ];
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="px-6 py-3">
          <h1 className="text-lg font-semibold text-black dark:text-white tracking-tight">
            Settings
          </h1>
          <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
            Configure repositories, clusters, projects, and access control
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-4">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {settingsCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  onClick={() => card.path && navigate(card.path)}
                  className="group rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
                >
                  {/* Icon */}
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded bg-white dark:bg-black mb-2">
                    <Icon size={16} className="text-black dark:text-white" />
                  </div>

                  {/* Content */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm text-black dark:text-white">
                        {card.title}
                      </h3>
                      <IconArrowRight size={14} className="text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      {card.description}
                    </p>
                  </div>

                  {/* Count Badge */}
                  <div className="inline-flex items-center rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:text-neutral-400">
                    {card.count} {card.count === 1 ? "item" : "items"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Additional Settings Section */}
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-black dark:text-white mb-2">
              General
            </h2>
            <div className="flex flex-col gap-2">
              <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
                <h3 className="font-medium text-sm text-black dark:text-white mb-1">
                  Appearance
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                  Customize the look and feel of your dashboard
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAppearance("light")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      appearance === "light"
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setAppearance("dark")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      appearance === "dark"
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => setAppearance("system")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      appearance === "system"
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    System
                  </button>
                </div>
              </div>

              <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
                <h3 className="font-medium text-sm text-black dark:text-white mb-1">
                  Notifications
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                  Configure how you receive alerts and updates
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      defaultChecked
                    />
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Email notifications
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      defaultChecked
                    />
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Slack notifications
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
