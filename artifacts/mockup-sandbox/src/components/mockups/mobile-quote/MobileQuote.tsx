import { useState } from "react";
import {
  ChevronLeft,
  Menu,
  User,
  Phone,
  Mail,
  MapPin,
  Ruler,
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
  Layers,
  Send,
  Info,
} from "lucide-react";

const GREEN = "#15803d";

type SectionProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

function Section({ icon, title, subtitle, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-4 active:bg-gray-50"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          {icon}
        </span>
        <span className="flex-1 text-left">
          <span className="block text-[15px] font-semibold text-gray-900">{title}</span>
          {subtitle && <span className="block text-xs text-gray-500">{subtitle}</span>}
        </span>
        {open ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {open && <div className="px-4 pb-4 pt-0">{children}</div>}
    </div>
  );
}

function Field({
  label,
  value,
  icon,
  suffix,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-gray-500">{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 h-12 focus-within:border-emerald-500 focus-within:bg-white">
        {icon && <span className="text-gray-400">{icon}</span>}
        <span className="flex-1 text-[15px] text-gray-900">{value}</span>
        {suffix && <span className="text-sm text-gray-400">{suffix}</span>}
      </span>
    </label>
  );
}

function Pill({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-4 h-10 inline-flex items-center text-sm font-medium border ${
        active
          ? "bg-emerald-600 border-emerald-600 text-white"
          : "bg-white border-gray-200 text-gray-600"
      }`}
    >
      {label}
    </span>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-emerald-50/60 py-2.5">
      <span className="text-[11px] uppercase tracking-wide text-emerald-700/70">{label}</span>
      <span className={`text-sm ${strong ? "font-bold text-emerald-800" : "font-semibold text-gray-800"}`}>
        {value}
      </span>
    </div>
  );
}

export function MobileQuote() {
  const [thickness] = useState(6.0);
  const [showSummary, setShowSummary] = useState(false);

  return (
    <div className="min-h-screen w-full bg-gray-100 font-sans">
      <div className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col bg-gray-100">
        {/* App bar */}
        <header
          className="sticky top-0 z-20 flex items-center gap-2 px-3 py-3 text-white"
          style={{ backgroundColor: GREEN }}
        >
          <button className="flex h-9 w-9 items-center justify-center rounded-lg active:bg-white/10">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <div className="text-[11px] leading-none text-emerald-200">Eco Innovations</div>
            <div className="text-base font-semibold leading-tight">New Estimate</div>
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-lg active:bg-white/10">
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Scroll area */}
        <main className="flex-1 space-y-3 px-3 pb-44 pt-3">
          {/* Estimate name */}
          <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
            <span className="mb-1.5 block text-xs font-medium text-gray-500">Estimate Name</span>
            <div className="text-lg font-semibold text-gray-900">Smith Attic Insulation</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Field label="Engagement Date" value="Oct 27, 2023" />
              <Field label="Completion Date" value="Oct 30, 2023" />
            </div>
          </div>

          {/* Customer */}
          <Section
            icon={<User className="h-5 w-5" />}
            title="Customer"
            subtitle="John Smith"
            defaultOpen={false}
          >
            <div className="space-y-3">
              <Field label="Customer Name" value="John Smith" icon={<User className="h-4 w-4" />} />
              <Field label="Phone" value="(555) 123-4567" icon={<Phone className="h-4 w-4" />} />
              <Field label="Email" value="john@example.com" icon={<Mail className="h-4 w-4" />} />
              <Field
                label="Address"
                value="123 Main St, Austin TX"
                icon={<MapPin className="h-4 w-4" />}
              />
            </div>
          </Section>

          {/* Project area */}
          <Section
            icon={<Ruler className="h-5 w-5" />}
            title="Attic"
            subtitle="500 sq ft · Roof Deck"
          >
            <div className="space-y-3">
              <Field label="Area (Sq Ft)" value="500.00" suffix="ft²" />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Length" value="25.00" suffix="ft" />
                <Field label="Width" value="20.00" suffix="ft" />
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-medium text-gray-500">Area Type</span>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  <Pill label="General Area" />
                  <Pill label="Exterior Walls" />
                  <Pill label="Roof Deck" active />
                  <Pill label="Gable" />
                </div>
              </div>
              <Field label="Roof Pitch" value="6/12" />
            </div>
          </Section>

          {/* Foam application */}
          <Section
            icon={<Layers className="h-5 w-5" />}
            title="Foam Application"
            subtitle="Open Cell · 6.0 in"
          >
            <div className="space-y-3">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-gray-500">Foam Type</span>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                  <span className="flex h-11 items-center justify-center rounded-lg bg-white text-sm font-semibold text-emerald-700 shadow-sm">
                    Open Cell
                  </span>
                  <span className="flex h-11 items-center justify-center rounded-lg text-sm font-medium text-gray-500">
                    Closed Cell
                  </span>
                </div>
              </div>

              {/* Thickness stepper */}
              <div>
                <span className="mb-1.5 block text-xs font-medium text-gray-500">
                  Foam Thickness
                </span>
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-2 h-14">
                  <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-2xl font-semibold text-gray-600 shadow-sm active:bg-gray-100">
                    −
                  </button>
                  <span className="text-xl font-bold text-gray-900">
                    {thickness.toFixed(1)}
                    <span className="ml-1 text-sm font-normal text-gray-400">in</span>
                  </span>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl font-semibold text-white shadow-sm"
                    style={{ backgroundColor: GREEN }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Live output */}
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <Info className="h-3.5 w-3.5" /> Live calculation
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Stat label="R-Val" value="22.2" />
                  <Stat label="Gallons" value="21.4" />
                  <Stat label="Sets" value="0.21" />
                  <Stat label="Total" value="$708" strong />
                </div>
              </div>

              <button className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 py-3 text-sm font-semibold text-emerald-700 active:bg-emerald-50">
                <Plus className="h-4 w-4" /> Add Foam Application
              </button>
            </div>
          </Section>

          {/* Add area */}
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-semibold text-gray-700 shadow-sm border border-gray-100 active:bg-gray-50">
            <Plus className="h-4 w-4" /> Add Another Area
          </button>
        </main>

        {/* Sticky totals bar */}
        <div className="sticky bottom-0 z-20">
          {showSummary && (
            <div className="mx-3 mb-2 rounded-2xl bg-white p-4 shadow-2xl border border-gray-100">
              <div className="space-y-2.5 text-sm">
                <Row label="Sales Price" value="$2,450.00" />
                <Row label="Discount (5.0%)" value="−$122.50" muted />
                <Row label="Customer Charge" value="$2,327.50" strong />
                <Row label="Deposit Due (25%)" value="$581.88" muted />
                <div className="my-1 border-t border-dashed border-gray-200" />
                <Row label="Total Base Cost" value="$1,200.00" muted />
                <Row label="Sales Commission" value="$279.30" muted />
                <Row label="Price / Sq Ft" value="$4.66" muted />
              </div>
            </div>
          )}
          <div className="border-t border-gray-200 bg-white px-4 pb-5 pt-3">
            <button
              onClick={() => setShowSummary((s) => !s)}
              className="mb-3 flex w-full items-center justify-between"
            >
              <div className="text-left">
                <div className="text-[11px] uppercase tracking-wide text-gray-400">
                  Customer Charge
                </div>
                <div className="text-2xl font-bold text-gray-900">$2,327.50</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wide text-gray-400">Profit</div>
                <div className="flex items-center gap-1 text-lg font-bold text-emerald-600">
                  $1,127.50
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    48.4%
                  </span>
                </div>
              </div>
            </button>
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold text-white shadow-sm active:opacity-90"
              style={{ backgroundColor: GREEN }}
            >
              <Send className="h-5 w-5" /> Review &amp; Send Quote
            </button>
            <button className="mt-2 flex w-full items-center justify-center gap-1 text-xs font-medium text-gray-400">
              {showSummary ? (
                <>
                  Hide breakdown <ChevronDown className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Tap totals for full breakdown <ChevronUp className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-gray-500" : "text-gray-700"}>{label}</span>
      <span
        className={
          strong ? "text-base font-bold text-gray-900" : "font-semibold text-gray-800"
        }
      >
        {value}
      </span>
    </div>
  );
}
