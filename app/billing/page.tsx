'use client';

import { useMemo, useState } from 'react';
import {
  Receipt, Plus, TrendingUp, DollarSign, AlertCircle, Eye, CheckCircle2, RotateCcw,
  Trash2, FileText, Wallet, ArrowDownRight, ArrowUpRight, PiggyBank, Calendar,
  Tag, Building2, Percent, X,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, Badge, Button, StatCard, EmptyState, Modal, Field, Input, Select, NumberInput, DateInput, Textarea } from '../components/ui';
import { useDB, type Invoice, type Expense, type InvoiceItem, type Payment, newId } from '../lib/store';
import {
  invoiceTotals, countsAsRevenue, statusForBalance, nextDocNumber, confirmDelete,
  localDateISO, num, numMin, round2, isZeroMoney,
} from '../lib/helpers';
import { useSettings, formatMoney, formatDate, taxRateOf, prefixFor } from '../lib/settings';
import { AISuggestionButton, AISuggestionPanel } from '../components/ai-suggestion';
import { generateBusinessInsight } from '../lib/ai-engine';
import type { AISuggestion } from '../lib/ai-engine';

type Tab = 'invoices' | 'accounting';
type DocFilter = 'all' | 'Invoice' | 'Estimate' | 'Credit Note' | 'Receipt' | 'Refund';

const DOC_TYPES: Invoice['docType'][] = ['Invoice', 'Estimate', 'Receipt', 'Credit Note', 'Refund'];
const ITEM_CATEGORIES: InvoiceItem['category'][] = ['Consultation', 'Surgery', 'Medication', 'Lab', 'Vaccination', 'Grooming', 'Boarding', 'Product', 'Other'];
const PAYMENT_METHODS: Payment['method'][] = ['Cash', 'Card', 'Transfer', 'Insurance', 'Credit', 'Coupon'];
const EXPENSE_CATEGORIES: Expense['category'][] = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Equipment', 'Maintenance', 'Marketing', 'Insurance', 'Professional fees', 'Travel', 'Bank charges', 'Taxes', 'Other'];

/* Line items in the editor carry a client-only key so removing row 2 does not
   make React re-use row 3's inputs (the old `key={index}` bug). */
type DraftItem = InvoiceItem & { rowKey: string };

function blankItem(taxRate = 0): DraftItem {
  return {
    description: '', qty: 1, unitPrice: 0, taxRate, discount: 0, taxable: true,
    category: 'Consultation', reference: '', referenceId: '', cost: 0, notes: '',
    serviceDate: '', practitionerId: '', practitionerName: '', rowKey: newId('li'),
  };
}

const toDraftItems = (items: InvoiceItem[]): DraftItem[] =>
  items.map((it) => ({ ...it, rowKey: newId('li') }));

const stripRowKeys = (items: DraftItem[]): InvoiceItem[] =>
  items.map(({ rowKey, ...rest }) => rest);

function blankExpense(): Expense {
  return {
    id: '', number: '', date: localDateISO(), category: 'Other', description: '', vendor: '',
    vendorId: '', amount: 0, tax: 0, total: 0, paymentMethod: 'Transfer', status: 'Paid',
    recurring: false, recurrencePattern: 'None', receiptNumber: '', notes: '', createdBy: '', createdAt: '',
  };
}

export default function BillingPage() {
  const { db, error, create, update, remove } = useDB();
  const { settings } = useSettings();
  const fmt = (n: number) => formatMoney(n, settings);
  const fmt0 = (n: number) => `${settings.currencySymbol}${Math.round(num(n)).toLocaleString('en-US')}`;
  const fmtDate = (iso: string) => formatDate(iso, settings);
  const [tab, setTab] = useState<Tab>('invoices');
  const [docFilter, setDocFilter] = useState<DocFilter>('all');

  // Invoice modal state
  const [invModal, setInvModal] = useState(false);
  const [detailInvId, setDetailInvId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [invForm, setInvForm] = useState({
    docType: 'Invoice' as Invoice['docType'],
    ownerId: '',
    petId: '',
    date: localDateISO(),
    dueDate: '',
    notes: '',
    terms: 'Payment due within 14 days',
    discount: '0',
    discountType: 'Fixed' as 'Fixed' | 'Percent' | '',
    taxRate: '0',
  });
  const [items, setItems] = useState<DraftItem[]>([]);
  const [invErr, setInvErr] = useState<{ form?: string; owner?: string; items?: string }>({});
  const [payInvId, setPayInvId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'Cash' as Payment['method'], reference: '', notes: '' });
  const [payErr, setPayErr] = useState('');

  // Expense modal state
  const [expModal, setExpModal] = useState(false);
  const [detailExpId, setDetailExpId] = useState<string | null>(null);
  const [expForm, setExpForm] = useState<Expense>(blankExpense());
  const [expErr, setExpErr] = useState<{ form?: string; description?: string; amount?: string }>({});
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);

  const invoices = db?.invoices ?? [];
  const expenses = db?.expenses ?? [];
  const owners = db?.owners ?? [];
  const pets = db?.pets ?? [];

  // Modals read live rows from `db` instead of holding a captured copy, so a
  // second action (e.g. a second payment) can never overwrite the first.
  const detailInv = detailInvId ? invoices.find((i) => i.id === detailInvId) ?? null : null;
  const payInv = payInvId ? invoices.find((i) => i.id === payInvId) ?? null : null;
  const detailExp = detailExpId ? expenses.find((e) => e.id === detailExpId) ?? null : null;

  const ownerName = (id: string) => owners.find((o) => o.id === id)?.name ?? 'Unknown';
  const petName = (id: string) => pets.find((p) => p.id === id)?.name ?? 'Unknown';

  // === Calculations ===
  // All invoice money comes from the shared `invoiceTotals` helper: it handles
  // per-item discounts, the invoice discount, coupons, tax lines and payments,
  // so Billing agrees with Analytics, the dashboard and the owner portal.

  /** Totals for an unsaved draft: no stored total/tax, so tax comes from the item rates. */
  const draftTotals = (draftItems: DraftItem[], discount: string, discountType: Invoice['discountType'], coupon: Invoice['coupon']) =>
    invoiceTotals({
      items: stripRowKeys(draftItems),
      discount: num(discount),
      discountType,
      coupon: coupon ?? [],
      taxes: [],
      amountPaid: 0,
      payments: [],
    } as unknown as Invoice);

  /**
   * Status after a money change. `statusForBalance` keeps Draft/Cancelled/Refunded;
   * 'Sent' and 'Converted' are lifecycle states it does not know about.
   */
  const derivedStatus = (prev: Invoice | undefined, total: number, amountPaid: number): Invoice['status'] => {
    if (!prev) return 'Pending';
    if (prev.status === 'Converted') return 'Converted';
    const next = statusForBalance(prev, total, amountPaid);
    return next === 'Pending' && prev.status === 'Sent' ? 'Sent' : next;
  };

  const docPrefix = (docType: Invoice['docType']) => {
    if (docType === 'Estimate') return prefixFor('estimate', settings);
    if (docType === 'Receipt') return prefixFor('receipt', settings);
    if (docType === 'Credit Note') return 'CN-';
    if (docType === 'Refund') return 'REF-';
    return prefixFor('invoice', settings);
  };
  // Derived from the highest existing suffix, so a number is never reissued
  // after a delete (`db.invoices.length + 1044` did exactly that).
  const nextNumberFor = (docType: Invoice['docType']) =>
    nextDocNumber(docPrefix(docType), db?.invoices ?? [], 1044, 4);

  const filteredInvoices = invoices.filter((i) => docFilter === 'all' || i.docType === docFilter);

  const invoiceStats = useMemo(() => {
    let revenue = 0, collected = 0, outstanding = 0, overdue = 0;
    invoices.forEach((i) => {
      const t = invoiceTotals(i);
      // Estimates, drafts, cancelled documents and credit notes are not revenue.
      if (countsAsRevenue(i)) revenue += t.total;
      collected += t.amountPaid;
      if (t.balance > 0) outstanding += t.balance;
      if (i.status === 'Overdue') overdue += t.balance;
    });
    return { revenue, collected, outstanding, overdue };
  }, [invoices]);

  const expenseStats = useMemo(() => {
    let total = 0, paid = 0, pending = 0;
    expenses.forEach((e) => {
      total += num(e.total);
      if (e.status === 'Paid') paid += num(e.total);
      else pending += num(e.total);
    });
    return { total, paid, pending };
  }, [expenses]);

  const profit = invoiceStats.collected - expenseStats.total;

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + num(e.total)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>();
    invoices.forEach((i) => {
      if (!countsAsRevenue(i)) return;
      const m = i.date?.slice(0, 7);
      if (m) map.set(m, (map.get(m) ?? 0) + invoiceTotals(i).amountPaid);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  }, [invoices]);

  if (!db) return <Shell module="billing" title="Billing"><div className="text-sm text-ink/50">Loading...</div></Shell>;

  // === Invoice actions ===
  const setInv = (k: string, v: string) => setInvForm((f) => ({ ...f, [k]: v }));

  /** The tax-rate field is a bulk control: it stamps the rate onto every line. */
  const setTaxRateForAll = (v: string) => {
    setInvForm((f) => ({ ...f, taxRate: v }));
    setItems((its) => its.map((it) => ({ ...it, taxRate: numMin(v, 0) })));
  };

  const openCreateInvoice = (docType: Invoice['docType'] = 'Invoice') => {
    setEditingId(null);
    setInvErr({});
    const rate = taxRateOf(settings);
    setInvForm({
      docType, ownerId: '', petId: '', date: localDateISO(), dueDate: '',
      notes: '', terms: docType === 'Estimate' ? 'Estimate valid for 30 days' : 'Payment due within 14 days',
      discount: '0', discountType: 'Fixed', taxRate: String(rate),
    });
    setItems([blankItem(rate)]);
    setInvModal(true);
  };

  const openEditInvoice = (inv: Invoice) => {
    setEditingId(inv.id);
    setInvErr({});
    // Read the invoice's real rate instead of resetting every document to 5%.
    const storedRate =
      inv.taxes?.[0]?.rate ?? inv.items?.find((it) => it.taxable)?.taxRate ?? taxRateOf(settings);
    setInvForm({
      docType: inv.docType, ownerId: inv.ownerId, petId: inv.petId,
      date: inv.date, dueDate: inv.dueDate, notes: inv.notes, terms: inv.terms,
      discount: String(num(inv.discount)), discountType: inv.discountType,
      taxRate: String(num(storedRate)),
    });
    setItems(inv.items.length > 0 ? toDraftItems(inv.items) : [blankItem(num(storedRate))]);
    setInvModal(true);
  };

  const updateItem = (rowKey: string, patch: Partial<InvoiceItem>) =>
    setItems((its) => its.map((it) => (it.rowKey === rowKey ? { ...it, ...patch } : it)));
  const addItem = () => setItems((its) => [...its, blankItem(numMin(invForm.taxRate, 0))]);
  const removeItem = (rowKey: string) => setItems((its) => its.filter((it) => it.rowKey !== rowKey));

  const editingInvoice = editingId ? invoices.find((i) => i.id === editingId) : undefined;
  // Per-item tax rates are now part of the total instead of being collected and ignored.
  const previewTotals = draftTotals(items, invForm.discount, invForm.discountType, editingInvoice?.coupon ?? []);

  const saveInvoice = async () => {
    const errs: { form?: string; owner?: string; items?: string } = {};
    if (!invForm.ownerId) errs.owner = 'Select the client this document belongs to.';
    if (items.length === 0 || items.every((it) => !it.description.trim())) {
      errs.items = 'Add at least one line item with a description.';
    }
    if (errs.owner || errs.items) {
      setInvErr({ ...errs, form: 'Please fix the highlighted fields before saving.' });
      return;
    }
    setInvErr({});

    const lineItems = stripRowKeys(items).filter((it) => it.description.trim());
    const t = draftTotals(items.filter((it) => it.description.trim()), invForm.discount, invForm.discountType, editingInvoice?.coupon ?? []);
    const amountPaid = round2(num(editingInvoice?.amountPaid));
    const balance = Math.max(0, round2(t.total - amountPaid));

    const payload: Invoice = {
      id: editingId ?? newId('inv'),
      number: editingInvoice?.number ?? nextNumberFor(invForm.docType),
      docType: invForm.docType,
      ownerId: invForm.ownerId,
      petId: invForm.petId,
      date: invForm.date,
      dueDate: invForm.dueDate,
      items: lineItems,
      subtotal: t.subtotal,
      discount: num(invForm.discount),
      discountType: invForm.discountType,
      coupon: editingInvoice?.coupon ?? [],
      taxes: [{ name: 'VAT', rate: numMin(invForm.taxRate, 0), amount: t.taxTotal }],
      taxTotal: t.taxTotal,
      total: t.total,
      amountPaid,
      balance,
      // Adding a line to a settled invoice must not leave it badged 'Paid'.
      status: derivedStatus(editingInvoice, t.total, amountPaid),
      method: editingInvoice?.method ?? '',
      payments: editingInvoice?.payments ?? [],
      notes: invForm.notes,
      terms: invForm.terms,
      linkedInvoiceId: editingInvoice?.linkedInvoiceId ?? '',
      linkedEstimateId: editingInvoice?.linkedEstimateId ?? '',
      createdBy: editingInvoice?.createdBy ?? '',
      createdAt: editingInvoice?.createdAt ?? localDateISO(),
    };

    try {
      if (editingId) await update('invoices', editingId, payload);
      else await create('invoices', payload);
      setInvModal(false);
      setItems([]);
    } catch {
      setInvErr({ form: 'Could not save this document. Please try again.' });
    }
  };

  const markPaid = (id: string) => {
    const inv = db.invoices.find((i) => i.id === id);
    if (!inv) return;
    const t = invoiceTotals(inv);
    // Only the remaining balance is receipted — not the whole total again.
    const payments = isZeroMoney(t.balance)
      ? inv.payments ?? []
      : [...(inv.payments ?? []), {
          id: newId('pay'), date: localDateISO(), amount: t.balance, method: inv.method || 'Cash',
          reference: '', notes: 'Marked as paid', receivedBy: '',
        }];
    update('invoices', id, {
      status: 'Paid',
      amountPaid: t.total,
      balance: 0,
      method: inv.method || 'Cash',
      payments,
    });
  };

  const convertEstimate = (id: string) => {
    const est = db.invoices.find((i) => i.id === id);
    if (!est) return;
    const t = invoiceTotals(est);
    create('invoices', {
      ...est,
      id: newId('inv'),
      number: nextNumberFor('Invoice'),
      docType: 'Invoice',
      status: 'Sent',
      amountPaid: 0,
      balance: t.total,
      payments: [],
      method: '',
      linkedEstimateId: id,
      createdAt: localDateISO(),
    } as Invoice);
    update('invoices', id, { status: 'Converted' });
  };

  /** Returns true when the delete was confirmed and sent. */
  const deleteInvoice = (inv: Invoice) => {
    if (!confirmDelete(`${inv.docType.toLowerCase()} ${inv.number}`, `${ownerName(inv.ownerId)} · ${fmt(invoiceTotals(inv).total)}`)) {
      return false;
    }
    remove('invoices', inv.id);
    return true;
  };

  const openPayModal = (inv: Invoice) => {
    setPayInvId(inv.id);
    setPayErr('');
    setPayForm({ amount: invoiceTotals(inv).balance.toFixed(2), method: 'Cash', reference: '', notes: '' });
  };

  const recordPayment = async () => {
    if (!payInvId) return;
    // Re-read the live row: the modal's snapshot is stale as soon as the first
    // payment lands, and writing it back used to erase that payment.
    const live = db.invoices.find((i) => i.id === payInvId);
    if (!live) {
      setPayErr('This document no longer exists.');
      return;
    }
    const amt = round2(num(payForm.amount, NaN));
    if (!Number.isFinite(amt) || amt <= 0) {
      setPayErr('Enter a payment amount greater than zero.');
      return;
    }
    setPayErr('');

    const t = invoiceTotals(live);
    const newPaid = round2(t.amountPaid + amt);
    const newBalance = Math.max(0, round2(t.total - newPaid));
    const newPay: Payment = {
      id: newId('pay'), date: localDateISO(), amount: amt,
      method: payForm.method, reference: payForm.reference, notes: payForm.notes, receivedBy: '',
    };
    try {
      await update('invoices', live.id, {
        amountPaid: newPaid,
        balance: newBalance,
        // isZeroMoney, not `=== 0`: a pre-filled toFixed(2) amount used to leave
        // invoices stuck on 'Partial' with a half-cent balance.
        status: derivedStatus(live, t.total, newPaid),
        method: payForm.method,
        payments: [...(live.payments ?? []), newPay],
      });
      setPayInvId(null);
      setPayForm({ amount: '', method: 'Cash', reference: '', notes: '' });
    } catch {
      setPayErr('Could not record this payment. Please try again.');
    }
  };

  // === Expense actions ===
  const setExp = (k: keyof Expense, v: string | number | boolean) =>
    setExpForm((f) => ({ ...f, [k]: v }));

  const openCreateExpense = () => {
    setDetailExpId(null);
    setExpErr({});
    setExpForm({ ...blankExpense(), id: newId('exp'), number: nextDocNumber('EXP-', db.expenses, 1016, 4) });
    setExpModal(true);
  };

  const openEditExpense = (e: Expense) => {
    setDetailExpId(null);
    setExpErr({});
    setExpForm(e);
    setExpModal(true);
  };

  const saveExpense = async () => {
    const errs: { form?: string; description?: string; amount?: string } = {};
    if (!expForm.description.trim()) errs.description = 'Describe what this expense is for.';
    if (numMin(expForm.amount, 0) <= 0) errs.amount = 'Enter an amount greater than zero.';
    if (errs.description || errs.amount) {
      setExpErr({ ...errs, form: 'Please fix the highlighted fields before saving.' });
      return;
    }
    setExpErr({});

    const amount = round2(numMin(expForm.amount, 0));
    const tax = round2(numMin(expForm.tax, 0));
    const payload = { ...expForm, amount, tax, total: round2(amount + tax) };
    try {
      if (db.expenses.find((e) => e.id === expForm.id)) {
        await update('expenses', expForm.id, payload);
      } else {
        await create('expenses', { ...payload, createdAt: localDateISO() });
      }
      setExpModal(false);
    } catch {
      setExpErr({ form: 'Could not save this expense. Please try again.' });
    }
  };

  /** Returns true when the delete was confirmed and sent. */
  const deleteExpense = (e: Expense) => {
    if (!confirmDelete(`expense ${e.number}`, `${e.description || e.category} · ${fmt(num(e.total))}`)) {
      return false;
    }
    remove('expenses', e.id);
    return true;
  };

  // === Render ===
  return (
    <Shell module="billing" title="Billing" subtitle="Invoices, estimates, payments, expenses & accounting">
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/5 px-3 py-2.5 text-xs text-coral">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}
      {/* Tab bar */}
      <div className="flex gap-1 mb-5 bg-canvas rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('invoices')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'invoices' ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink'}`}
        >
          <Receipt className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Invoices & Estimates
        </button>
        <button
          onClick={() => setTab('accounting')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'accounting' ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink'}`}
        >
          <Wallet className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Accounting
        </button>
      </div>

      {tab === 'invoices' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <StatCard icon={TrendingUp} label="Total revenue" value={fmt0(invoiceStats.revenue)} tone="plum" />
            <StatCard icon={DollarSign} label="Collected" value={fmt0(invoiceStats.collected)} sub="Payments received" tone="sky" />
            <StatCard icon={AlertCircle} label="Outstanding" value={fmt0(invoiceStats.outstanding)} sub="Awaiting payment" tone="amber" />
            <StatCard icon={Receipt} label="Overdue" value={fmt0(invoiceStats.overdue)} tone="coral" />
          </div>

          {/* Doc filter + new buttons */}
          <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
            <div className="flex gap-1 bg-canvas rounded-lg p-1">
              {(['all', 'Invoice', 'Estimate', 'Credit Note'] as DocFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setDocFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${docFilter === f ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink'}`}
                >
                  {f === 'all' ? 'All' : f === 'Credit Note' ? 'Credit Notes' : f + 's'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <AISuggestionButton onClick={() => { const rev = db.invoices.filter((i) => countsAsRevenue(i)).reduce((s, i) => s + invoiceTotals(i).amountPaid, 0); const out = db.invoices.reduce((s, i) => s + invoiceTotals(i).balance, 0); const comp = db.appointments.filter(a => a.status === 'Completed').length; setAiSuggestion(generateBusinessInsight(rev, out, db.appointments.length, comp, db.staff.length, db.pets.length)); }} label="AI Insights" />
              <Button variant="outline" onClick={() => openCreateInvoice('Estimate')}><FileText className="w-4 h-4" /> New estimate</Button>
              <Button onClick={() => openCreateInvoice('Invoice')}><Plus className="w-4 h-4" /> New invoice</Button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-ink/60">{filteredInvoices.length} documents</p>
          </div>

          {filteredInvoices.length === 0 ? (
            <Card><EmptyState icon={Receipt} title="No documents yet" hint="Create an invoice or estimate to get started" /></Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-ink/50 uppercase tracking-wide border-b border-line">
                      <th className="px-4 py-3 font-medium">Number</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Pet</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                      <th className="px-4 py-3 font-medium text-right">Paid</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredInvoices.map((i) => {
                      const t = invoiceTotals(i);
                      return (
                        <tr key={i.id} className="hover:bg-canvas/60 group">
                          <td className="px-4 py-3 font-medium text-ink cursor-pointer" onClick={() => setDetailInvId(i.id)}>{i.number}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              i.docType === 'Invoice' ? 'bg-sky-50 text-sky-700' :
                              i.docType === 'Estimate' ? 'bg-violet-50 text-violet-700' :
                              i.docType === 'Credit Note' ? 'bg-amber-50 text-amber-700' :
                              'bg-ink/5 text-ink/60'
                            }`}>{i.docType}</span>
                          </td>
                          <td className="px-4 py-3 text-ink/70">{ownerName(i.ownerId)}</td>
                          <td className="px-4 py-3 text-ink/70">{petName(i.petId)}</td>
                          <td className="px-4 py-3 text-ink/50 text-xs">{fmtDate(i.date)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-ink">{fmt(t.total)}</td>
                          <td className="px-4 py-3 text-right text-ink/60">{fmt(t.amountPaid)}</td>
                          <td className="px-4 py-3"><Badge status={i.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                              <button onClick={() => setDetailInvId(i.id)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="View">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => openEditInvoice(i)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit">
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              {i.docType === 'Estimate' && i.status !== 'Converted' && (
                                <button onClick={() => convertEstimate(i.id)} className="w-7 h-7 rounded-lg hover:bg-lilac text-ink/40 hover:text-plum flex items-center justify-center transition-colors" title="Convert to invoice">
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {(i.status === 'Pending' || i.status === 'Overdue' || i.status === 'Partial' || i.status === 'Sent') && (
                                <button onClick={() => openPayModal(i)} className="w-7 h-7 rounded-lg hover:bg-lilac text-ink/40 hover:text-plum flex items-center justify-center transition-colors" title="Record payment">
                                  <DollarSign className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {(i.status === 'Pending' || i.status === 'Overdue' || i.status === 'Sent') && (
                                <button onClick={() => markPaid(i.id)} className="w-7 h-7 rounded-lg hover:bg-lilac text-ink/40 hover:text-plum flex items-center justify-center transition-colors" title="Mark paid">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={() => deleteInvoice(i)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'accounting' && (
        <>
          {/* P&L stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <StatCard icon={ArrowUpRight} label="Revenue" value={fmt0(invoiceStats.collected)} sub="Collected payments" tone="plum" />
            <StatCard icon={ArrowDownRight} label="Expenses" value={fmt0(expenseStats.total)} sub="Total spend" tone="coral" />
            <StatCard icon={PiggyBank} label="Net profit" value={fmt0(profit)} sub={profit >= 0 ? 'Profit' : 'Loss'} tone={profit >= 0 ? 'sky' : 'coral'} />
            <StatCard icon={AlertCircle} label="Pending bills" value={fmt0(expenseStats.pending)} sub="Unpaid expenses" tone="amber" />
          </div>

          {/* Revenue trend mini chart */}
          {revenueByMonth.length > 1 && (
            <Card className="mb-5">
              <div className="text-sm font-semibold text-ink mb-3">Revenue trend (collected)</div>
              <div className="flex items-end gap-3 h-32">
                {revenueByMonth.map(([m, v]) => {
                  const max = Math.max(...revenueByMonth.map(([, x]) => x), 1);
                  const h = Math.max(4, (v / max) * 100);
                  return (
                    <div key={m} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[10px] text-ink/40">{fmt0(v)}</div>
                      <div className="w-full bg-plum/80 rounded-t-md transition-all" style={{ height: `${h}%` }} />
                      <div className="text-[10px] text-ink/50">{m.slice(5)}/{m.slice(2, 4)}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Expense by category breakdown */}
          {expensesByCategory.length > 0 && (
            <Card className="mb-5">
              <div className="text-sm font-semibold text-ink mb-3">Expenses by category</div>
              <div className="space-y-2">
                {expensesByCategory.map(([cat, amt]) => {
                  const pct = expenseStats.total > 0 ? (amt / expenseStats.total) * 100 : 0;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="w-32 text-xs text-ink/60 flex-shrink-0">{cat}</div>
                      <div className="flex-1 bg-canvas rounded-full h-5 overflow-hidden">
                        <div className="bg-coral/70 h-full rounded-full transition-all flex items-center justify-end pr-2" style={{ width: `${Math.max(pct, 3)}%` }}>
                          {pct > 12 && <span className="text-[9px] text-white font-medium">{pct.toFixed(0)}%</span>}
                        </div>
                      </div>
                      <div className="w-20 text-right text-xs font-medium text-ink">{fmt(amt)}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Expense table */}
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-ink/60">{db.expenses.length} expenses</p>
            <Button onClick={openCreateExpense}><Plus className="w-4 h-4" /> New expense</Button>
          </div>

          {db.expenses.length === 0 ? (
            <Card><EmptyState icon={Wallet} title="No expenses recorded" hint="Add expenses to track your profit & loss" /></Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-ink/50 uppercase tracking-wide border-b border-line">
                      <th className="px-4 py-3 font-medium">Number</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Vendor</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                      <th className="px-4 py-3 font-medium text-right">Tax</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {db.expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-canvas/60 group cursor-pointer" onClick={() => setDetailExpId(e.id)}>
                        <td className="px-4 py-3 font-medium text-ink">{e.number}</td>
                        <td className="px-4 py-3 text-ink/50 text-xs">{fmtDate(e.date)}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-ink/5 text-ink/60">{e.category}</span>
                        </td>
                        <td className="px-4 py-3 text-ink/70">{e.description}</td>
                        <td className="px-4 py-3 text-ink/60">{e.vendor}</td>
                        <td className="px-4 py-3 text-right text-ink/70">{fmt(e.amount)}</td>
                        <td className="px-4 py-3 text-right text-ink/50">{fmt(e.tax)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-ink">{fmt(e.total)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            e.status === 'Paid' ? 'bg-lilac text-plum' :
                            e.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                            'bg-sky-50 text-sky-700'
                          }`}>{e.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end" onClick={(ev) => ev.stopPropagation()}>
                            <button onClick={() => openEditExpense(e)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit">
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteExpense(e)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ===== Invoice create/edit modal ===== */}
      {aiSuggestion && (
        <div className="mb-4">
          <AISuggestionPanel suggestion={aiSuggestion} onDismiss={() => setAiSuggestion(null)} />
        </div>
      )}

      <Modal open={invModal} onClose={() => setInvModal(false)} title={editingId ? 'Edit document' : `New ${invForm.docType.toLowerCase()}`} wide>
        <div className="space-y-4">
          {invErr.form && (
            <div className="flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/5 px-3 py-2.5 text-xs font-medium text-coral">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{invErr.form}</span>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Document type">
              <Select value={invForm.docType} onChange={(e) => setInv('docType', e.target.value)}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Date">
              <DateInput value={invForm.date} onChange={(e) => setInv('date', e.target.value)} />
            </Field>
            <Field label="Due date">
              <DateInput value={invForm.dueDate} onChange={(e) => setInv('dueDate', e.target.value)} min={invForm.date} />
            </Field>
            <Field label="Owner" required error={invErr.owner}>
              <Select value={invForm.ownerId} onChange={(e) => { setInv('ownerId', e.target.value); setInv('petId', ''); setInvErr((p) => ({ ...p, owner: undefined })); }} error={!!invErr.owner}>
                <option value="">Select owner…</option>
                {db.owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Pet">
              <Select value={invForm.petId} onChange={(e) => setInv('petId', e.target.value)}>
                <option value="">Select pet…</option>
                {db.pets.filter((p) => p.ownerId === invForm.ownerId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Tax rate (%)" hint="Applies to every line item; override per line below.">
              <NumberInput value={invForm.taxRate} onChange={(e) => setTaxRateForAll(e.target.value)} min={0} step={0.5} />
            </Field>
            <Field label={`Discount (${invForm.discountType === 'Percent' ? '%' : settings.currencySymbol})`}>
              <div className="flex gap-1">
                <NumberInput value={invForm.discount} onChange={(e) => setInv('discount', e.target.value)} min={0} />
                <Select value={invForm.discountType} onChange={(e) => setInv('discountType', e.target.value)} className="w-20">
                  <option value="Fixed">{settings.currencySymbol}</option>
                  <option value="Percent">%</option>
                </Select>
              </div>
            </Field>
          </div>

          {/* Line items */}
          <div className="border-t border-line pt-3">
            <div className="flex justify-between items-center mb-2">
              <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide">Line items</div>
              <Button variant="outline" onClick={addItem}><Plus className="w-3.5 h-3.5" /> Add item</Button>
            </div>
            {invErr.items && (
              <div className="mb-2 flex items-center gap-1 text-[11px] font-medium text-coral">
                <AlertCircle className="w-3 h-3 shrink-0" /> {invErr.items}
              </div>
            )}
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.rowKey} className="grid grid-cols-12 gap-2 items-start p-2 rounded-lg bg-canvas">
                  <Input className="col-span-4" placeholder="Description" value={it.description} onChange={(e) => { updateItem(it.rowKey, { description: e.target.value }); setInvErr((p) => ({ ...p, items: undefined })); }} />
                  <Select value={it.category} onChange={(e) => updateItem(it.rowKey, { category: e.target.value as InvoiceItem['category'] })} className="col-span-2">
                    {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                  <NumberInput className="col-span-1" placeholder="Qty" value={String(it.qty)} onChange={(e) => updateItem(it.rowKey, { qty: numMin(e.target.value, 1, 1) })} min={1} />
                  <NumberInput className="col-span-2" placeholder="Unit price" value={String(it.unitPrice)} onChange={(e) => updateItem(it.rowKey, { unitPrice: numMin(e.target.value, 0) })} min={0} />
                  <NumberInput className="col-span-1" placeholder="Tax%" value={String(it.taxRate)} onChange={(e) => updateItem(it.rowKey, { taxRate: numMin(e.target.value, 0) })} min={0} />
                  <div className="col-span-1 text-right text-xs font-medium text-ink pt-2">{fmt(round2(num(it.qty) * num(it.unitPrice)))}</div>
                  <div className="col-span-1 flex justify-end pt-1">
                    <button onClick={() => removeItem(it.rowKey)} className="text-ink/40 hover:text-coral" title="Remove line"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals preview */}
            <div className="flex justify-end mt-3">
              <div className="w-56 space-y-1 text-sm">
                <div className="flex justify-between text-ink/60"><span>Subtotal</span><span>{fmt(previewTotals.subtotal)}</span></div>
                {previewTotals.itemDiscount > 0 && <div className="flex justify-between text-ink/60"><span>Line discounts</span><span>-{fmt(previewTotals.itemDiscount)}</span></div>}
                <div className="flex justify-between text-ink/60"><span>Discount</span><span>-{fmt(previewTotals.invoiceDiscount)}</span></div>
                {previewTotals.couponTotal > 0 && <div className="flex justify-between text-ink/60"><span>Coupons</span><span>-{fmt(previewTotals.couponTotal)}</span></div>}
                <div className="flex justify-between text-ink/60"><span>Tax</span><span>{fmt(previewTotals.taxTotal)}</span></div>
                <div className="flex justify-between font-semibold text-ink border-t border-line pt-1"><span>Total</span><span>{fmt(previewTotals.total)}</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Notes">
              <Textarea value={invForm.notes} onChange={(e) => setInv('notes', e.target.value)} placeholder="Internal notes…" />
            </Field>
            <Field label="Terms">
              <Textarea value={invForm.terms} onChange={(e) => setInv('terms', e.target.value)} placeholder="Payment terms…" />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setInvModal(false)}>Cancel</Button>
            <Button onClick={saveInvoice}>{editingId ? 'Save changes' : `Create ${invForm.docType.toLowerCase()}`}</Button>
          </div>
        </div>
      </Modal>

      {/* ===== Invoice detail modal ===== */}
      <Modal open={!!detailInv} onClose={() => setDetailInvId(null)} title="Document details" wide>
        {detailInv && (() => {
          const t = invoiceTotals(detailInv);
          const inv = detailInv;
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-ink">{inv.number}</div>
                  <div className="text-xs text-ink/50 mt-0.5">
                    {inv.docType} · {fmtDate(inv.date)}{inv.dueDate ? ` · Due ${fmtDate(inv.dueDate)}` : ''}
                  </div>
                </div>
                <Badge status={inv.status} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-canvas p-3">
                  <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Client</div>
                  <div className="text-ink font-medium">{ownerName(inv.ownerId)}</div>
                </div>
                <div className="rounded-lg bg-canvas p-3">
                  <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Pet</div>
                  <div className="text-ink font-medium">{petName(inv.petId)}</div>
                </div>
                <div className="rounded-lg bg-canvas p-3">
                  <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Payment method</div>
                  <div className="text-ink font-medium">{inv.method || '—'}</div>
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-line pt-3">
                <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2">Line items</div>
                <div className="space-y-1">
                  {inv.items.map((it, idx) => (
                    <div key={`${inv.id}-line-${idx}-${it.description}`} className="flex items-start justify-between px-3 py-2 rounded-lg bg-canvas text-xs">
                      <div>
                        <div className="text-ink/80 font-medium">{it.description}</div>
                        <div className="text-ink/40 text-[10px] mt-0.5">{it.category} · Qty {num(it.qty)} × {fmt(num(it.unitPrice))}</div>
                      </div>
                      <span className="font-medium text-ink">{fmt(round2(num(it.qty) * num(it.unitPrice)))}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 ml-auto w-56 space-y-1 text-sm">
                  <div className="flex justify-between text-ink/60"><span>Subtotal</span><span>{fmt(t.subtotal)}</span></div>
                  {t.itemDiscount > 0 && <div className="flex justify-between text-ink/60"><span>Line discounts</span><span>-{fmt(t.itemDiscount)}</span></div>}
                  {t.invoiceDiscount > 0 && <div className="flex justify-between text-ink/60"><span>Discount</span><span>-{fmt(t.invoiceDiscount)}</span></div>}
                  {t.couponTotal > 0 && <div className="flex justify-between text-ink/60"><span>Coupons</span><span>-{fmt(t.couponTotal)}</span></div>}
                  <div className="flex justify-between text-ink/60"><span>Tax</span><span>{fmt(t.taxTotal)}</span></div>
                  <div className="flex justify-between font-semibold text-ink border-t border-line pt-1"><span>Total</span><span>{fmt(t.total)}</span></div>
                  <div className="flex justify-between text-plum text-xs"><span>Paid</span><span>{fmt(t.amountPaid)}</span></div>
                  <div className="flex justify-between font-semibold text-coral"><span>Balance</span><span>{fmt(t.balance)}</span></div>
                </div>
              </div>

              {/* Payments history */}
              {inv.payments && inv.payments.length > 0 && (
                <div className="border-t border-line pt-3">
                  <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2">Payment history</div>
                  <div className="space-y-1">
                    {inv.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-canvas text-xs">
                        <div>
                          <span className="text-ink/80 font-medium">{fmt(num(p.amount))}</span>
                          <span className="text-ink/40 ml-2">{p.method}</span>
                          <span className="text-ink/40 ml-2">{fmtDate(p.date)}</span>
                        </div>
                        {p.reference && <span className="text-ink/40 text-[10px]">Ref: {p.reference}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inv.notes && (
                <div className="rounded-lg bg-canvas p-3 text-xs text-ink/60">
                  <span className="font-semibold text-ink/80">Notes: </span>{inv.notes}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" onClick={() => { openEditInvoice(inv); setDetailInvId(null); }}>
                  <FileText className="w-4 h-4" /> Edit
                </Button>
                {inv.docType === 'Estimate' && inv.status !== 'Converted' && (
                  <Button variant="outline" onClick={() => { convertEstimate(inv.id); setDetailInvId(null); }}>
                    <RotateCcw className="w-4 h-4" /> Convert to invoice
                  </Button>
                )}
                {(inv.status === 'Pending' || inv.status === 'Overdue' || inv.status === 'Sent' || inv.status === 'Partial') && (
                  <>
                    <Button variant="outline" onClick={() => openPayModal(inv)}>
                      <DollarSign className="w-4 h-4" /> Record payment
                    </Button>
                    <Button onClick={() => { markPaid(inv.id); setDetailInvId(null); }}>
                      <CheckCircle2 className="w-4 h-4" /> Mark fully paid
                    </Button>
                  </>
                )}
                <Button variant="ghost" onClick={() => { if (deleteInvoice(inv)) setDetailInvId(null); }} className="text-coral">
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ===== Payment modal ===== */}
      <Modal open={!!payInv} onClose={() => { setPayInvId(null); setPayErr(''); }} title="Record payment">
        {payInv && (() => {
          const t = invoiceTotals(payInv);
          return (
            <div className="space-y-3">
              {payErr && (
                <div className="flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/5 px-3 py-2.5 text-xs font-medium text-coral">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                  <span>{payErr}</span>
                </div>
              )}
              <div className="rounded-lg bg-canvas p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink/60">{payInv.number}</span>
                  <span className="font-semibold text-ink">Balance: {fmt(t.balance)}</span>
                </div>
                {t.amountPaid > 0 && (
                  <div className="flex justify-between text-xs text-ink/50 mt-1">
                    <span>Already paid</span>
                    <span>{fmt(t.amountPaid)} of {fmt(t.total)}</span>
                  </div>
                )}
              </div>
              <Field label="Amount" required error={payErr && !payForm.amount ? 'Required' : undefined}>
                <NumberInput value={payForm.amount} onChange={(e) => { setPayForm((f) => ({ ...f, amount: e.target.value })); setPayErr(''); }} min={0} step={0.5} prefix={settings.currencySymbol} />
              </Field>
              <Field label="Payment method">
                <Select value={payForm.method} onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value as Payment['method'] }))}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
              </Field>
              <Field label="Reference">
                <Input placeholder="Transaction ID…" value={payForm.reference} onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))} />
              </Field>
              <Field label="Notes">
                <Textarea value={payForm.notes} onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setPayInvId(null); setPayErr(''); }}>Cancel</Button>
                <Button onClick={recordPayment}>Record payment</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ===== Expense create/edit modal ===== */}
      <Modal open={expModal} onClose={() => setExpModal(false)} title={db.expenses.find((e) => e.id === expForm.id) ? 'Edit expense' : 'New expense'} wide>
        <div className="space-y-4">
          {expErr.form && (
            <div className="flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/5 px-3 py-2.5 text-xs font-medium text-coral">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{expErr.form}</span>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Number">
              <Input value={expForm.number} onChange={(e) => setExp('number', e.target.value)} />
            </Field>
            <Field label="Date">
              <DateInput value={expForm.date} onChange={(e) => setExp('date', e.target.value)} />
            </Field>
            <Field label="Category">
              <Select value={expForm.category} onChange={(e) => setExp('category', e.target.value)}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Description" required error={expErr.description}>
            <Input placeholder="Expense description…" value={expForm.description} onChange={(e) => { setExp('description', e.target.value); setExpErr((p) => ({ ...p, description: undefined })); }} error={!!expErr.description} />
          </Field>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Vendor">
              <Input placeholder="Vendor name…" value={expForm.vendor} onChange={(e) => setExp('vendor', e.target.value)} />
            </Field>
            <Field label="Payment method">
              <Select value={expForm.paymentMethod} onChange={(e) => setExp('paymentMethod', e.target.value)}>
                <option value="">—</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Transfer">Transfer</option>
                <option value="Cheque">Cheque</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={expForm.status} onChange={(e) => setExp('status', e.target.value)}>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Scheduled">Scheduled</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Amount" required error={expErr.amount}>
              <NumberInput value={String(expForm.amount)} onChange={(e) => { setExp('amount', numMin(e.target.value, 0)); setExpErr((p) => ({ ...p, amount: undefined })); }} min={0} prefix={settings.currencySymbol} error={!!expErr.amount} />
            </Field>
            <Field label="Tax">
              <NumberInput value={String(expForm.tax)} onChange={(e) => setExp('tax', numMin(e.target.value, 0))} min={0} prefix={settings.currencySymbol} />
            </Field>
            <Field label="Total (auto)">
              <div className="flex items-center h-10 px-3 rounded-lg bg-canvas text-sm font-medium text-ink">{fmt(round2(numMin(expForm.amount, 0) + numMin(expForm.tax, 0)))}</div>
            </Field>
            <Field label="Receipt #">
              <Input placeholder="Receipt number…" value={expForm.receiptNumber} onChange={(e) => setExp('receiptNumber', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Recurring">
              <Select value={expForm.recurrencePattern} onChange={(e) => { setExp('recurrencePattern', e.target.value); setExp('recurring', e.target.value !== 'None'); }}>
                <option value="None">None</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </Select>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={expForm.notes} onChange={(e) => setExp('notes', e.target.value)} placeholder="Optional notes…" />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setExpModal(false)}>Cancel</Button>
            <Button onClick={saveExpense}>Save expense</Button>
          </div>
        </div>
      </Modal>

      {/* ===== Expense detail modal ===== */}
      <Modal open={!!detailExp} onClose={() => setDetailExpId(null)} title="Expense details">
        {detailExp && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-ink">{detailExp.number}</div>
                <div className="text-xs text-ink/50 mt-0.5">{fmtDate(detailExp.date)}</div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                detailExp.status === 'Paid' ? 'bg-lilac text-plum' :
                detailExp.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                'bg-sky-50 text-sky-700'
              }`}>{detailExp.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-canvas p-3">
                <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Category</div>
                <div className="text-ink font-medium">{detailExp.category}</div>
              </div>
              <div className="rounded-lg bg-canvas p-3">
                <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Vendor</div>
                <div className="text-ink font-medium">{detailExp.vendor || '—'}</div>
              </div>
              <div className="rounded-lg bg-canvas p-3">
                <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Payment method</div>
                <div className="text-ink font-medium">{detailExp.paymentMethod || '—'}</div>
              </div>
              <div className="rounded-lg bg-canvas p-3">
                <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Receipt #</div>
                <div className="text-ink font-medium">{detailExp.receiptNumber || '—'}</div>
              </div>
            </div>
            <div className="rounded-lg bg-canvas p-3">
              <div className="text-ink/80 text-sm font-medium mb-1">{detailExp.description}</div>
              {detailExp.notes && <div className="text-xs text-ink/50">{detailExp.notes}</div>}
              {detailExp.recurring && (
                <div className="text-[10px] text-sky-700 font-semibold mt-1">Recurring: {detailExp.recurrencePattern}</div>
              )}
            </div>
            <div className="ml-auto w-48 space-y-1 text-sm">
              <div className="flex justify-between text-ink/60"><span>Amount</span><span>{fmt(num(detailExp.amount))}</span></div>
              <div className="flex justify-between text-ink/60"><span>Tax</span><span>{fmt(num(detailExp.tax))}</span></div>
              <div className="flex justify-between font-semibold text-ink border-t border-line pt-1"><span>Total</span><span>{fmt(num(detailExp.total))}</span></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openEditExpense(detailExp)}><FileText className="w-4 h-4" /> Edit</Button>
              <Button variant="ghost" onClick={() => { if (deleteExpense(detailExp)) setDetailExpId(null); }} className="text-coral"><Trash2 className="w-4 h-4" /> Delete</Button>
            </div>
          </div>
        )}
      </Modal>
    </Shell>
  );
}
