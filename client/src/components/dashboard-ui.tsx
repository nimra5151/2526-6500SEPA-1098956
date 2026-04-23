import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResponsiveContainer } from 'recharts';
import { Search, Download } from 'lucide-react';

// ─── StaggeredStatGrid ────────────────────────────────────────────────────────
// Wraps stat cards in a staggered reveal animation grid.
// Replaces the raw <div className="grid ..."> + manual motion.div per-card pattern.

interface StaggeredStatGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

const colsMap: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
};

export function StaggeredStatGrid({ children, columns = 4, className = '' }: StaggeredStatGridProps) {
  return (
    <motion.div
      className={`grid ${colsMap[columns]} gap-6 mb-8 ${className}`}
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
    >
      {React.Children.map(children, (child) =>
        child ? (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 16, scale: 0.97 },
              visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
            }}
          >
            {child}
          </motion.div>
        ) : null,
      )}
    </motion.div>
  );
}

// ─── ChartCard ────────────────────────────────────────────────────────────────
// Reusable card wrapper for Recharts charts with consistent styling.

interface ChartCardProps {
  title: string;
  icon?: React.ElementType;
  iconColor?: string;
  height?: number;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const ChartCard = React.memo(function ChartCard({
  title,
  icon: Icon,
  iconColor = 'text-indigo-600 dark:text-indigo-400',
  height = 260,
  children,
  action,
  className = '',
}: ChartCardProps) {
  return (
    <Card className={`border border-border/60 dark:border-slate-800 shadow-sm ${className}`}>
      <CardHeader className="border-b border-border/40 dark:border-slate-800 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
            {title}
          </CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={height}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

// ─── DataTableCard ────────────────────────────────────────────────────────────
// Reusable table container with search, export, and responsive horizontal scroll.

interface DataTableCardProps {
  title: string;
  count?: number;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  onExport?: () => void;
  bulkBar?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const DataTableCard = React.memo(function DataTableCard({
  title,
  count,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  onExport,
  bulkBar,
  children,
  className = '',
}: DataTableCardProps) {
  return (
    <Card className={`border border-border/60 dark:border-slate-800 shadow-sm ${className}`}>
      <CardHeader className="border-b border-border/40 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-foreground">
              {title}{count !== undefined && ` (${count})`}
            </CardTitle>
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            )}
          </div>
          {onSearchChange && (
            <div className="relative md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
                aria-label={searchPlaceholder}
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {bulkBar}
        <div className="overflow-x-auto">{children}</div>
      </CardContent>
    </Card>
  );
});
