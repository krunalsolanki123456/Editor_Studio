import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import type { PlanSlug, BlockPermissionsConfig, UpgradeRequiredPayload } from './types';
import { canUseBlock } from './permissionEngine';

export interface PricingComparisonModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan?: PlanSlug | 'unrestricted';
  blockPermissions?: BlockPermissionsConfig;
  onSelectPlan?: (plan: PlanSlug) => void;
  onUpgradeRequired?: (payload: UpgradeRequiredPayload) => void;
}

interface PlanInfo {
  slug: PlanSlug;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  badge?: string;
  isPopular?: boolean;
  ctaText: string;
  ctaVariant: 'outline' | 'purple' | 'green' | 'default';
}

const PLANS: PlanInfo[] = [
  {
    slug: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Essential blogging and text editing tools.',
    ctaText: 'Start using',
    ctaVariant: 'outline',
  },
  {
    slug: 'pro',
    name: 'Professional',
    monthlyPrice: 29,
    annualPrice: 24,
    description: 'Advanced media, layout, polls and live news feeds.',
    badge: 'Most popular',
    isPopular: true,
    ctaText: 'Start using',
    ctaVariant: 'purple',
  },
  {
    slug: 'enterprise',
    name: 'Custom',
    monthlyPrice: 99,
    annualPrice: 79,
    description: "Let's build your custom plan with election trackers & live data.",
    ctaText: 'Get quote',
    ctaVariant: 'green',
  },
];

interface FeatureRow {
  name: string;
  description?: string;
  free: boolean;
  pro: boolean;
  enterprise: boolean;
}

interface FeatureSection {
  title: string;
  rows: FeatureRow[];
}

export function PricingComparisonModal({
  open,
  onClose,
  currentPlan = 'free',
  blockPermissions,
  onSelectPlan,
  onUpgradeRequired,
}: PricingComparisonModalProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  // Compute block-based comparison dynamically from active permissions or default registry
  const featureSections: FeatureSection[] = useMemo(() => {
    // Helper to check block access
    const checkAccess = (type: string) => ({
      free: canUseBlock(type, 'free', blockPermissions),
      pro: canUseBlock(type, 'pro', blockPermissions),
      enterprise: canUseBlock(type, 'enterprise', blockPermissions),
    });

    return [
      {
        title: 'Core Text & Typography',
        rows: [
          { name: 'Paragraph & Headings (H1-H6)', ...checkAccess('paragraph') },
          { name: 'Lists (Bullet, Numbered, Roman)', ...checkAccess('list') },
          { name: 'Blockquote & Citations', ...checkAccess('quote') },
          { name: 'Stylized Pullquote', ...checkAccess('pullquote') },
          { name: 'Poetry & Lyrics (Verse)', ...checkAccess('verse') },
          { name: 'Syntax Highlighting (Code Block)', ...checkAccess('code') },
          { name: 'Preformatted Monospace', ...checkAccess('preformatted') },
        ],
      },
      {
        title: 'Rich Media & Visual Layouts',
        rows: [
          { name: 'Image Upload & Inline Cropper', ...checkAccess('image') },
          { name: 'Multi-Image Photo Gallery Grid', ...checkAccess('gallery') },
          { name: 'Hero Cover with Background Overlays', ...checkAccess('cover') },
          { name: 'Media & Text (Side-by-Side Split)', ...checkAccess('media-text') },
          { name: 'Production Hero Slider Carousel', ...checkAccess('slider') },
          { name: 'Self-Hosted Video (MP4) & Audio (MP3)', ...checkAccess('video') },
          { name: 'Multi-Column Grids (Columns, Rows, Stack)', ...checkAccess('columns') },
        ],
      },
      {
        title: 'Interactive Feeds & Live Tools',
        rows: [
          { name: '🔴 Live Updates Breaking News Timeline', ...checkAccess('live-updates') },
          { name: '🗳️ Public Opinion Polls & Live Voting', ...checkAccess('poll') },
          { name: '📊 Election Results & Live Trackers', ...checkAccess('election') },
          { name: 'Head-to-Head Candidate Battle Card', ...checkAccess('election') },
          { name: 'Parliament Seat Distribution Arch', ...checkAccess('election') },
        ],
      },
      {
        title: 'Social Embeds & Content Blocks',
        rows: [
          { name: 'YouTube & Vimeo Video Embeds', ...checkAccess('youtube') },
          { name: 'Rich Social Embeds (Twitter/X, Instagram, Spotify)', ...checkAccess('embed') },
          { name: 'Interactive Data Tables & Styling', ...checkAccess('table') },
          { name: 'Call-to-Action Buttons & File Download', ...checkAccess('button') },
          { name: 'Raw Custom HTML Block Injection', ...checkAccess('html') },
        ],
      },
      {
        title: 'Platform & Export Capabilities',
        rows: [
          { name: '1-Click Clean Standalone HTML Export', free: true, pro: true, enterprise: true },
          { name: 'Smart AI Clipboard Paste Engine', free: true, pro: true, enterprise: true },
          { name: 'Full Responsive Mobile & Tablet Preview', free: true, pro: true, enterprise: true },
          { name: 'Multi-Page Document Workspace', free: true, pro: true, enterprise: true },
          { name: 'Dedicated Super Admin Block Permissions', free: false, pro: false, enterprise: true },
        ],
      },
    ];
  }, [blockPermissions]);

  if (!open || typeof document === 'undefined') return null;

  const handlePlanCta = (plan: PlanSlug) => {
    if (plan === currentPlan) {
      onClose();
      return;
    }

    if (onSelectPlan) {
      onSelectPlan(plan);
    }

    if (onUpgradeRequired) {
      onUpgradeRequired({
        blockType: 'plan_upgrade',
        blockLabel: `${plan.toUpperCase()} Plan`,
        currentPlan: currentPlan === 'unrestricted' ? 'free' : currentPlan,
        requiredPlan: plan,
      });
    }

    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl my-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Header & Close Button ─────────────────────────────── */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Plans & Feature Comparison
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unlock advanced media, live poll widgets, and real-time election trackers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Scrollable Body ────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto be-scroll p-4 sm:p-8 space-y-8">
          {/* Billing Cycle Toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 select-none shadow-xs">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Calendar size={14} />
                <span>Monthly</span>
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  billingCycle === 'annual'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Zap size={14} />
                <span>Annual</span>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 ml-1">
                  Save 20%
                </span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 px-3 py-1.5 rounded-full">
              <span>✨ Excellent choice! Annual plans save up to 20%</span>
            </div>
          </div>

          {/* ── Top Pricing Cards Grid ───────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.slug;
              const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;

              return (
                <div
                  key={plan.slug}
                  className={`relative rounded-3xl p-6 transition-all flex flex-col justify-between ${
                    plan.isPopular
                      ? 'bg-gradient-to-b from-purple-50/80 via-white to-purple-50/40 dark:from-purple-950/30 dark:via-slate-900 dark:to-purple-950/20 border-2 border-purple-500 shadow-2xl shadow-purple-500/15 scale-[1.02] z-10'
                      : 'bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'
                  }`}
                >
                  {/* Popular Banner */}
                  {plan.isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-[11px] uppercase tracking-wider shadow-md shadow-purple-500/30">
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        {plan.name}
                      </h3>
                      {isCurrent && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Current Plan
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[32px] leading-relaxed mb-4">
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div className="mb-6">
                      {plan.slug === 'free' ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-900 dark:text-white">$0</span>
                          <span className="text-xs text-slate-400">/ month</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-900 dark:text-white">${price}</span>
                          <span className="text-xs text-slate-400">/ month</span>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {billingCycle === 'annual' && plan.slug !== 'free' ? 'Billed annually' : 'Free forever'}
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    type="button"
                    onClick={() => handlePlanCta(plan.slug)}
                    disabled={isCurrent}
                    className={`w-full py-3 px-4 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-default disabled:hover:scale-100 ${
                      isCurrent
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-none'
                        : plan.ctaVariant === 'purple'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/25'
                        : plan.ctaVariant === 'green'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                    }`}
                  >
                    <span>{isCurrent ? 'Current Plan' : plan.ctaText}</span>
                    {!isCurrent && <ArrowRight size={14} />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── Feature Comparison Matrix Table ────────────────────────── */}
          <div className="space-y-6 pt-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Compare Full Block & Feature Matrix
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comprehensive breakdown of block availability across subscription tiers.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  {/* Table Sticky Header */}
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
                    <tr>
                      <th className="p-4 font-black text-slate-900 dark:text-white text-sm min-w-[280px]">
                        Features & Blocks
                      </th>
                      <th className="p-4 text-center font-extrabold text-slate-700 dark:text-slate-300 min-w-[120px]">
                        Free ($0)
                      </th>
                      <th className="p-4 text-center font-black text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30 min-w-[150px]">
                        Professional ($29)
                      </th>
                      <th className="p-4 text-center font-extrabold text-emerald-600 dark:text-emerald-400 min-w-[130px]">
                        Custom / Enterprise
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {featureSections.map((section) => (
                      <React.Fragment key={section.title}>
                        {/* Section Header */}
                        <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                          <td
                            colSpan={4}
                            className="py-2.5 px-4 font-black uppercase text-[11px] tracking-wider text-purple-700 dark:text-purple-300 border-t border-slate-200 dark:border-slate-800"
                          >
                            {section.title}
                          </td>
                        </tr>

                        {/* Section Rows */}
                        {section.rows.map((row) => (
                          <tr
                            key={row.name}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="p-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                              {row.name}
                            </td>

                            {/* Free */}
                            <td className="p-3.5 text-center">
                              {row.free ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                                  <Check size={14} className="stroke-[3]" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-400 dark:text-rose-500">
                                  <X size={13} className="stroke-[2.5]" />
                                </span>
                              )}
                            </td>

                            {/* Pro */}
                            <td className="p-3.5 text-center bg-purple-50/30 dark:bg-purple-950/20">
                              {row.pro ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 shadow-2xs">
                                  <Check size={14} className="stroke-[3]" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-400 dark:text-rose-500">
                                  <X size={13} className="stroke-[2.5]" />
                                </span>
                              )}
                            </td>

                            {/* Enterprise */}
                            <td className="p-3.5 text-center">
                              {row.enterprise ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                                  <Check size={14} className="stroke-[3]" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-400 dark:text-rose-500">
                                  <X size={13} className="stroke-[2.5]" />
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck size={15} className="text-emerald-500" />
            <span>Encrypted payment processing · Cancel or change subscription anytime.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default PricingComparisonModal;
