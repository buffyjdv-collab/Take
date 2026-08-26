'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import {
  Loader2,
  IndianRupee,
  Building2,
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react'
import { formatINR, formatRelative } from '@/lib/format'

const PIE_COLORS = ['#EA580C', '#16A34A', '#9333EA', '#0EA5E9', '#F59E0B']
const RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
]
const GROUP_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
] as const
const RECENT_GROUP_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'day', label: 'Day' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
] as const

type GroupBy = (typeof GROUP_OPTIONS)[number]['value']
type RecentGroupBy = (typeof RECENT_GROUP_OPTIONS)[number]['value']

interface TenantRow {
  restaurantId: string
  restaurantName: string
  slug: string
  plan: string
  feeCount: number
  collected: number
  pending: number
  refunded: number
  customerPaid: number
  restaurantPaid: number
}

interface TenantPeriodRow {
  restaurantId: string
  restaurantName: string
  slug: string
  plan: string
  period: string
  feeCount: number
  collected: number
  pending: number
  refunded: number
  customerPaid: number
  restaurantPaid: number
}

interface RecentFee {
  id: string
  feeType: string
  feeAmount: number
  baseAmount: number
  payer: string
  status: string
  collectedAt: string | null
  createdAt: string
  restaurant: { id: string; name: string; slug: string; plan: string }
  order: { id: string; orderNumber: string; grandTotal: number }
}

interface FeesData {
  range: string
  from: string
  to: string
  groupBy: GroupBy
  totalCollected: number
  totalPending: number
  totalRefunded: number
  totalFees: number
  byTenant: TenantRow[]
  byTenantByPeriod: TenantPeriodRow[]
  byFeeType: Array<{ feeType: string; amount: number }>
  byPayer: Array<{ payer: string; amount: number }>
  recentFees: RecentFee[]
}

type SortColumn =
  | 'feeCount'
  | 'collected'
  | 'pending'
  | 'refunded'
  | 'restaurantPaid'
  | 'customerPaid'
type SortDirection = 'asc' | 'desc'

/** Returns the period bucket key for a date based on the grouping mode. */
function getPeriodKey(date: Date, groupBy: GroupBy | RecentGroupBy): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  if (groupBy === 'day') return `${y}-${m}-${d}`
  if (groupBy === 'year') return `${y}`
  return `${y}-${m}` // month
}

/** Human-friendly label for a period bucket key. */
function formatPeriodLabel(period: string, groupBy: GroupBy | RecentGroupBy): string {
  if (groupBy === 'day') {
    const [y, m, d] = period.split('-')
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date)
  }
  if (groupBy === 'year') return period
  // month
  const [y, m] = period.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

async function fetchFees(range: string, groupBy: GroupBy): Promise<FeesData> {
  const res = await fetch(`/api/platform/fees?range=${range}&groupBy=${groupBy}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to load fees')
  const json = await res.json()
  return json.data
}

export function PlatformFeesCollected() {
  const [range, setRange] = useState('30d')
  const [groupBy, setGroupBy] = useState<GroupBy>('month')
  const [recentGroupBy, setRecentGroupBy] = useState<RecentGroupBy>('none')

  // Expand/collapse state for by-tenant table
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<{ column: SortColumn; direction: SortDirection }>({
    column: 'collected',
    direction: 'desc',
  })

  // Expand/collapse state for recent fees buckets
  const [expandedRecent, setExpandedRecent] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['platform-fees', range, groupBy],
    queryFn: () => fetchFees(range, groupBy),
    refetchInterval: 30_000,
  })

  // ----- Sorting + totals for the by-tenant table -----
  const sortedTenants = useMemo<TenantRow[]>(() => {
    if (!data) return []
    const rows = [...data.byTenant]
    const dir = sort.direction === 'asc' ? 1 : -1
    rows.sort((a, b) => {
      const av = a[sort.column]
      const bv = b[sort.column]
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
    return rows
  }, [data, sort])

  const totals = useMemo(() => {
    if (!data) {
      return { feeCount: 0, collected: 0, pending: 0, refunded: 0, restaurantPaid: 0, customerPaid: 0 }
    }
    return data.byTenant.reduce(
      (acc, t) => ({
        feeCount: acc.feeCount + t.feeCount,
        collected: acc.collected + t.collected,
        pending: acc.pending + t.pending,
        refunded: acc.refunded + t.refunded,
        restaurantPaid: acc.restaurantPaid + t.restaurantPaid,
        customerPaid: acc.customerPaid + t.customerPaid,
      }),
      { feeCount: 0, collected: 0, pending: 0, refunded: 0, restaurantPaid: 0, customerPaid: 0 },
    )
  }, [data])

  // ----- Period breakdowns indexed by restaurantId -----
  const periodsByTenant = useMemo<Record<string, TenantPeriodRow[]>>(() => {
    if (!data) return {}
    const out: Record<string, TenantPeriodRow[]> = {}
    for (const p of data.byTenantByPeriod) {
      ;(out[p.restaurantId] ||= []).push(p)
    }
    // Sort each tenant's periods ascending (oldest first)
    for (const k of Object.keys(out)) {
      out[k].sort((a, b) => a.period.localeCompare(b.period))
    }
    return out
  }, [data])

  // ----- Recent fees grouped by period -----
  const recentGroups = useMemo<Array<{ period: string; fees: RecentFee[]; totalAmount: number }>>(() => {
    if (!data || recentGroupBy === 'none') return []
    const map = new Map<string, RecentFee[]>()
    for (const f of data.recentFees) {
      const key = getPeriodKey(new Date(f.createdAt), recentGroupBy)
      const existing = map.get(key)
      if (existing) existing.push(f)
      else map.set(key, [f])
    }
    return Array.from(map.entries())
      .map(([period, fees]) => ({
        period,
        fees,
        totalAmount: fees.reduce((s, f) => s + f.feeAmount, 0),
      }))
      .sort((a, b) => (a.period < b.period ? 1 : a.period > b.period ? -1 : 0)) // newest first
  }, [data, recentGroupBy])

  // ----- Expand / collapse handlers -----
  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function expandAll() {
    if (!data) return
    setExpanded(new Set(data.byTenant.map((t) => t.restaurantId)))
  }
  function collapseAll() {
    setExpanded(new Set())
  }
  function toggleSort(column: SortColumn) {
    setSort((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { column, direction: 'desc' }
    })
  }
  function toggleRecentExpand(key: string) {
    setExpandedRecent((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
      </div>
    )
  }
  if (!data) return null

  const statusColor: Record<string, string> = {
    COLLECTED: 'bg-emerald-50 text-emerald-700',
    PENDING: 'bg-amber-50 text-amber-700',
    REFUNDED: 'bg-purple-50 text-purple-700',
    WAIVED: 'bg-slate-100 text-slate-700',
  }
  const feeTypeLabel: Record<string, string> = {
    PERCENTAGE: '%',
    FIXED_PER_ORDER: 'Fixed',
    HYBRID: 'Hybrid',
    MONTHLY_SUBSCRIPTION: 'Monthly',
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Fees Collected</h1>
          <p className="text-sm text-muted-foreground">
            Track commission revenue across all tenants
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="mr-2 h-4 w-4" />
              <span className="text-xs text-muted-foreground">Group:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_OPTIONS.map((g) => (
                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total collected" value={formatINR(data.totalCollected)} icon={<IndianRupee className="h-4 w-4" />} tone="green" />
        <KpiCard label="Pending" value={formatINR(data.totalPending)} icon={<IndianRupee className="h-4 w-4" />} tone="orange" />
        <KpiCard label="Refunded" value={formatINR(data.totalRefunded)} icon={<IndianRupee className="h-4 w-4" />} tone="purple" />
        <KpiCard label="Total fees" value={String(data.totalFees)} icon={<TrendingUp className="h-4 w-4" />} tone="blue" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fees by tenant (top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.byTenant.slice(0, 10)}
                  layout="vertical"
                  margin={{ left: 30, right: 30, top: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `₹${v.toFixed(0)}`} />
                  <YAxis
                    type="category"
                    dataKey="restaurantName"
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(v: number) => formatINR(v)}
                  />
                  <Bar dataKey="collected" fill="#EA580C" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By payer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byPayer}
                    dataKey="amount"
                    nameKey="payer"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(e: any) => `${e.payer}`}
                  >
                    {data.byPayer.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(v: number) => formatINR(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Tenant table (collapsible per restaurant, sortable, with total row) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Fees by tenant</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {expanded.size} / {data.byTenant.length} expanded
            </span>
            <Button size="sm" variant="outline" onClick={expandAll} disabled={data.byTenant.length === 0}>
              <ChevronsUpDown className="mr-1 h-3.5 w-3.5" />
              Expand all
            </Button>
            <Button size="sm" variant="outline" onClick={collapseAll} disabled={expanded.size === 0}>
              <ChevronsDownUp className="mr-1 h-3.5 w-3.5" />
              Collapse all
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50 text-left">
                <tr>
                  <th className="w-8 px-2 py-2" />
                  <th className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">Restaurant</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">Plan</th>
                  <SortableTh column="feeCount" sort={sort} onSort={toggleSort} label="Fees" align="right" />
                  <SortableTh column="collected" sort={sort} onSort={toggleSort} label="Collected" align="right" />
                  <SortableTh column="pending" sort={sort} onSort={toggleSort} label="Pending" align="right" />
                  <SortableTh column="refunded" sort={sort} onSort={toggleSort} label="Refunded" align="right" />
                  <SortableTh column="restaurantPaid" sort={sort} onSort={toggleSort} label="Restaurant paid" align="right" />
                  <SortableTh column="customerPaid" sort={sort} onSort={toggleSort} label="Customer paid" align="right" />
                </tr>
              </thead>

              {sortedTenants.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                      No fees collected in this range
                    </td>
                  </tr>
                </tbody>
              ) : (
                sortedTenants.map((t) => {
                  const periods = periodsByTenant[t.restaurantId] || []
                  const isOpen = expanded.has(t.restaurantId)
                  return (
                    <Collapsible key={t.restaurantId} asChild open={isOpen} onOpenChange={(o) => o ? toggleExpand(t.restaurantId) : toggleExpand(t.restaurantId)}>
                      <tbody className="group">
                        <CollapsibleTrigger asChild>
                          <tr className="cursor-pointer border-b last:border-0 hover:bg-slate-50">
                            <td className="px-2 py-2 text-center">
                              {periods.length > 0 ? (
                                isOpen ? (
                                  <ChevronDown className="mx-auto h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="mx-auto h-4 w-4 text-muted-foreground" />
                                )
                              ) : null}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{t.restaurantName}</p>
                                  <p className="text-[10px] text-muted-foreground">/{t.slug}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2"><Badge variant="outline">{t.plan}</Badge></td>
                            <td className="px-4 py-2 text-right">{t.feeCount}</td>
                            <td className="px-4 py-2 text-right font-bold text-emerald-700">{formatINR(t.collected)}</td>
                            <td className="px-4 py-2 text-right text-amber-600">{t.pending > 0 ? formatINR(t.pending) : '—'}</td>
                            <td className="px-4 py-2 text-right text-purple-700">{t.refunded > 0 ? formatINR(t.refunded) : '—'}</td>
                            <td className="px-4 py-2 text-right">{formatINR(t.restaurantPaid)}</td>
                            <td className="px-4 py-2 text-right">{formatINR(t.customerPaid)}</td>
                          </tr>
                        </CollapsibleTrigger>

                        {periods.length > 0 && periods.map((p) => (
                          <CollapsibleContent asChild key={`${t.restaurantId}-${p.period}`}>
                            <tr className="border-b bg-slate-50/60 last:border-0">
                              <td className="px-2 py-2" />
                              <td className="px-4 py-2" colSpan={2}>
                                <span className="ml-6 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {formatPeriodLabel(p.period, groupBy)}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right text-xs">{p.feeCount}</td>
                              <td className="px-4 py-2 text-right text-xs font-semibold text-emerald-700">{formatINR(p.collected)}</td>
                              <td className="px-4 py-2 text-right text-xs text-amber-600">{p.pending > 0 ? formatINR(p.pending) : '—'}</td>
                              <td className="px-4 py-2 text-right text-xs text-purple-700">{p.refunded > 0 ? formatINR(p.refunded) : '—'}</td>
                              <td className="px-4 py-2 text-right text-xs">{formatINR(p.restaurantPaid)}</td>
                              <td className="px-4 py-2 text-right text-xs">{formatINR(p.customerPaid)}</td>
                            </tr>
                          </CollapsibleContent>
                        ))}
                      </tbody>
                    </Collapsible>
                  )
                })
              )}

              {/* Total row */}
              {data.byTenant.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                    <td className="px-2 py-2" />
                    <td className="px-4 py-2" colSpan={2}>
                      <span className="text-sm uppercase tracking-wide text-slate-700">Total ({data.byTenant.length} restaurants)</span>
                    </td>
                    <td className="px-4 py-2 text-right">{totals.feeCount}</td>
                    <td className="px-4 py-2 text-right text-emerald-700">{formatINR(totals.collected)}</td>
                    <td className="px-4 py-2 text-right text-amber-600">{totals.pending > 0 ? formatINR(totals.pending) : '—'}</td>
                    <td className="px-4 py-2 text-right text-purple-700">{totals.refunded > 0 ? formatINR(totals.refunded) : '—'}</td>
                    <td className="px-4 py-2 text-right">{formatINR(totals.restaurantPaid)}</td>
                    <td className="px-4 py-2 text-right">{formatINR(totals.customerPaid)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent fees */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent fee transactions</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Group by:</span>
            <div className="flex rounded-md border bg-slate-50 p-0.5">
              {RECENT_GROUP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRecentGroupBy(opt.value)}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    recentGroupBy === opt.value
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50 text-left">
                <tr>
                  <th className="w-8 px-2 py-2" />
                  <th className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">Order</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">Restaurant</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">Type</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Base</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Fee</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">Payer</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">When</th>
                </tr>
              </thead>

              {data.recentFees.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                      No recent fees
                    </td>
                  </tr>
                </tbody>
              ) : recentGroupBy === 'none' ? (
                <tbody>
                  {data.recentFees.map((f) => (
                    <RecentFeeRow key={f.id} f={f} statusColor={statusColor} feeTypeLabel={feeTypeLabel} />
                  ))}
                </tbody>
              ) : (
                recentGroups.map((g) => {
                  const bucketKey = `${recentGroupBy}:${g.period}`
                  const isOpen = expandedRecent.has(bucketKey)
                  return (
                    <Collapsible
                      key={bucketKey}
                      asChild
                      open={isOpen}
                      onOpenChange={(o) => o ? toggleRecentExpand(bucketKey) : toggleRecentExpand(bucketKey)}
                    >
                      <tbody className="group">
                        <CollapsibleTrigger asChild>
                          <tr className="cursor-pointer border-b bg-slate-50/80 hover:bg-slate-100">
                            <td className="px-2 py-2 text-center">
                              {isOpen ? (
                                <ChevronDown className="mx-auto h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="mx-auto h-4 w-4 text-muted-foreground" />
                              )}
                            </td>
                            <td className="px-4 py-2" colSpan={4}>
                              <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                                <Calendar className="h-3.5 w-3.5 text-orange-600" />
                                {formatPeriodLabel(g.period, recentGroupBy)}
                                <Badge variant="outline" className="ml-1 text-[10px]">{g.fees.length} fees</Badge>
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right font-bold text-emerald-700">{formatINR(g.totalAmount)}</td>
                            <td className="px-4 py-2" colSpan={3} />
                          </tr>
                        </CollapsibleTrigger>

                        {g.fees.map((f) => (
                          <CollapsibleContent asChild key={f.id}>
                            <RecentFeeRowBody f={f} statusColor={statusColor} feeTypeLabel={feeTypeLabel} />
                          </CollapsibleContent>
                        ))}
                      </tbody>
                    </Collapsible>
                  )
                })
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** Sortable column header — shows ▲/▼ on the active sort column. */
function SortableTh({
  column,
  label,
  sort,
  onSort,
  align = 'left',
}: {
  column: SortColumn
  label: string
  sort: { column: SortColumn; direction: SortDirection }
  onSort: (c: SortColumn) => void
  align?: 'left' | 'right'
}) {
  const isActive = sort.column === column
  return (
    <th
      className={`px-4 py-2 text-xs font-semibold uppercase text-muted-foreground ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-foreground ${
          isActive ? 'text-orange-700' : ''
        } ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        {isActive ? (
          sort.direction === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowDown className="h-3 w-3 opacity-0 group-hover:opacity-30" />
        )}
      </button>
    </th>
  )
}

function RecentFeeRow({
  f,
  statusColor,
  feeTypeLabel,
}: {
  f: RecentFee
  statusColor: Record<string, string>
  feeTypeLabel: Record<string, string>
}) {
  return (
    <RecentFeeRowBody f={f} statusColor={statusColor} feeTypeLabel={feeTypeLabel} />
  )
}

function RecentFeeRowBody({
  f,
  statusColor,
  feeTypeLabel,
}: {
  f: RecentFee
  statusColor: Record<string, string>
  feeTypeLabel: Record<string, string>
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-slate-50">
      <td className="px-2 py-2" />
      <td className="px-4 py-2 font-mono text-xs">{f.order.orderNumber}</td>
      <td className="px-4 py-2">{f.restaurant.name}</td>
      <td className="px-4 py-2"><Badge variant="outline">{feeTypeLabel[f.feeType] || f.feeType}</Badge></td>
      <td className="px-4 py-2 text-right">{formatINR(f.baseAmount)}</td>
      <td className="px-4 py-2 text-right font-bold text-emerald-700">{formatINR(f.feeAmount)}</td>
      <td className="px-4 py-2 text-xs">{f.payer}</td>
      <td className="px-4 py-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusColor[f.status] || 'bg-slate-100'}`}>
          {f.status}
        </span>
      </td>
      <td className="px-4 py-2 text-xs text-muted-foreground">{formatRelative(f.collectedAt || f.createdAt)}</td>
    </tr>
  )
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string
  icon: React.ReactNode
  tone: 'orange' | 'green' | 'blue' | 'purple'
}) {
  const toneClass = {
    orange: 'bg-orange-50 text-orange-700',
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-sky-50 text-sky-700',
    purple: 'bg-violet-50 text-violet-700',
  }[tone]
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>{icon}</div>
      </CardContent>
    </Card>
  )
}
