"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui";

const fallback = () => <Skeleton className="h-56 w-full" />;
export const RateBarChart = dynamic(() => import("./charts").then((m) => m.RateBarChart), { ssr: false, loading: fallback });
export const TrendLineChart = dynamic(() => import("./charts").then((m) => m.TrendLineChart), { ssr: false, loading: fallback });
export const MinutesBarChart = dynamic(() => import("./charts").then((m) => m.MinutesBarChart), { ssr: false, loading: fallback });
