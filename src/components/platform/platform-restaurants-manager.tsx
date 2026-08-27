'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/restaurant/confirm-dialog'
import {
  Building2,
  Search,
  Loader2,
  Plus,
  Pause,
  Play,
  Eye,
  Pencil,
  Trash2,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatINR, formatRelative } from '@/lib/format'
import { PLANS } from '@/lib/plans'

interface Tenant {
  id: string
  slug: string
  name: string
  tagline?: string
  address?: string
  city?: string
  phone: string
  email?: string
  plan: string
  subscriptionStatus: string
  trialEndsAt?: string | null
  suspendedAt?: string | null
  suspendedReason?: string | null
  platformFeeBlocked?: boolean
  platformFeeBlockedAt?: string | null
  platformFeeBlockReason?: string | null
  isOpen: boolean
  createdAt: string
  counts: { tables: number; menuItems: number; users: number; orders: number; branches: number }
  subscription: { status: string; billingCycle: string; amount: number; currentPeriodEnd?: string } | null
}

async function fetchTenants(search = ''): Promise<Tenant[]> {
  const url = `/api/platform/restaurants?search=${encodeURIComponent(search)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load tenants')
  const json = await res.json()
  return json.data
}

export function PlatformRestaurantsManager() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [planFilter, setPlanFilter] = useState<string>('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  const [suspendTarget, setSuspendTarget] = useState<Tenant | null>(null)
  const [detailTarget, setDetailTarget] = useState<Tenant | null>(null)
  const [editTarget, setEditTarget] = useState<Tenant | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null)
  const qc = useQueryClient()

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['platform-tenants', search],
    queryFn: () => fetchTenants(search),
    refetchInterval: 30_000,
  })

  const suspendMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/platform/restaurants/${id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) throw new Error('Failed to suspend')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Tenant suspended')
      qc.invalidateQueries({ queryKey: ['platform-tenants'] })
      qc.invalidateQueries({ queryKey: ['platform-metrics'] })
      setSuspendTarget(null)
    },
    onError: () => toast.error('Failed to suspend tenant'),
  })

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/platform/restaurants/${id}/activate`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to activate')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Tenant reactivated')
      qc.invalidateQueries({ queryKey: ['platform-tenants'] })
      qc.invalidateQueries({ queryKey: ['platform-metrics'] })
    },
    onError: () => toast.error('Failed to activate tenant'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/platform/restaurants/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to delete tenant')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Tenant deleted')
      qc.invalidateQueries({ queryKey: ['platform-tenants'] })
      qc.invalidateQueries({ queryKey: ['platform-metrics'] })
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete tenant'),
  })

  const filtered = (tenants || []).filter((t) => {
    if (statusFilter !== 'ALL' && t.subscriptionStatus !== statusFilter) return false
    if (planFilter !== 'ALL' && t.plan !== planFilter) return false
    return true
  })

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            Manage all restaurants on the platform
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="mr-2 h-4 w-4" />
          New tenant
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, slug, city..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="TRIALING">Trialing</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="PAST_DUE">Past due</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All plans</SelectItem>
            <SelectItem value="TRIAL">Trial</SelectItem>
            <SelectItem value="STARTER">Starter</SelectItem>
            <SelectItem value="PRO">Pro</SelectItem>
            <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No tenants match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {/* Left: identity */}
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">{t.name}</h3>
                        <PlanBadge plan={t.plan} />
                        <StatusBadge status={t.subscriptionStatus} />
                        {t.platformFeeBlocked && (
                          <span
                            className="inline-flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
                            title={
                              t.platformFeeBlockReason
                                ? `QR Blocked: ${t.platformFeeBlockReason}`
                                : 'QR Blocked — customers cannot scan codes'
                            }
                          >
                            <Ban className="h-3 w-3" />
                            QR Blocked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.city || '—'} · /{t.slug} · created {formatRelative(t.createdAt)}
                      </p>
                      {t.suspendedAt && t.suspendedReason && (
                        <p className="mt-1 text-xs text-red-600">
                          <AlertCircle className="mr-1 inline h-3 w-3" />
                          {t.suspendedReason}
                        </p>
                      )}
                      {t.trialEndsAt && t.subscriptionStatus === 'TRIALING' && (
                        <p className="mt-1 text-xs text-amber-700">
                          <Clock className="mr-1 inline h-3 w-3" />
                          Trial ends {formatRelative(t.trialEndsAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: usage & actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <UsagePill label="Tables" value={t.counts.tables} />
                    <UsagePill label="Items" value={t.counts.menuItems} />
                    <UsagePill label="Staff" value={t.counts.users} />
                    <UsagePill label="Orders" value={t.counts.orders} />

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailTarget(t)}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditTarget(t)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteTarget(t)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
                    {t.subscriptionStatus === 'SUSPENDED' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => activateMutation.mutate(t.id)}
                        disabled={activateMutation.isPending}
                      >
                        <Play className="mr-1 h-3.5 w-3.5" />
                        Activate
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => setSuspendTarget(t)}
                      >
                        <Pause className="mr-1 h-3.5 w-3.5" />
                        Suspend
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <CreateTenantDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Suspend dialog */}
      <SuspendDialog
        tenant={suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={(reason) => {
          if (!suspendTarget) return
          suspendMutation.mutate({ id: suspendTarget.id, reason })
        }}
        loading={suspendMutation.isPending}
      />

      {/* Detail dialog */}
      <TenantDetailDialog
        tenant={detailTarget}
        onClose={() => setDetailTarget(null)}
        onEdit={(t) => {
          setDetailTarget(null)
          setEditTarget(t)
        }}
      />

      {/* Edit dialog */}
      {editTarget && (
        <EditTenantDialog
          key={editTarget.id}
          tenant={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={deleteTarget ? `Delete ${deleteTarget.name}?` : ''}
        description={
          deleteTarget ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <p>
                  This will <span className="font-semibold text-red-700">permanently delete</span>{' '}
                  <strong>{deleteTarget.name}</strong> and cascade-delete <span className="font-semibold">all</span> of
                  its data. This action cannot be undone.
                </p>
              </div>
              <ul className="ml-6 list-disc text-xs text-muted-foreground">
                <li>{deleteTarget.counts.orders} orders &amp; all order items / modifiers</li>
                <li>{deleteTarget.counts.menuItems} menu items, categories &amp; modifier groups</li>
                <li>{deleteTarget.counts.tables} tables &amp; QR codes</li>
                <li>{deleteTarget.counts.users} staff / user accounts</li>
                <li>{deleteTarget.counts.branches} branches</li>
                <li>Payments, invoices, customers, service requests, settings, audit logs</li>
              </ul>
            </div>
          ) : undefined
        }
        confirmLabel="Delete tenant"
        variant="destructive"
        onConfirm={() => {
          if (!deleteTarget) return
          deleteMutation.mutate(deleteTarget.id)
        }}
      />
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const tone =
    plan === 'TRIAL'
      ? 'bg-slate-100 text-slate-700'
      : plan === 'STARTER'
      ? 'bg-amber-100 text-amber-700'
      : plan === 'PRO'
      ? 'bg-orange-100 text-orange-700'
      : 'bg-emerald-100 text-emerald-700'
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${tone}`}>{plan}</span>
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'ACTIVE'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'TRIALING'
      ? 'bg-amber-50 text-amber-700'
      : status === 'SUSPENDED'
      ? 'bg-red-50 text-red-700'
      : 'bg-slate-100 text-slate-700'
  const icon =
    status === 'ACTIVE' ? <CheckCircle2 className="h-3 w-3" /> :
    status === 'SUSPENDED' ? <AlertCircle className="h-3 w-3" /> :
    <Clock className="h-3 w-3" />
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}>
      {icon}
      {status}
    </span>
  )
}

function UsagePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-center">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="text-xs font-bold">{value}</p>
    </div>
  )
}

function CreateTenantDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    slug: '',
    tagline: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    plan: 'TRIAL',
    billingCycle: 'MONTHLY',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
  })
  const [loading, setLoading] = useState(false)

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/platform/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Failed to create tenant')
      } else {
        toast.success('Tenant created')
        qc.invalidateQueries({ queryKey: ['platform-tenants'] })
        qc.invalidateQueries({ queryKey: ['platform-metrics'] })
        onOpenChange(false)
        setForm({
          name: '', slug: '', tagline: '', address: '', city: '', phone: '', email: '',
          plan: 'TRIAL', billingCycle: 'MONTHLY',
          ownerName: '', ownerEmail: '', ownerPassword: '',
        })
      }
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  // Auto-generate slug from name
  const handleNameChange = (v: string) => {
    update('name', v)
    if (!form.slug || form.slug === form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) {
      const slug = v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      update('slug', slug)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create new tenant</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Restaurant name *</Label>
              <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Spice Garden" />
            </div>
            <div>
              <Label>URL slug *</Label>
              <Input value={form.slug} onChange={(e) => update('slug', e.target.value.toLowerCase())} placeholder="spice-garden" />
            </div>
          </div>
          <div>
            <Label>Tagline</Label>
            <Input value={form.tagline} onChange={(e) => update('tagline', e.target.value)} placeholder="Authentic Indian cuisine" />
          </div>
          <div>
            <Label>Address *</Label>
            <Textarea value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Full address" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => update('city', e.target.value)} />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+91 80 1234 5678" />
            </div>
          </div>
          <div>
            <Label>Restaurant email</Label>
            <Input value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="hello@restaurant.com" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={form.plan} onValueChange={(v) => update('plan', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRIAL">Trial (14 days free)</SelectItem>
                  <SelectItem value="STARTER">Starter (₹1,499/mo)</SelectItem>
                  <SelectItem value="PRO">Professional (₹3,999/mo)</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise (₹9,999/mo)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.billingCycle} onValueChange={(v) => update('billingCycle', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly billing</SelectItem>
                  <SelectItem value="YEARLY">Yearly billing (save ~17%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-orange-700">Owner account</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Owner name *</Label>
                <Input value={form.ownerName} onChange={(e) => update('ownerName', e.target.value)} />
              </div>
              <div>
                <Label>Owner email *</Label>
                <Input value={form.ownerEmail} onChange={(e) => update('ownerEmail', e.target.value)} type="email" />
              </div>
              <div className="sm:col-span-2">
                <Label>Owner password *</Label>
                <Input value={form.ownerPassword} onChange={(e) => update('ownerPassword', e.target.value)} type="password" />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create tenant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SuspendDialog({
  tenant,
  onClose,
  onConfirm,
  loading,
}: {
  tenant: Tenant | null
  onClose: () => void
  onConfirm: (reason: string) => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')
  if (!tenant) return null
  return (
    <Dialog open={!!tenant} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend {tenant.name}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          The tenant will be unable to receive orders, access their dashboard, or use any platform features
          until reactivated. Customers scanning their QR codes will see a &ldquo;restaurant closed&rdquo; screen.
        </p>
        <div className="py-2">
          <Label>Reason (visible to tenant)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Payment failure, policy violation, requested cancellation..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(reason || 'Suspended by platform admin')}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Suspend tenant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TenantDetailDialog({
  tenant,
  onClose,
  onEdit,
}: {
  tenant: Tenant | null
  onClose: () => void
  onEdit: (t: Tenant) => void
}) {
  if (!tenant) return null
  const plan = PLANS[tenant.plan as keyof typeof PLANS]
  return (
    <Dialog open={!!tenant} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tenant.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <PlanBadge plan={tenant.plan} />
            <StatusBadge status={tenant.subscriptionStatus} />
            {tenant.subscription && (
              <span className="text-xs text-muted-foreground">
                {tenant.subscription.billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'} ·
                {' '}{formatINR(tenant.subscription.amount / 100)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Detail label="Slug" value={`/${tenant.slug}`} />
            <Detail label="Phone" value={tenant.phone} />
            <Detail label="Email" value={tenant.email || '—'} />
            <Detail label="City" value={tenant.city || '—'} />
            <Detail label="Tables" value={String(tenant.counts.tables)} />
            <Detail label="Menu items" value={String(tenant.counts.menuItems)} />
            <Detail label="Staff" value={String(tenant.counts.users)} />
            <Detail label="Orders" value={String(tenant.counts.orders)} />
            <Detail label="Branches" value={String(tenant.counts.branches)} />
            <Detail label="Created" value={formatRelative(tenant.createdAt)} />
          </div>
          {plan && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="font-semibold uppercase tracking-wide text-muted-foreground">{plan.name} plan limits</p>
              <p className="mt-1">
                {plan.limits.maxTables ?? '∞'} tables · {plan.limits.maxMenuItems ?? '∞'} items · {plan.limits.maxStaff ?? '∞'} staff · {plan.limits.maxBranches ?? '∞'} branches
              </p>
            </div>
          )}
          {tenant.suspendedReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <p className="font-semibold">Suspension reason</p>
              <p className="mt-1">{tenant.suspendedReason}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => window.open(`/?table=${tenant.slug}`, '_blank')}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View menu
          </Button>
          <Button
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => onEdit(tenant)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

interface EditForm {
  name: string
  tagline: string
  address: string
  city: string
  phone: string
  email: string
  plan: string
  subscriptionStatus: string
  isOpen: boolean
  suspendReason: string
}

function EditTenantDialog({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<EditForm>({
    name: tenant.name || '',
    tagline: tenant.tagline || '',
    address: tenant.address || '',
    city: tenant.city || '',
    phone: tenant.phone || '',
    email: tenant.email || '',
    plan: tenant.plan,
    subscriptionStatus: tenant.subscriptionStatus,
    isOpen: tenant.isOpen,
    suspendReason: tenant.suspendedReason || '',
  })
  const [loading, setLoading] = useState(false)

  const update = (k: keyof EditForm, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        tagline: form.tagline || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        phone: form.phone,
        email: form.email || '',
        plan: form.plan,
        subscriptionStatus: form.subscriptionStatus,
        isOpen: form.isOpen,
      }
      if (form.subscriptionStatus === 'SUSPENDED') {
        payload.suspendReason = form.suspendReason || 'Suspended by platform admin'
      }
      const res = await fetch(`/api/platform/restaurants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Failed to save changes')
      } else {
        toast.success('Tenant updated')
        qc.invalidateQueries({ queryKey: ['platform-tenants'] })
        qc.invalidateQueries({ queryKey: ['platform-metrics'] })
        onClose()
      }
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit tenant</DialogTitle>
          <DialogDescription>
            Update profile, plan, subscription status, and order availability for{' '}
            <span className="font-medium text-foreground">{tenant.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Restaurant name *</Label>
              <Input value={form.name} onChange={(e) => update('name', e.target.value)} />
            </div>
            <div>
              <Label>Tagline</Label>
              <Input value={form.tagline} onChange={(e) => update('tagline', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Textarea value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Full address" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => update('city', e.target.value)} />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => update('email', e.target.value)} type="email" />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Subscription
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Plan</Label>
                <Select value={form.plan} onValueChange={(v) => update('plan', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRIAL">Trial (14 days free)</SelectItem>
                    <SelectItem value="STARTER">Starter (₹1,499/mo)</SelectItem>
                    <SelectItem value="PRO">Professional (₹3,999/mo)</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise (₹9,999/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.subscriptionStatus} onValueChange={(v) => update('subscriptionStatus', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="TRIALING">Trialing</SelectItem>
                    <SelectItem value="PAST_DUE">Past due</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.subscriptionStatus === 'SUSPENDED' && (
              <div className="mt-3">
                <Label>Suspend reason (visible to tenant)</Label>
                <Textarea
                  value={form.suspendReason}
                  onChange={(e) => update('suspendReason', e.target.value)}
                  placeholder="e.g. Payment failure, policy violation, requested cancellation..."
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
            <div>
              <p className="text-sm font-medium">Open for orders</p>
              <p className="text-xs text-muted-foreground">
                When off, customers scanning QR codes will see a &ldquo;closed&rdquo; screen.
              </p>
            </div>
            <Switch
              checked={form.isOpen}
              onCheckedChange={(v) => update('isOpen', v)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
