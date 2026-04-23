import React, { Component, ReactNode } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─── ErrorBoundary ────────────────────────────────────────────────────────────
interface ErrorBoundaryState { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, ErrorBoundaryState> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-6 text-center text-muted-foreground text-sm">
          Something went wrong loading this section. Please refresh the page.
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export const PageHeader = React.memo(function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
});

// ─── StatCard ─────────────────────────────────────────────────────────────────
export const StatCard = React.memo(function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: string;
}) {
  return (
    <Card className="group border border-border/60 dark:border-slate-800 shadow-sm bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ease-out">
      <CardContent className="p-6">
        <div className={`inline-flex items-center justify-center w-10 h-10 mb-4 rounded-xl ${iconBg} group-hover:scale-110 transition-transform duration-200`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="text-2xl font-bold text-foreground mb-0.5 tracking-tight">{value}</div>
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        {trend && <div className="text-xs text-muted-foreground/70 mt-1">{trend}</div>}
      </CardContent>
    </Card>
  );
});

// ─── EmptyState ───────────────────────────────────────────────────────────────
export const EmptyState = React.memo(function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-4">{description}</p>
      )}
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">{action.label}</Button>
          </Link>
        ) : (
          <Button size="sm" onClick={action.onClick} className="bg-indigo-600 hover:bg-indigo-700 text-white">{action.label}</Button>
        )
      )}
    </div>
  );
});

// ─── Skeleton primitives ──────────────────────────────────────────────────────
export function CourseCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="h-48 bg-slate-100 dark:bg-slate-800 skeleton" />
      <CardContent className="p-6 space-y-4">
        <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
        <div className="h-5 w-full bg-slate-100 dark:bg-slate-800 rounded skeleton" />
        <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
            <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
          </div>
        </div>
        <div className="h-9 w-full bg-slate-100 dark:bg-slate-800 rounded skeleton" />
      </CardContent>
    </Card>
  );
}

export function DashboardCardSkeleton() {
  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg skeleton" />
        <div className="h-7 w-20 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
        <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
        <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-slate-100 dark:bg-slate-800 rounded skeleton mb-2" />
      <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800 rounded skeleton mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <DashboardCardSkeleton key={i} />
        ))}
      </div>
      <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-xl skeleton" />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full skeleton" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
            <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded skeleton" /></td>
      <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded skeleton" /></td>
      <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded skeleton" /></td>
      <td className="px-6 py-4"><div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded skeleton" /></td>
    </tr>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-lg skeleton shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
          <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
        </div>
      </div>
      <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
    </div>
  );
}

export function ClassCardListSkeleton() {
  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-5 w-48 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
              <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
            </div>
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded skeleton" />
            <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
          </div>
          <div className="flex gap-2 ml-4">
            <div className="h-8 w-16 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
            <div className="h-8 w-16 bg-slate-100 dark:bg-slate-800 rounded skeleton" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
