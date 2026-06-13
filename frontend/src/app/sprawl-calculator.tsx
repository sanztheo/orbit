"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

const TOOLS = [
  { name: "Notion", cost: 8 },
  { name: "Folk / HubSpot", cost: 24 },
  { name: "Linear", cost: 8 },
  { name: "Slack", cost: 8 },
  { name: "Gmail", cost: 0 },
  { name: "Google Sheets", cost: 0 },
];

export function SprawlCalculator() {
  const [rate, setRate] = useState(150);
  const [minsDay, setMinsDay] = useState(60);

  const hoursMonth = (minsDay * 22) / 60;
  const timeCost = Math.round(hoursMonth * rate);
  const toolSubs = TOOLS.reduce((s, t) => s + t.cost, 0);
  const totalCost = timeCost + toolSubs;
  const orbitCost = 49;
  const savings = totalCost - orbitCost;

  return (
    <section className="border-t border-border px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-2 text-center text-2xl font-bold">
          What is your tool stack actually costing you?
        </h2>
        <p className="mb-10 text-center text-muted-foreground">
          Context-switching between tools is the hidden tax. Adjust the sliders.
        </p>

        <div className="rounded-2xl border border-border bg-muted/30 p-6">
          {/* Sliders */}
          <div className="mb-8 grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                Your hourly rate: <span className="text-primary">${rate}</span>
              </label>
              <input
                type="range"
                min={50}
                max={500}
                step={10}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full accent-foreground"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>$50</span>
                <span>$500</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                Minutes lost per day switching tools:{" "}
                <span className="text-primary">{minsDay} min</span>
              </label>
              <input
                type="range"
                min={15}
                max={120}
                step={5}
                value={minsDay}
                onChange={(e) => setMinsDay(Number(e.target.value))}
                className="w-full accent-foreground"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>15 min</span>
                <span>2 hrs</span>
              </div>
            </div>
          </div>

          {/* Tool breakdown */}
          <div className="mb-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your current stack
            </p>
            <div className="grid gap-1.5 sm:grid-cols-3">
              {TOOLS.map((t) => (
                <div
                  key={t.name}
                  className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2 text-sm"
                >
                  <span>{t.name}</span>
                  <span className="text-muted-foreground">
                    {t.cost > 0 ? `$${t.cost}/mo` : "free"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-xs text-red-700 mb-1 font-medium">
                Time lost ({hoursMonth.toFixed(1)} hrs/mo)
              </p>
              <p className="text-2xl font-bold text-red-700">
                ${timeCost.toLocaleString()}
              </p>
              <p className="text-xs text-red-600 mt-0.5">at ${rate}/hr</p>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center">
              <p className="text-xs text-orange-700 mb-1 font-medium">
                Tool subscriptions
              </p>
              <p className="text-2xl font-bold text-orange-700">
                ${toolSubs}/mo
              </p>
              <p className="text-xs text-orange-600 mt-0.5">6 tools combined</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-xs text-emerald-700 mb-1 font-medium">
                Orbit replaces all of this
              </p>
              <p className="text-2xl font-bold text-emerald-700">$49/mo</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                save ${savings.toLocaleString()}/mo
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/sign-up"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Start saving ${savings.toLocaleString()}/month
            </Link>
            <p className="mt-2 text-xs text-muted-foreground">
              14-day free trial · no credit card
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
