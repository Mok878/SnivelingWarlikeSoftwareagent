import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Goal,
  Leaf,
  PiggyBank,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react';

type Category = 'income' | 'spending' | 'savings';
type Entry = {
  id: string;
  date: string;
  category: Category;
  amount: number;
  note: string;
};
type Store = { entries: Entry[]; goals: Record<string, number> };

const STORAGE_KEY = 'steady-savings-tracker-v1';
const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
const categoryLabels: Record<Category, string> = {
  income: 'Income',
  spending: 'Spending',
  savings: 'Savings',
};
const tips = [
  'Move a small amount on payday first. What is automatic is easier to keep.',
  'Before a small purchase, pause for one breath and ask if it supports this month’s goal.',
  'A no-spend afternoon counts. Notice the habit, not just the amount.',
  'Keep a short list of free things you enjoy for the days you feel like spending.',
  'Saving a little repeatedly is more powerful than waiting for a perfect month.',
];

function readStore(): Store {
  if (typeof window === 'undefined') return { entries: [], goals: {} };
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { entries: [], goals: {} };
    const parsed = JSON.parse(stored) as Partial<Store>;
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      goals: parsed.goals && typeof parsed.goals === 'object' ? parsed.goals : {},
    };
  } catch {
    return { entries: [], goals: {} };
  }
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function monthName(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(year, monthNumber - 1, 1),
  );
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(`${value}T12:00:00`),
  );
}

function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const next = new Date(year, monthNumber - 1 + amount, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}

function CategoryIcon({ category }: { category: Category }) {
  if (category === 'income') return <ArrowDownLeft size={17} strokeWidth={2.2} />;
  if (category === 'spending') return <ArrowUpRight size={17} strokeWidth={2.2} />;
  return <PiggyBank size={17} strokeWidth={2.2} />;
}

function App() {
  const [store, setStore] = useState<Store>(() => readStore());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [entryOpen, setEntryOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [tipIndex, setTipIndex] = useState(() => new Date().getDate() % tips.length);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const monthEntries = useMemo(
    () =>
      store.entries
        .filter((entry) => entry.date.startsWith(selectedMonth))
        .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    [store.entries, selectedMonth],
  );
  const totals = useMemo(
    () =>
      monthEntries.reduce(
        (sum, entry) => {
          sum[entry.category] += entry.amount;
          return sum;
        },
        { income: 0, spending: 0, savings: 0 } as Record<Category, number>,
      ),
    [monthEntries],
  );
  const goal = store.goals[selectedMonth] ?? 0;
  const goalProgress = goal > 0 ? Math.min(100, (totals.savings / goal) * 100) : 0;
  const balance = totals.income - totals.spending - totals.savings;
  const hasAnyEntries = store.entries.length > 0;

  function showToast(message: string) {
    setToast(message);
  }

  function addEntry(entry: Omit<Entry, 'id'>) {
    setStore((previous) => ({
      ...previous,
      entries: [{ ...entry, id: `${Date.now()}-${Math.random().toString(16).slice(2)}` }, ...previous.entries],
    }));
    setEntryOpen(false);
    showToast('Entry saved. Keep the rhythm going.');
  }

  function deleteEntry(id: string) {
    const entry = store.entries.find((item) => item.id === id);
    if (!entry) return;
    if (!window.confirm(`Delete this ${categoryLabels[entry.category].toLowerCase()} entry?`)) return;
    setStore((previous) => ({ ...previous, entries: previous.entries.filter((item) => item.id !== id) }));
    showToast('Entry removed.');
  }

  function saveGoal(value: number) {
    setStore((previous) => ({
      ...previous,
      goals: { ...previous.goals, [selectedMonth]: value },
    }));
    setGoalOpen(false);
    showToast(value > 0 ? 'Your goal is set for this month.' : 'Goal cleared for this month.');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar-shell" aria-label="Primary navigation">
        <div className="flex items-center gap-3">
          <div className="brand-mark" aria-hidden="true">S</div>
          <span className="brand-word">steady</span>
        </div>
        <nav className="sidebar-nav mt-14 space-y-2" aria-label="Tracker sections">
          <div className="sidebar-link active flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold" aria-current="page">
            <WalletCards size={18} />
            <span>My progress</span>
          </div>
          <button
            type="button"
            className="sidebar-link flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold"
            onClick={() => setGoalOpen(true)}
            data-testid="button-sidebar-goal"
          >
            <Goal size={18} />
            <span>Monthly goal</span>
          </button>
        </nav>
        <div className="sidebar-footer mt-auto">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <Leaf size={18} className="mb-3 text-[#eadb91]" />
            <p className="text-sm font-semibold leading-snug">Small steps become breathing room.</p>
            <p className="mt-2 text-xs leading-relaxed text-white/55">A private place to notice what is working.</p>
          </div>
          <p className="mt-5 px-1 text-[10px] uppercase tracking-[.18em] text-white/35">Stored on this device</p>
        </div>
      </aside>

      <main className="main-shell">
        <div className="content-wrap">
          <header className="mb-9 flex items-start justify-between gap-4">
            <div className="fade-up">
              <p className="eyebrow mb-3">Your money journal</p>
              <h1 className="display-title">Keep going,<br /><em className="not-italic text-[#507d72]">gently.</em></h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                A clear view of the choices adding up to more room later.
              </p>
            </div>
            <button
              type="button"
              className="button-primary mt-1 flex shrink-0 items-center gap-2"
              onClick={() => setEntryOpen(true)}
              data-testid="button-add-entry-header"
            >
              <Plus size={17} />
              <span className="hidden sm:inline">Add entry</span>
              <span className="sm:hidden">Add</span>
            </button>
          </header>

          <section className="mb-6 flex items-center justify-between gap-3 fade-up fade-up-1" aria-label="Month selector">
            <div className="flex items-center gap-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1">
              <button type="button" className="button-icon" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))} aria-label="Previous month" data-testid="button-previous-month">
                <ChevronLeft size={18} />
              </button>
              <span className="min-w-[138px] text-center text-sm font-bold text-[hsl(var(--foreground))]" data-testid="text-selected-month">{monthName(selectedMonth)}</span>
              <button type="button" className="button-icon" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))} aria-label="Next month" data-testid="button-next-month">
                <ChevronRight size={18} />
              </button>
            </div>
            {selectedMonth !== currentMonth && (
              <button type="button" className="text-xs font-bold text-[#507d72] underline-offset-4 hover:underline" onClick={() => setSelectedMonth(currentMonth)} data-testid="button-return-current-month">
                Back to this month
              </button>
            )}
          </section>

          <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 fade-up fade-up-2" aria-label="Monthly overview">
            <div className="soft-card col-span-2 p-5 md:col-span-1">
              <div className="mb-4 flex items-center justify-between">
                <span className="eyebrow">Saved</span>
                <span className="entry-icon savings"><PiggyBank size={16} /></span>
              </div>
              <p className="stat-number" data-testid="text-total-savings">{money(totals.savings)}</p>
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">toward your future</p>
            </div>
            <div className="soft-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="eyebrow">Spent</span>
                <span className="entry-icon spending"><ArrowUpRight size={16} /></span>
              </div>
              <p className="stat-number" data-testid="text-total-spending">{money(totals.spending)}</p>
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">this month</p>
            </div>
            <div className="soft-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="eyebrow">Balance</span>
                <span className="entry-icon income"><TrendingUp size={16} /></span>
              </div>
              <p className={`stat-number ${balance < 0 ? 'text-[#a85247]' : ''}`} data-testid="text-balance">{money(balance)}</p>
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">after this month’s notes</p>
            </div>
          </section>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(290px,.8fr)]">
            <section className="soft-card overflow-hidden fade-up fade-up-3" aria-labelledby="activity-heading">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-5 sm:px-6">
                <div>
                  <p className="eyebrow mb-1">The little record</p>
                  <h2 id="activity-heading" className="font-serif text-xl font-bold tracking-tight text-[hsl(var(--foreground))]">Recent activity</h2>
                </div>
                <span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-xs font-bold text-[hsl(var(--muted-foreground))]" data-testid="text-entry-count">
                  {monthEntries.length} {monthEntries.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              {monthEntries.length === 0 ? (
                <EmptyActivity firstUse={!hasAnyEntries} onAdd={() => setEntryOpen(true)} />
              ) : (
                <div className="divide-y divide-[hsl(var(--border))]">
                  {monthEntries.map((entry) => (
                    <article className="entry-row flex items-center gap-3 px-5 py-4 sm:px-6" key={entry.id} data-testid={`row-entry-${entry.id}`}>
                      <div className={`entry-icon shrink-0 ${entry.category}`}><CategoryIcon category={entry.category} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[hsl(var(--foreground))]">{entry.note || categoryLabels[entry.category]}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                          <CalendarDays size={12} /> {shortDate(entry.date)} · {categoryLabels[entry.category]}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <p className={`whitespace-nowrap text-sm font-bold ${entry.category === 'spending' ? 'text-[#a85247]' : 'text-[#507d72]'}`}>
                          {entry.category === 'spending' ? '−' : '+'}{money(entry.amount)}
                        </p>
                        <button type="button" className="button-icon opacity-50 hover:text-[#a85247] sm:opacity-0 sm:group-hover:opacity-100" onClick={() => deleteEntry(entry.id)} aria-label={`Delete ${entry.note || 'entry'}`} data-testid={`button-delete-entry-${entry.id}`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <section className="soft-card p-5 sm:p-6" aria-labelledby="goal-heading">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <p className="eyebrow mb-1">A month at a time</p>
                    <h2 id="goal-heading" className="font-serif text-xl font-bold tracking-tight">Savings goal</h2>
                  </div>
                  <button type="button" className="button-icon" onClick={() => setGoalOpen(true)} aria-label="Edit savings goal" data-testid="button-edit-goal">
                    <Settings2 size={17} />
                  </button>
                </div>
                {goal > 0 ? (
                  <div className="flex items-center gap-5">
                    <div className="goal-ring shrink-0" style={{ '--progress': `${goalProgress}%` } as CSSProperties}>
                      <div className="goal-ring-content">
                        <p className="font-serif text-2xl font-bold tracking-tight">{Math.round(goalProgress)}%</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">there</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">You’ve saved</p>
                      <p className="font-serif text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">{money(totals.savings)}</p>
                      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">of {money(goal)} goal</p>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="group w-full rounded-2xl border border-dashed border-[hsl(var(--primary)/.35)] bg-[hsl(var(--secondary)/.5)] p-5 text-left transition hover:bg-[hsl(var(--secondary))]" onClick={() => setGoalOpen(true)} data-testid="button-set-first-goal">
                    <div className="mb-3 flex items-center gap-2 text-[#507d72]"><Goal size={20} /><span className="text-sm font-bold">Choose a goal for {monthName(selectedMonth)}</span></div>
                    <p className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">A number gives the small choices somewhere to go. You can change it anytime.</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#507d72]">Set a monthly goal <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
                  </button>
                )}
                {goal > 0 && (
                  <div className="mt-6">
                    <div className="mb-2 flex justify-between text-xs font-semibold text-[hsl(var(--muted-foreground))]"><span>{money(totals.savings)} saved</span><span>{money(Math.max(0, goal - totals.savings))} to go</span></div>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${goalProgress}%` }} /></div>
                  </div>
                )}
              </section>
              <section className="tip-card rounded-[22px] p-5" aria-label="Savings tip">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold"><Sparkles size={16} /><span>A kind nudge</span></div>
                  <button type="button" className="button-icon" onClick={() => setTipIndex((index) => (index + 1) % tips.length)} aria-label="Show another savings tip" data-testid="button-next-tip"><ChevronRight size={16} /></button>
                </div>
                <p className="text-sm leading-relaxed" data-testid="text-savings-tip">{tips[tipIndex]}</p>
              </section>
            </aside>
          </div>
        </div>
      </main>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <button type="button" className="active flex flex-col items-center justify-center gap-1 text-[10px] font-bold" data-testid="button-mobile-progress"><WalletCards size={18} /><span>Progress</span></button>
        <button type="button" className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold" onClick={() => setEntryOpen(true)} data-testid="button-mobile-add"><CirclePlus size={20} /><span>Add entry</span></button>
        <button type="button" className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold" onClick={() => setGoalOpen(true)} data-testid="button-mobile-goal"><Goal size={18} /><span>Goal</span></button>
      </nav>

      {entryOpen && <EntryModal onClose={() => setEntryOpen(false)} onSave={addEntry} defaultMonth={selectedMonth} />}
      {goalOpen && <GoalModal month={selectedMonth} value={goal} onClose={() => setGoalOpen(false)} onSave={saveGoal} />}
      {toast && <div className="toast-note fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[hsl(var(--sidebar))] px-4 py-3 text-xs font-bold text-white shadow-xl" role="status" data-testid="status-toast"><Check size={15} className="text-[#eadb91]" />{toast}</div>}
    </div>
  );
}

function EmptyActivity({ firstUse, onAdd }: { firstUse: boolean; onAdd: () => void }) {
  return (
    <div className="px-6 py-12 text-center sm:py-16">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[#507d72]">
        {firstUse ? <CirclePlus size={25} /> : <CalendarDays size={24} />}
      </div>
      <h3 className="font-serif text-xl font-bold tracking-tight">{firstUse ? 'Start with one honest note' : 'A quiet month so far'}</h3>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
        {firstUse ? 'Record income, spending, or a little saved. There is no perfect place to begin.' : 'Nothing recorded for this month. Add an entry whenever you are ready.'}
      </p>
      <button type="button" className="button-primary mt-5 inline-flex items-center gap-2" onClick={onAdd} data-testid="button-add-first-entry">
        <Plus size={16} /> Add your first entry
      </button>
    </div>
  );
}

function EntryModal({ onClose, onSave, defaultMonth }: { onClose: () => void; onSave: (entry: Omit<Entry, 'id'>) => void; defaultMonth: string }) {
  const [category, setCategory] = useState<Category>('savings');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => {
    const [year, month] = defaultMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const day = Math.min(new Date().getDate(), lastDay);
    return `${defaultMonth}-${String(day).padStart(2, '0')}`;
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !date) return;
    onSave({ category, amount: Math.round(numericAmount * 100) / 100, note: note.trim(), date });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="entry-modal-title">
        <div className="flex items-start justify-between border-b border-[hsl(var(--border))] p-5 sm:p-6">
          <div><p className="eyebrow mb-1">A moment worth noticing</p><h2 id="entry-modal-title" className="font-serif text-2xl font-bold tracking-tight">Add an entry</h2></div>
          <button type="button" className="button-icon" onClick={onClose} aria-label="Close add entry dialog" data-testid="button-close-entry-modal"><X size={19} /></button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
          <fieldset>
            <legend className="form-label">What kind of entry is this?</legend>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(categoryLabels) as Category[]).map((item) => (
                <button type="button" key={item} className={`rounded-xl border px-2 py-3 text-xs font-bold transition ${category === item ? 'border-[hsl(var(--primary))] bg-[hsl(var(--secondary))] text-[#507d72]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'}`} onClick={() => setCategory(item)} aria-pressed={category === item} data-testid={`button-category-${item}`}>
                  <span className={`mx-auto mb-1.5 entry-icon ${item}`}><CategoryIcon category={item} /></span>{categoryLabels[item]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="form-label">Amount</span><div className="relative"><span className="absolute left-3 top-2.5 text-sm text-[hsl(var(--muted-foreground))]">$</span><input className="form-input pl-7" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} required autoFocus data-testid="input-entry-amount" /></div></label>
            <label><span className="form-label">Date</span><input className="form-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} required data-testid="input-entry-date" /></label>
          </div>
          <label><span className="form-label">A short note <span className="font-normal text-[hsl(var(--muted-foreground))]">(optional)</span></span><input className="form-input" type="text" maxLength={80} placeholder={category === 'savings' ? 'Rainy day fund' : category === 'spending' ? 'Groceries' : 'Payday'} value={note} onChange={(event) => setNote(event.target.value)} data-testid="input-entry-note" /></label>
          <div className="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:justify-end">
            <button type="button" className="button-subtle" onClick={onClose} data-testid="button-cancel-entry">Not now</button>
            <button type="submit" className="button-primary flex items-center justify-center gap-2" data-testid="button-save-entry"><Check size={16} /> Save entry</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GoalModal({ month, value, onClose, onSave }: { month: string; value: number; onClose: () => void; onSave: (value: number) => void }) {
  const [goal, setGoal] = useState(value ? String(value) : '');
  function submit(event: FormEvent) {
    event.preventDefault();
    const numericGoal = goal.trim() ? Number(goal) : 0;
    if (!Number.isFinite(numericGoal) || numericGoal < 0) return;
    onSave(Math.round(numericGoal * 100) / 100);
  }
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title">
        <div className="flex items-start justify-between border-b border-[hsl(var(--border))] p-5 sm:p-6">
          <div><p className="eyebrow mb-1">A number with meaning</p><h2 id="goal-modal-title" className="font-serif text-2xl font-bold tracking-tight">Set a savings goal</h2></div>
          <button type="button" className="button-icon" onClick={onClose} aria-label="Close savings goal dialog" data-testid="button-close-goal-modal"><X size={19} /></button>
        </div>
        <form onSubmit={submit} className="p-5 sm:p-6">
          <p className="mb-5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">How much would you like to put aside in <strong className="text-[hsl(var(--foreground))]">{monthName(month)}</strong>? Keep it kind and realistic.</p>
          <label><span className="form-label">Monthly target</span><div className="relative"><span className="absolute left-3 top-2.5 text-sm text-[hsl(var(--muted-foreground))]">$</span><input className="form-input pl-7" type="number" min="0" step="0.01" inputMode="decimal" placeholder="1,000" value={goal} onChange={(event) => setGoal(event.target.value)} autoFocus data-testid="input-savings-goal" /></div></label>
          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:justify-end">
            {value > 0 && <button type="button" className="mr-auto text-xs font-bold text-[#a85247] hover:underline" onClick={() => onSave(0)} data-testid="button-clear-goal">Clear goal</button>}
            <button type="button" className="button-subtle" onClick={onClose} data-testid="button-cancel-goal">Not now</button>
            <button type="submit" className="button-primary flex items-center justify-center gap-2" data-testid="button-save-goal"><Check size={16} /> Save goal</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;