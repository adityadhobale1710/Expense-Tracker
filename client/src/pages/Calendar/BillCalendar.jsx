import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  ArrowUpDown,
  SlidersHorizontal,
  Printer,
  Download,
  Upload,
  X,
  Settings,
  MoreHorizontal,
  Copy,
  SkipForward,
  CalendarDays,
  Info,
  Check,
  CreditCard,
  Landmark,
  Coins,
  Trash2,
  Edit3,
  FileText,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import { useDialog } from '../../hooks/useDialog';

// ---------------------------------------------------------------------------
// Static data — defined at module scope so they are never recreated on render.
// Previously these lived inside BillCalendar(), meaning every keystroke (which
// triggers a re-render) would produce new array references. React would then
// re-reconcile all child <button> elements in the color/icon pickers, shifting
// DOM order and destabilising focus inside the modal.
// ---------------------------------------------------------------------------
const colorsList = [
  { name: 'Blue',    value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Indigo',  value: '#6366f1' },
  { name: 'Rose',    value: '#f43f5e' },
  { name: 'Amber',   value: '#f59e0b' },
  { name: 'Purple',  value: '#a855f7' },
  { name: 'Cyan',    value: '#06b6d4' },
  { name: 'Orange',  value: '#f97316' },
];

const iconsList = ['💸', '⚡', '📶', '🎬', '🏛️', '🏠', '🚗', '🍔', '🛒', '🏥', '🎒', '👔', '💈', '🔒'];

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// CountUp Component for premium counts animation
function CountUp({ value, prefix = '₹', suffix = '' }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseFloat(value);
    if (isNaN(end)) {
      setDisplayValue(value);
      return;
    }
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    const duration = 600; // ms
    const stepTime = 15; // steps
    const steps = duration / stepTime;
    const increment = (end - start) / steps;
    let stepCount = 0;

    const timer = setInterval(() => {
      stepCount++;
      start += increment;
      if (stepCount >= steps) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <>{prefix}{Math.round(displayValue).toLocaleString('en-IN')}{suffix}</>
  );
}

export default function BillCalendar() {
  const dialog = useDialog();

  // Core Data States
  const [bills, setBills] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigation / Date States
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // Default July 2026 for mock ranges
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 6, 27)); // Focus date

  // Interaction States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null); // Bill for right-drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [dayModalDate, setDayModalDate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterRecurring, setFilterRecurring] = useState('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Sorting State
  const [sortBy, setSortBy] = useState('dueDate_asc');

  // Form Fields State
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formPriority, setFormPriority] = useState('medium');
  const [formRecurring, setFormRecurring] = useState(false);
  const [formFrequency, setFormFrequency] = useState('none');
  const [formReminder, setFormReminder] = useState('none');
  const [formCustomReminderDays, setFormCustomReminderDays] = useState(0);
  const [formPaymentMethod, setFormPaymentMethod] = useState('other');
  const [formNotes, setFormNotes] = useState('');
  const [formColor, setFormColor] = useState('#3b82f6');
  const [formIcon, setFormIcon] = useState('💸');

  // File Upload Reference for Import
  const fileInputRef = useRef(null);

  // colorsList, iconsList, monthNames are defined at module scope above.

  // Fetch Data Function
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Build filter params for server
      const params = {
        sortBy,
        category: filterCategory || undefined,
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        recurring: filterRecurring !== 'all' ? filterRecurring : undefined,
        paymentMethod: filterPaymentMethod || undefined,
        search: searchQuery || undefined,
        month: filterMonth || undefined,
        year: filterYear || undefined,
      };

      const [billsRes, statsRes, subsRes, loansRes, catsRes] = await Promise.all([
        api.get('/bills', { params }),
        api.get('/bills/stats'),
        api.get('/subscriptions').catch(() => ({ data: { data: [] } })),
        api.get('/loans').catch(() => ({ data: { data: [] } })),
        api.get('/categories?type=expense').catch(() => ({ data: { data: [] } })),
      ]);

      setBills(billsRes.data.data || []);
      setStats(statsRes.data.data || null);
      setSubscriptions(subsRes.data.data || []);
      setLoans(loansRes.data.data || []);
      setCategories(catsRes.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load bill calendar statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [
    sortBy,
    filterCategory,
    filterStatus,
    filterPriority,
    filterRecurring,
    filterPaymentMethod,
    searchQuery,
    filterMonth,
    filterYear,
  ]);

  // Handle month switches
  const handleMonthChange = (direction) => {
    const nextDate = new Date(currentDate);
    if (direction === 'prev') {
      nextDate.setMonth(nextDate.getMonth() - 1);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    setCurrentDate(nextDate);
  };

  const jumpToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Custom Month calendar array assembly
  const calendarDays = useMemo(() => {
    const days = [];

    // Prefix days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      days.push({
        date: d,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
      });
    }

    // Suffix days to pad 6 full rows
    const totalCells = 42;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month, firstDayIndex, daysInMonth, prevMonthDays]);

  // Aggregation of custom bills, subscriptions, and loans for calendar cell matching
  const getObligationsForDate = (dateObj) => {
    const dateStr = dateObj.toDateString();
    const dayIndex = dateObj.getDate();
    const monthIndex = dateObj.getMonth();
    const yearIndex = dateObj.getFullYear();
    const dayOfWeek = dateObj.getDay();

    const matchedList = [];

    // Match Bills
    bills.forEach((bill) => {
      const billDate = new Date(bill.dueDate);
      const isSameDate =
        billDate.getDate() === dayIndex &&
        billDate.getMonth() === monthIndex &&
        billDate.getFullYear() === yearIndex;

      if (isSameDate) {
        matchedList.push({
          id: bill._id,
          title: bill.title,
          amount: bill.amount,
          category: bill.category,
          color: bill.color,
          icon: bill.icon,
          status: bill.status,
          priority: bill.priority,
          recurring: bill.recurring,
          type: 'bill',
          original: bill,
        });
      } else if (bill.recurring) {
        // Project future recurring bills
        const isFuture = dateObj >= billDate;
        if (isFuture && bill.frequency === 'daily') {
          matchedList.push({
            id: `${bill._id}-proj-${dateStr}`,
            title: bill.title,
            amount: bill.amount,
            category: bill.category,
            color: bill.color,
            icon: bill.icon,
            status: 'upcoming',
            priority: bill.priority,
            recurring: true,
            type: 'bill-projected',
            original: bill,
          });
        } else if (isFuture && bill.frequency === 'weekly' && billDate.getDay() === dayOfWeek) {
          matchedList.push({
            id: `${bill._id}-proj-${dateStr}`,
            title: bill.title,
            amount: bill.amount,
            category: bill.category,
            color: bill.color,
            icon: bill.icon,
            status: 'upcoming',
            priority: bill.priority,
            recurring: true,
            type: 'bill-projected',
            original: bill,
          });
        } else if (isFuture && bill.frequency === 'monthly' && billDate.getDate() === dayIndex) {
          matchedList.push({
            id: `${bill._id}-proj-${dateStr}`,
            title: bill.title,
            amount: bill.amount,
            category: bill.category,
            color: bill.color,
            icon: bill.icon,
            status: 'upcoming',
            priority: bill.priority,
            recurring: true,
            type: 'bill-projected',
            original: bill,
          });
        } else if (isFuture && bill.frequency === 'yearly' && billDate.getDate() === dayIndex && billDate.getMonth() === monthIndex) {
          matchedList.push({
            id: `${bill._id}-proj-${dateStr}`,
            title: bill.title,
            amount: bill.amount,
            category: bill.category,
            color: bill.color,
            icon: bill.icon,
            status: 'upcoming',
            priority: bill.priority,
            recurring: true,
            type: 'bill-projected',
            original: bill,
          });
        }
      }
    });

    // Match Subscriptions (displayed in calendar)
    subscriptions.forEach((sub) => {
      const subDate = new Date(sub.renewalDate);
      const isRenewalDate = subDate.getDate() === dayIndex;

      // Only display subscriptions in current calendar matching monthly cycles
      if (sub.billingCycle === 'monthly' && isRenewalDate && monthIndex === month && yearIndex === year) {
        matchedList.push({
          id: sub._id,
          title: sub.name,
          amount: sub.cost,
          category: 'Subscription',
          color: '#ef4444',
          icon: '🎬',
          status: 'upcoming',
          priority: 'medium',
          recurring: true,
          type: 'subscription',
          original: sub,
        });
      } else if (subDate.getDate() === dayIndex && subDate.getMonth() === monthIndex && subDate.getFullYear() === yearIndex) {
        matchedList.push({
          id: sub._id,
          title: sub.name,
          amount: sub.cost,
          category: 'Subscription',
          color: '#ef4444',
          icon: '🎬',
          status: 'upcoming',
          priority: 'medium',
          recurring: true,
          type: 'subscription',
          original: sub,
        });
      }
    });

    // Match Loans (EMI dates)
    loans.forEach((loan) => {
      if (loan.nextEmiDate) {
        const loanDate = new Date(loan.nextEmiDate);
        if (loanDate.getDate() === dayIndex && loanDate.getMonth() === monthIndex && loanDate.getFullYear() === yearIndex) {
          matchedList.push({
            id: loan._id,
            title: `${loan.name} EMI`,
            amount: loan.emiAmount,
            category: 'Debt / Loan',
            color: '#3b82f6',
            icon: '🏛️',
            status: 'upcoming',
            priority: 'high',
            recurring: true,
            type: 'loan',
            original: loan,
          });
        }
      }
    });

    return matchedList;
  };

  // Check if today is cell date
  const isTodayDate = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Color mapper for badges
  const getStatusColorClasses = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'due_soon':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'overdue':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'cancelled':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'upcoming':
      default:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    }
  };

  // Open Details Drawer
  const openDetailsDrawer = (billObj) => {
    setSelectedBill(billObj);
    setIsDrawerOpen(true);
    setIsDayModalOpen(false);
  };

  // Reset Add Form fields
  const resetFormFields = () => {
    setFormTitle('');
    setFormAmount('');
    setFormCategory('');
    setFormDueDate('');
    setFormPriority('medium');
    setFormRecurring(false);
    setFormFrequency('none');
    setFormReminder('none');
    setFormCustomReminderDays(0);
    setFormPaymentMethod('other');
    setFormNotes('');
    setFormColor('#3b82f6');
    setFormIcon('💸');
    setIsEditMode(false);
    setEditingBill(null);
  };

  // Trigger Edit Mode
  const startEditBill = (bill) => {
    setEditingBill(bill);
    setFormTitle(bill.title);
    setFormAmount(bill.amount);
    setFormCategory(bill.category);
    setFormDueDate(new Date(bill.dueDate).toISOString().split('T')[0]);
    setFormPriority(bill.priority);
    setFormRecurring(bill.recurring);
    setFormFrequency(bill.frequency);
    setFormReminder(bill.reminder);
    setFormCustomReminderDays(bill.customReminderDays);
    setFormPaymentMethod(bill.paymentMethod);
    setFormNotes(bill.notes || '');
    setFormColor(bill.color || '#3b82f6');
    setFormIcon(bill.icon || '💸');
    setIsEditMode(true);
    setIsAddModalOpen(true);
    setIsDrawerOpen(false);
  };

  // Save Add or Edit Form
  const handleSaveBill = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formTitle || !formAmount || !formCategory || !formDueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const payload = {
      title: formTitle,
      amount: parseFloat(formAmount),
      category: formCategory,
      dueDate: new Date(formDueDate),
      priority: formPriority,
      recurring: formRecurring,
      frequency: formFrequency,
      reminder: formReminder,
      customReminderDays: formCustomReminderDays,
      paymentMethod: formPaymentMethod,
      notes: formNotes,
      color: formColor,
      icon: formIcon,
    };

    setIsSubmitting(true);
    try {
      if (isEditMode && editingBill) {
        await api.put(`/bills/${editingBill._id}`, payload);
        toast.success('Bill updated successfully');
      } else {
        await api.post('/bills', payload);
        toast.success('New bill scheduled successfully');
      }
      setIsAddModalOpen(false);
      resetFormFields();
      fetchAllData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save bill scheduling');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Actions
  const handleMarkPaid = async (billId) => {
    if (isSubmitting) return;
    const isConfirmed = await dialog.showConfirm({
      title: 'Log Payment',
      message: 'Marking this bill as paid will log an expense entry automatically. Proceed?',
      confirmText: 'Confirm Payment',
    });

    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      await api.post(`/bills/${billId}/pay`);
      toast.success('Bill paid! Expense generated successfully.');
      setIsDrawerOpen(false);
      fetchAllData();
    } catch (err) {
      toast.error('Failed to update payment status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipBill = async (billId) => {
    if (isSubmitting) return;
    const isConfirmed = await dialog.showConfirm({
      title: 'Skip Recurring Occurrence',
      message: 'Are you sure you want to skip this cycle? The due date will advance to the next recurring date without registering an expense.',
      confirmText: 'Skip Cycle',
    });

    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      await api.post(`/bills/${billId}/skip`);
      toast.success('Bill occurrence skipped successfully.');
      setIsDrawerOpen(false);
      fetchAllData();
    } catch (err) {
      toast.error('Failed to skip occurrence');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostponeBill = async (billId, days) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.post(`/bills/${billId}/postpone`, { days });
      toast.success(`Bill postponed by ${days} days.`);
      setIsDrawerOpen(false);
      fetchAllData();
    } catch (err) {
      toast.error('Failed to postpone due date');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicateBill = async (billId) => {
    if (isSubmitting) return;
    const today = new Date();
    // Default duplication sets date to next month
    const nextMonthDate = new Date(today.setMonth(today.getMonth() + 1));
    const newDueDate = nextMonthDate.toISOString().split('T')[0];

    const isConfirmed = await dialog.showConfirm({
      title: 'Duplicate Bill',
      message: `Create a copy of this bill scheduled for next month (${nextMonthDate.toLocaleDateString('en-IN')})?`,
      confirmText: 'Duplicate',
    });

    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      await api.post(`/bills/${billId}/duplicate`, { newDueDate });
      toast.success('Bill copied successfully.');
      fetchAllData();
    } catch (err) {
      toast.error('Failed to copy bill schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBill = async (billId) => {
    if (isSubmitting) return;
    const isConfirmed = await dialog.showConfirm({
      title: 'Delete Scheduled Bill',
      message: 'Are you sure you want to delete this bill from the scheduler? This action is permanent.',
      confirmText: 'Delete Schedule',
      variant: 'danger',
    });

    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      await api.delete(`/bills/${billId}`);
      toast.success('Scheduled bill deleted.');
      setIsDrawerOpen(false);
      fetchAllData();
    } catch (err) {
      toast.error('Failed to delete scheduled bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark all due today as paid
  const handleMarkAllPaidToday = async () => {
    if (isSubmitting) return;
    const today = new Date();
    const todayObligations = bills.filter((b) => {
      if (b.status === 'paid' || b.status === 'cancelled') return false;
      const bDate = new Date(b.dueDate);
      return (
        bDate.getDate() === today.getDate() &&
        bDate.getMonth() === today.getMonth() &&
        bDate.getFullYear() === today.getFullYear()
      );
    });

    if (todayObligations.length === 0) {
      toast.error('No pending custom bills scheduled for today!');
      return;
    }

    const isConfirmed = await dialog.showConfirm({
      title: 'Mark All Paid',
      message: `Would you like to mark all ${todayObligations.length} custom bills due today as paid?`,
      confirmText: 'Pay All Today',
    });

    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      await Promise.all(todayObligations.map((b) => api.post(`/bills/${b._id}/pay`)));
      toast.success(`Successfully paid ${todayObligations.length} bills.`);
      fetchAllData();
    } catch (err) {
      toast.error('Some bills failed to update status');
      fetchAllData();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Data to JSON
  const handleExportData = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bills, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `expense_tracker_bills_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success('Bills schedule exported successfully');
    } catch (err) {
      toast.error('Failed to export schedules');
    }
  };

  // Import Data from JSON
  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = async (event) => {
      try {
        const importedList = JSON.parse(event.target.result);
        if (!Array.isArray(importedList)) {
          throw new Error('Imported data must be an array of bills');
        }

        // Send API requests to create them
        let count = 0;
        for (const item of importedList) {
          if (item.title && item.amount && item.category && item.dueDate) {
            await api.post('/bills', {
              title: item.title,
              amount: item.amount,
              category: item.category,
              dueDate: item.dueDate,
              priority: item.priority || 'medium',
              recurring: item.recurring || false,
              frequency: item.frequency || 'none',
              reminder: item.reminder || 'none',
              customReminderDays: item.customReminderDays || 0,
              paymentMethod: item.paymentMethod || 'other',
              notes: item.notes || '',
              color: item.color || '#3b82f6',
              icon: item.icon || '💸',
            });
            count++;
          }
        }

        toast.success(`Successfully imported ${count} bill schedules!`);
        fetchAllData();
      } catch (err) {
        toast.error('Invalid JSON structure or import error');
      }
    };
    fileReader.readAsText(file);
  };

  // Print Calendar Block
  const handlePrintCalendar = () => {
    window.print();
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterRecurring('all');
    setFilterPaymentMethod('');
    setFilterAmountMin('');
    setFilterAmountMax('');
    setFilterMonth('');
    setFilterYear('');
    toast.success('Filters cleared');
  };

  // Dynamic filter processing on frontend for extra precision (e.g. ranges)
  const processedBillsList = useMemo(() => {
    return bills.filter((bill) => {
      // Amount Ranges
      if (filterAmountMin && bill.amount < parseFloat(filterAmountMin)) return false;
      if (filterAmountMax && bill.amount > parseFloat(filterAmountMax)) return false;
      return true;
    });
  }, [bills, filterAmountMin, filterAmountMax]);

  // Smart Timeline Calculations
  const timelineEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = [];
    bills.forEach((bill) => {
      if (bill.status === 'paid' || bill.status === 'cancelled') return;

      const billDate = new Date(bill.dueDate);
      billDate.setHours(0, 0, 0, 0);
      const diffTime = billDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 65 * 60 * 24)); // approx days

      let dateLabel = '';
      if (diffDays === 0) dateLabel = 'Today';
      else if (diffDays === 1) dateLabel = 'Tomorrow';
      else if (diffDays > 1 && diffDays <= 7) dateLabel = `${diffDays} Days`;
      else return; // only keep next 7 days in timeline

      events.push({
        id: bill._id,
        label: dateLabel,
        title: bill.title,
        amount: bill.amount,
        icon: bill.icon,
        color: bill.color,
        original: bill,
      });
    });

    // Include subscriptions and loans in timeline
    subscriptions.forEach((sub) => {
      const subDate = new Date(sub.renewalDate);
      subDate.setHours(0, 0, 0, 0);
      const diffTime = subDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      let dateLabel = '';
      if (diffDays === 0) dateLabel = 'Today';
      else if (diffDays === 1) dateLabel = 'Tomorrow';
      else if (diffDays > 1 && diffDays <= 7) dateLabel = `${diffDays} Days`;
      else return;

      events.push({
        id: sub._id,
        label: dateLabel,
        title: sub.name,
        amount: sub.cost,
        icon: '🎬',
        color: '#ef4444',
        type: 'subscription',
      });
    });

    loans.forEach((loan) => {
      if (!loan.nextEmiDate) return;
      const loanDate = new Date(loan.nextEmiDate);
      loanDate.setHours(0, 0, 0, 0);
      const diffTime = loanDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      let dateLabel = '';
      if (diffDays === 0) dateLabel = 'Today';
      else if (diffDays === 1) dateLabel = 'Tomorrow';
      else if (diffDays > 1 && diffDays <= 7) dateLabel = `${diffDays} Days`;
      else return;

      events.push({
        id: loan._id,
        label: dateLabel,
        title: `${loan.name} EMI`,
        amount: loan.emiAmount,
        icon: '🏛️',
        color: '#3b82f6',
        type: 'loan',
      });
    });

    // Sort by diffTime asc
    return events.sort((a, b) => {
      const order = { Today: 0, Tomorrow: 1 };
      const valA = order[a.label] !== undefined ? order[a.label] : parseInt(a.label) || 10;
      const valB = order[b.label] !== undefined ? order[b.label] : parseInt(b.label) || 10;
      return valA - valB;
    });
  }, [bills, subscriptions, loans]);

  // Click handler for day cells
  const handleDayClick = (cellDate, cellObligations) => {
    setSelectedDate(cellDate);
    if (cellObligations.length > 0) {
      setDayModalDate(cellDate);
      setIsDayModalOpen(true);
    }
  };

  // Sparkline Chart settings
  const formatSparklineData = (data = []) => {
    return data.map((d, index) => ({ id: index, val: d.val }));
  };

  // Memoize modal close handlers so Modal always receives a stable function
  // reference. An inline `() => setIsAddModalOpen(false)` creates a new
  // function object on every render. These memoized versions are a
  // belt-and-suspenders guarantee alongside the Modal.jsx fix.
  const closeAddModal = useCallback(() => setIsAddModalOpen(false), []);
  const closeDayModal = useCallback(() => setIsDayModalOpen(false), []);

  return (
    <div className="space-y-6 pb-12 animate-fade-in calendar-page print:p-0 print:bg-white print:text-black">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="page-title text-3xl font-black text-slate-100 flex items-center gap-2">
            <CalendarIcon className="text-primary-500" size={28} />
            Bills Calendar
          </h1>
          <p className="page-subtitle text-slate-400 text-sm mt-1">
            Track, schedule, and automate utility payments with smart insights
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              resetFormFields();
              setIsAddModalOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={16} /> Add Scheduled Bill
          </button>
        </div>
      </div>

      {loading && !stats ? (
        // Loading Skeleton Layout
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-dark-800/40 border-slate-800" />
          ))}
          <div className="md:col-span-3 card h-96 animate-pulse bg-dark-800/40 border-slate-800" />
          <div className="card h-96 animate-pulse bg-dark-800/40 border-slate-800" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4">
            <motion.div
              whileHover={{ y: -4 }}
              className="card relative overflow-hidden flex flex-col justify-between p-5 bg-gradient-to-br bg-dark-800/80 border-slate-700/50 shadow-lg hover:shadow-primary-500/5"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Upcoming Bills</span>
                <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Clock size={16} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black text-slate-100">
                  <CountUp value={stats?.upcomingAmount || 0} />
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">{stats?.upcomingCount || 0} bills pending payment</p>
              </div>
              <div className="w-full h-8 mt-4 overflow-hidden rounded opacity-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.sparklines?.upcoming ? formatSparklineData(stats.sparklines.upcoming) : []}>
                    <Line type="monotone" dataKey="val" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="card relative overflow-hidden flex flex-col justify-between p-5 bg-gradient-to-br bg-dark-800/80 border-slate-700/50 shadow-lg"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Paid This Month</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black text-slate-100">
                  <CountUp value={stats?.paidAmountThisMonth || 0} />
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">{stats?.paidCountThisMonth || 0} invoices settled</p>
              </div>
              <div className="w-full h-8 mt-4 overflow-hidden rounded opacity-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.sparklines?.paid ? formatSparklineData(stats.sparklines.paid) : []}>
                    <Line type="monotone" dataKey="val" stroke="#34d399" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="card relative overflow-hidden flex flex-col justify-between p-5 bg-gradient-to-br bg-dark-800/80 border-slate-700/50 shadow-lg hover:shadow-rose-500/5"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Overdue Bills</span>
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertCircle size={16} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black text-rose-400">
                  <CountUp value={stats?.overdueAmount || 0} />
                </p>
                <p className="text-[10px] text-rose-400 mt-1 font-semibold">{stats?.overdueCount || 0} accounts needing action</p>
              </div>
              <div className="w-full h-8 mt-4 overflow-hidden rounded opacity-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.sparklines?.overdue ? formatSparklineData(stats.sparklines.overdue) : []}>
                    <Line type="monotone" dataKey="val" stroke="#f43f5e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="card relative overflow-hidden flex flex-col justify-between p-5 bg-gradient-to-br bg-dark-800/80 border-slate-700/50 shadow-lg"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Monthly Obligation</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <CalendarIcon size={16} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black text-slate-100">
                  <CountUp value={stats?.totalDueAmount || 0} />
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">{stats?.billsThisMonthCount || 0} total active items</p>
              </div>
              <div className="w-full h-8 mt-4 overflow-hidden rounded opacity-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.sparklines?.totalDue ? formatSparklineData(stats.sparklines.totalDue) : []}>
                    <Line type="monotone" dataKey="val" stroke="#818cf8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* MAIN LAYOUT */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            {/* LEFT 70% - Custom Month Calendar */}
            <div className="xl:col-span-2 card flex flex-col bg-dark-800/60 backdrop-blur border-slate-700/50 shadow-xl overflow-hidden print:border-none print:shadow-none print:p-0">
              {/* Calendar Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 border-b border-slate-700/40 pb-4 print:hidden">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMonthChange('prev')}
                    className="btn-icon p-2 rounded-xl border border-slate-700/40 text-slate-400 hover:bg-slate-700/20"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <h2 className="text-lg font-black text-slate-100 min-w-[150px] text-center uppercase tracking-wide">
                    {monthNames[month]} {year}
                  </h2>
                  <button
                    onClick={() => handleMonthChange('next')}
                    className="btn-icon p-2 rounded-xl border border-slate-700/40 text-slate-400 hover:bg-slate-700/20"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={jumpToToday}
                    className="btn bg-slate-700/30 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50 px-3 py-1 rounded-xl text-xs"
                  >
                    Today
                  </button>
                </div>

                <div className="flex gap-2">
                  {/* Month Dropdown Selector */}
                  <select
                    value={month}
                    onChange={(e) => {
                      const next = new Date(currentDate);
                      next.setMonth(parseInt(e.target.value));
                      setCurrentDate(next);
                    }}
                    className="input py-1 px-3 bg-dark-900 border-slate-700 text-xs font-semibold rounded-xl"
                  >
                    {monthNames.map((name, index) => (
                      <option key={name} value={index}>
                        {name}
                      </option>
                    ))}
                  </select>

                  {/* Year Dropdown Selector */}
                  <select
                    value={year}
                    onChange={(e) => {
                      const next = new Date(currentDate);
                      next.setFullYear(parseInt(e.target.value));
                      setCurrentDate(next);
                    }}
                    className="input py-1 px-3 bg-dark-900 border-slate-700 text-xs font-semibold rounded-xl"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] font-black text-slate-400 tracking-wider mb-2">
                <div>SUN</div>
                <div>MON</div>
                <div>TUE</div>
                <div>WED</div>
                <div>THU</div>
                <div>FRI</div>
                <div>SAT</div>
              </div>

              {/* Calendar Grid Cells */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 h-[450px] sm:h-[550px] md:h-[650px] print:h-auto">
                {calendarDays.map((cell, idx) => {
                  const cellDate = cell.date;
                  const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
                  const cellObligations = getObligationsForDate(cellDate);
                  const isCurrent = isTodayDate(cellDate);
                  const isFocused =
                    selectedDate && cellDate.toDateString() === selectedDate.toDateString();

                  // Render up to 3 indicator items
                  const maxDisplay = 2;
                  const visible = cellObligations.slice(0, maxDisplay);
                  const extra = cellObligations.length - maxDisplay;

                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: cell.isCurrentMonth ? 1.015 : 1, y: cell.isCurrentMonth ? -1 : 0 }}
                      onClick={() => handleDayClick(cellDate, cellObligations)}
                      className={`p-1.5 sm:p-2 border rounded-2xl flex flex-col justify-between text-left transition-all duration-200 select-none cursor-pointer ${
                        cell.isCurrentMonth
                          ? isFocused
                            ? 'bg-primary-500/10 border-primary-500 ring-2 ring-primary-500/20'
                            : isCurrent
                            ? 'bg-primary-500/10 border-primary-500/50'
                            : isWeekend
                            ? 'bg-slate-900/30 border-slate-800/40 hover:bg-slate-700/10 hover:border-slate-700/50'
                            : 'bg-dark-900/30 border-slate-800/40 hover:bg-slate-700/10 hover:border-slate-700/50'
                          : 'bg-dark-900/5 border-slate-800/10 opacity-20'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        {isCurrent ? (
                          <span className="text-xs font-black text-primary-500 bg-primary-500/15 w-6 h-6 rounded-full flex items-center justify-center">
                            {cellDate.getDate()}
                          </span>
                        ) : (
                          <span className={`text-xs font-semibold ${cell.isCurrentMonth ? 'text-slate-300' : 'text-slate-600'}`}>
                            {cellDate.getDate()}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[8px] font-black text-primary-500 uppercase tracking-widest hidden sm:inline-block">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Day Indicators */}
                      <div className="space-y-1 mt-1 overflow-hidden flex-grow flex flex-col justify-end">
                        {visible.map((ob) => (
                          <div
                            key={ob.id}
                            style={{ borderLeftColor: ob.color }}
                            className="border-l-2 bg-slate-900/80 px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-bold text-slate-300 truncate transition-all hover:bg-slate-900"
                            title={`${ob.title}: ₹${ob.amount}`}
                          >
                            <span className="mr-0.5">{ob.icon}</span>
                            <span className="hidden sm:inline">{ob.title.split(' ')[0]} </span>
                            <span>₹{ob.amount}</span>
                          </div>
                        ))}
                        {extra > 0 && (
                          <div className="text-[8px] font-black text-center py-0.5 rounded bg-slate-700/20 text-slate-400 border border-slate-700/30">
                            +{extra} more
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT SIDEBAR (30%) */}
            <div className="space-y-6 print:hidden">
              {/* Quick Actions Panel */}
              <div className="card bg-dark-800/80 border-slate-700/50 shadow-lg">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      resetFormFields();
                      setIsAddModalOpen(true);
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-primary-600/10 border border-primary-500/20 text-primary-400 hover:bg-primary-600/20 transition-all font-semibold text-xs gap-2 group cursor-pointer"
                  >
                    <Plus size={18} className="group-hover:scale-110 transition-transform" />
                    Add Bill
                  </button>
                  <button
                    onClick={handleMarkAllPaidToday}
                    disabled={isSubmitting}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20 transition-all font-semibold text-xs gap-2 group cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
                    {isSubmitting ? 'Processing...' : 'Pay Today'}
                  </button>
                  <button
                    onClick={handleExportData}
                    className="flex items-center justify-start gap-2.5 p-2 px-3 border border-slate-700/40 hover:bg-slate-700/20 rounded-xl text-slate-300 text-xs font-semibold cursor-pointer w-full col-span-2"
                  >
                    <Download size={14} /> Export Backup File
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-start gap-2.5 p-2 px-3 border border-slate-700/40 hover:bg-slate-700/20 rounded-xl text-slate-300 text-xs font-semibold cursor-pointer w-full col-span-2"
                  >
                    <Upload size={14} /> Import Backup File
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportData}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={handlePrintCalendar}
                    className="flex items-center justify-start gap-2.5 p-2 px-3 border border-slate-700/40 hover:bg-slate-700/20 rounded-xl text-slate-300 text-xs font-semibold cursor-pointer w-full col-span-2"
                  >
                    <Printer size={14} /> Print Calendar
                  </button>
                </div>
              </div>


              {/* Smart Timeline (Upcoming Calendar Timeline) */}
              <div className="card bg-dark-800/80 border-slate-700/50 shadow-lg">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                  Upcoming 7-Day Timeline
                  <span className="text-[9px] font-bold text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </h3>
                {timelineEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No bills due in next 7 days</p>
                ) : (
                  <div className="relative pl-4 border-l border-slate-700/60 space-y-4">
                    {timelineEvents.map((ev, index) => (
                      <div
                        key={`${ev.id}-${index}`}
                        className="relative group cursor-pointer"
                        onClick={() => ev.original && openDetailsDrawer(ev.original)}
                      >
                        <div
                          className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-dark-800 group-hover:scale-125 transition-transform"
                          style={{ backgroundColor: ev.color }}
                        />
                        <div className="p-2.5 bg-dark-900/60 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-all">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-300">{ev.title}</span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">{ev.label}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                            <span>{ev.icon} Utility</span>
                            <span className="font-bold text-slate-200">₹{ev.amount}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Charts Panel */}
              {stats?.categoryChart && stats.categoryChart.length > 0 && (
                <div className="card bg-dark-800/80 border-slate-700/50 shadow-lg">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <PieChartIcon size={14} /> Bills by Category
                  </h3>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.categoryChart}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={55}
                          fill="#8884d8"
                          label={({ name, percent }) => `${name.substring(0, 5)} ${(percent * 100).toFixed(0)}%`}
                        >
                          {stats.categoryChart.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colorsList[index % colorsList.length].value} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', borderRadius: '12px' }}
                          itemStyle={{ color: 'var(--chart-tooltip-text)' }}
                          labelStyle={{ color: 'var(--chart-text)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ADVANCED FILTERING PANEL */}
          <div className="card bg-dark-800/60 border-slate-700/50 shadow-xl overflow-hidden print:hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-3.5 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Search scheduled bills by title or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-10 h-10 w-full"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                  className={`btn font-semibold text-xs gap-1.5 h-10 ${
                    showFiltersPanel ||
                    filterCategory ||
                    filterStatus ||
                    filterPriority ||
                    filterRecurring !== 'all' ||
                    filterPaymentMethod
                      ? 'bg-primary-600/10 text-primary-400 border border-primary-500/20'
                      : 'bg-slate-700/30 text-slate-300 border border-slate-700/40 hover:bg-slate-700/50'
                  }`}
                >
                  <SlidersHorizontal size={14} /> Filter Tools
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input h-10 max-w-44 text-xs font-semibold py-1 pr-6"
                >
                  <option value="dueDate_asc">Due Date (Soonest)</option>
                  <option value="highest_amount">Amount (Highest)</option>
                  <option value="lowest_amount">Amount (Lowest)</option>
                  <option value="recently_added">Recently Scheduled</option>
                  <option value="alphabetical">Alphabetical (A-Z)</option>
                  <option value="status">Payment Status</option>
                  <option value="priority">Priority Tier</option>
                </select>
                <button
                  onClick={handleResetFilters}
                  className="btn bg-slate-800 border border-slate-700/50 hover:bg-slate-700/60 text-slate-400 text-xs px-3 h-10 rounded-xl"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Advanced Filters Expandable Container */}
            <AnimatePresence>
              {showFiltersPanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-700/30 pt-4 mt-2"
                >
                  <div>
                    <label className="label text-[11px] font-bold text-slate-400 uppercase tracking-wide">Category</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="input h-10 py-1"
                    >
                      <option value="">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                      <option value="Electricity">Electricity</option>
                      <option value="Water">Water</option>
                      <option value="Internet">Internet</option>
                      <option value="Netflix">Netflix</option>
                      <option value="Insurance">Insurance</option>
                      <option value="Rent">Rent</option>
                      <option value="EMI">EMI</option>
                    </select>
                  </div>

                  <div>
                    <label className="label text-[11px] font-bold text-slate-400 uppercase tracking-wide">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="input h-10 py-1"
                    >
                      <option value="">All Statuses</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="due_soon">Due Soon</option>
                      <option value="overdue">Overdue</option>
                      <option value="paid">Paid</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="label text-[11px] font-bold text-slate-400 uppercase tracking-wide">Priority</label>
                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                      className="input h-10 py-1"
                    >
                      <option value="">All Priorities</option>
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="label text-[11px] font-bold text-slate-400 uppercase tracking-wide">Recurring</label>
                    <select
                      value={filterRecurring}
                      onChange={(e) => setFilterRecurring(e.target.value)}
                      className="input h-10 py-1"
                    >
                      <option value="all">All Recurring</option>
                      <option value="true">Recurring Only</option>
                      <option value="false">One-off Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="label text-[11px] font-bold text-slate-400 uppercase tracking-wide">Method</label>
                    <select
                      value={filterPaymentMethod}
                      onChange={(e) => setFilterPaymentMethod(e.target.value)}
                      className="input h-10 py-1"
                    >
                      <option value="">All Methods</option>
                      <option value="card">Card Payment</option>
                      <option value="upi">UPI/Netbanking</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="label text-[11px] font-bold text-slate-400 uppercase tracking-wide">Min Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="Min"
                      value={filterAmountMin}
                      onChange={(e) => setFilterAmountMin(e.target.value)}
                      className="input h-10"
                    />
                  </div>

                  <div>
                    <label className="label text-[11px] font-bold text-slate-400 uppercase tracking-wide">Max Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filterAmountMax}
                      onChange={(e) => setFilterAmountMax(e.target.value)}
                      className="input h-10"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* BILLS LIST VIEW */}
          <div className="card bg-dark-800/60 border-slate-700/50 shadow-xl overflow-hidden print:hidden">
            <h3 className="text-sm font-black text-slate-300 uppercase tracking-wide mb-4">
              Detailed Obligations List
            </h3>

            {processedBillsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-800/60 border-slate-700 flex items-center justify-center text-slate-500 mb-4">
                  <CalendarDays size={32} />
                </div>
                <h4 className="text-slate-300 font-bold text-sm">No bills match your current filters</h4>
                <p className="text-slate-500 text-xs mt-1 max-w-sm">
                  Try clearing filters or search queries to view schedules.
                </p>
                <button
                  onClick={() => {
                    resetFormFields();
                    setIsAddModalOpen(true);
                  }}
                  className="btn-primary mt-4 py-2 px-4"
                >
                  Schedule Your First Bill
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/40 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Frequency</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {processedBillsList.map((bill) => {
                      const daysLeft = Math.ceil(
                        (new Date(bill.dueDate).getTime() - new Date().setHours(0, 0, 0, 0)) /
                          (1000 * 60 * 60 * 24)
                      );

                      return (
                        <tr
                          key={bill._id}
                          className="text-xs text-slate-300 hover:bg-slate-700/5 transition-all group"
                        >
                          <td
                            className="py-3.5 px-4 font-bold text-slate-200 cursor-pointer"
                            onClick={() => openDetailsDrawer(bill)}
                          >
                            <span className="mr-2 text-base">{bill.icon || '💸'}</span>
                            {bill.title}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">{bill.category}</td>
                          <td className="py-3.5 px-4">
                            <div>{new Date(bill.dueDate).toLocaleDateString('en-IN')}</div>
                            <div className="text-[10px] text-slate-500 font-semibold">
                              {daysLeft < 0 ? (
                                <span className="text-rose-400">Overdue by {Math.abs(daysLeft)}d</span>
                              ) : daysLeft === 0 ? (
                                <span className="text-orange-400">Due Today</span>
                              ) : daysLeft === 1 ? (
                                <span className="text-sky-400">Due Tomorrow</span>
                              ) : (
                                <span>{daysLeft} days remaining</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {bill.recurring ? (
                              <span className="inline-block text-[9px] font-extrabold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                                {bill.frequency}
                              </span>
                            ) : (
                              <span className="text-slate-500">One-off</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                bill.priority === 'high'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : bill.priority === 'medium'
                                  ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                  : 'bg-slate-700/30 text-slate-400 border-slate-700/50'
                              }`}
                            >
                              {bill.priority}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${getStatusColorClasses(
                                bill.status
                              )}`}
                            >
                              {bill.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-black text-slate-200">
                            ₹{bill.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {bill.status !== 'paid' && (
                                <button
                                  onClick={() => handleMarkPaid(bill._id)}
                                  disabled={isSubmitting}
                                  className={`btn-icon p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/10 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  title="Mark Paid"
                                >
                                  <Check size={13} />
                                </button>
                              )}
                              <button
                                onClick={() => startEditBill(bill)}
                                disabled={isSubmitting}
                                className={`btn-icon p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-700/30 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Edit"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteBill(bill._id)}
                                disabled={isSubmitting}
                                className={`btn-icon p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* RIGHT-SIDE SLIDING DRAWER (BILL DETAILS) */}
      <AnimatePresence>
        {isDrawerOpen && selectedBill && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-dark-800 border-l border-slate-700 shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div
                className="p-6 text-white relative flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${selectedBill.color || '#3b82f6'}20, ${selectedBill.color || '#3b82f6'}10)`,
                  borderBottom: `1px solid ${selectedBill.color || '#3b82f6'}30`,
                }}
              >
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="absolute right-4 top-4 btn-icon p-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-300"
                >
                  <X size={16} />
                </button>
                <div className="flex items-center gap-4 mt-2">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-black/20"
                    style={{ backgroundColor: `${selectedBill.color || '#3b82f6'}30`, border: `2px solid ${selectedBill.color || '#3b82f6'}50` }}
                  >
                    {selectedBill.icon || '💸'}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-900/40 text-slate-300 border border-slate-800/40">
                      {selectedBill.category}
                    </span>
                    <h2 className="text-xl font-black text-slate-100 mt-1">{selectedBill.title}</h2>
                  </div>
                </div>
                <div className="mt-6 flex justify-between items-end">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Due Amount</span>
                    <span className="text-3xl font-black text-slate-100 tracking-tight">
                      ₹{selectedBill.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span
                    className={`inline-block text-[10px] font-black uppercase px-3 py-1 rounded-full border ${getStatusColorClasses(
                      selectedBill.status
                    )}`}
                  >
                    {selectedBill.status}
                  </span>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Meta details list */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-dark-900/40 border border-slate-800/60 rounded-2xl">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Due Date</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5 block">
                      {new Date(selectedBill.dueDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3 bg-dark-900/40 border border-slate-800/60 rounded-2xl">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Payment Method</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5 block uppercase">
                      {selectedBill.paymentMethod || 'other'}
                    </span>
                  </div>
                  <div className="p-3 bg-dark-900/40 border border-slate-800/60 rounded-2xl">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Recurring System</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5 block">
                      {selectedBill.recurring ? `Every ${selectedBill.frequency}` : 'One-off Obligation'}
                    </span>
                  </div>
                  <div className="p-3 bg-dark-900/40 border border-slate-800/60 rounded-2xl">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Priority Tier</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5 block uppercase">
                      {selectedBill.priority}
                    </span>
                  </div>
                </div>

                {/* Notes Block */}
                {selectedBill.notes && (
                  <div className="p-4 bg-slate-900/20 border border-slate-800 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Notes & Details</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{selectedBill.notes}</p>
                  </div>
                )}

                {/* Payment History Tab */}
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                    Payment History Logs
                  </h4>
                  {selectedBill.paymentHistory && selectedBill.paymentHistory.length === 0 ? (
                    <p className="text-xs text-slate-600 italic">No previous settlements registered</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedBill.paymentHistory?.map((hist, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center p-3 rounded-xl border border-slate-800 bg-dark-900/40"
                        >
                          <div>
                            <span className="text-xs font-semibold text-slate-300">Settled occurrence</span>
                            <span className="text-[10px] text-slate-500 block">
                              {new Date(hist.paidAt).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                          <span className="text-xs font-black text-emerald-400">
                            +₹{hist.amountPaid.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Actions Footer */}
              <div className="p-6 border-t border-slate-800 bg-dark-900/60 flex-shrink-0 grid grid-cols-2 gap-3">
                {selectedBill.status !== 'paid' && (
                  <button
                    onClick={() => handleMarkPaid(selectedBill._id)}
                    disabled={isSubmitting}
                    className={`btn-primary w-full py-2.5 rounded-xl col-span-2 text-xs ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? 'Processing...' : 'Mark as Paid'}
                  </button>
                )}

                {selectedBill.recurring && (
                  <button
                    onClick={() => handleSkipBill(selectedBill._id)}
                    disabled={isSubmitting}
                    className={`btn bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-600/30 text-xs w-full ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <SkipForward size={14} /> {isSubmitting ? '...' : 'Skip Cycle'}
                  </button>
                )}

                <button
                  onClick={() => handlePostponeBill(selectedBill._id, 7)}
                  disabled={isSubmitting}
                  className={`btn bg-orange-600/10 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-650/30 text-xs w-full ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Clock size={14} /> {isSubmitting ? '...' : 'Postpone 7 Days'}
                </button>

                <button
                  onClick={() => handleDuplicateBill(selectedBill._id)}
                  disabled={isSubmitting}
                  className={`btn bg-slate-700/50 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs w-full ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Copy size={14} /> {isSubmitting ? '...' : 'Duplicate Copy'}
                </button>

                <button
                  onClick={() => startEditBill(selectedBill)}
                  disabled={isSubmitting}
                  className={`btn bg-slate-700/50 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs w-full ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Edit3 size={14} /> Edit details
                </button>

                <button
                  onClick={() => handleDeleteBill(selectedBill._id)}
                  disabled={isSubmitting}
                  className={`btn-danger text-xs w-full col-span-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Trash2 size={14} /> {isSubmitting ? 'Processing...' : 'Delete Schedule'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SCHEDULER ADD/EDIT MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        title={isEditMode ? 'Edit Scheduled Obligation' : 'Schedule New Obligation'}
        size="lg"
      >
        <form onSubmit={handleSaveBill} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group col-span-2">
              <label className="label">Bill Title *</label>
              <input
                type="text"
                placeholder="e.g. Electricity, Netflix, House Rent"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="input"
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Amount (₹) *</label>
              <input
                type="number"
                placeholder="e.g. 1450"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="input"
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Category *</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="input"
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
                <option value="Electricity">Electricity</option>
                <option value="Water">Water</option>
                <option value="Internet">Internet</option>
                <option value="Netflix">Netflix</option>
                <option value="Insurance">Insurance</option>
                <option value="Rent">Rent</option>
                <option value="EMI">EMI</option>
                <option value="Other Utility">Other Utility</option>
              </select>
            </div>

            <div className="form-group">
              <label className="label">Due Date *</label>
              <input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="input"
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Payment Method</label>
              <select
                value={formPaymentMethod}
                onChange={(e) => setFormPaymentMethod(e.target.value)}
                className="input"
              >
                <option value="card">Debit/Credit Card</option>
                <option value="upi">UPI / Netbanking</option>
                <option value="bank">Direct Debit / Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group col-span-2 p-3 bg-slate-900/30 border border-slate-800/80 rounded-2xl flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-200 block">Recurring Billing System</label>
                <span className="text-[10px] text-slate-500">Automatically advance schedules when paid</span>
              </div>
              <input
                type="checkbox"
                checked={formRecurring}
                onChange={(e) => setFormRecurring(e.target.checked)}
                className="w-4 h-4 text-primary-500 rounded border-slate-800 focus:ring-primary-500 accent-primary-500"
              />
            </div>

            {formRecurring && (
              <div className="form-group col-span-2">
                <label className="label">Billing Frequency</label>
                <select
                  value={formFrequency}
                  onChange={(e) => setFormFrequency(e.target.value)}
                  className="input"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="label">Priority Rank</label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value)}
                className="input"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div className="form-group">
              <label className="label">Reminder Timing</label>
              <select
                value={formReminder}
                onChange={(e) => setFormReminder(e.target.value)}
                className="input"
              >
                <option value="none">No Alerts</option>
                <option value="1_day_before">1 Day Before</option>
                <option value="2_days_before">2 Days Before</option>
                <option value="3_days_before">3 Days Before</option>
                <option value="1_week_before">1 Week Before</option>
                <option value="custom">Custom Days...</option>
              </select>
            </div>

            {formReminder === 'custom' && (
              <div className="form-group col-span-2">
                <label className="label">Custom Reminder Interval (Days before)</label>
                <input
                  type="number"
                  placeholder="e.g. 5"
                  value={formCustomReminderDays}
                  onChange={(e) => setFormCustomReminderDays(parseInt(e.target.value))}
                  className="input"
                />
              </div>
            )}

            {/* Custom Styling Pickers */}
            <div className="form-group col-span-2">
              <label className="label">Custom Style Theme</label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {colorsList.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormColor(c.value)}
                    className={`w-6 h-6 rounded-full border transition-all hover:scale-110 cursor-pointer ${
                      formColor === c.value ? 'ring-2 ring-primary-500 border-white' : 'border-slate-800'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {iconsList.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setFormIcon(ic)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg border transition-all hover:bg-slate-700/40 cursor-pointer ${
                      formIcon === ic ? 'bg-primary-600/20 border-primary-500 text-primary-400' : 'bg-slate-800/40 border-slate-700'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group col-span-2">
              <label className="label">Additional Notes</label>
              <textarea
                placeholder="Write specific instructions, account numbers, or reference notes..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="input min-h-[70px] resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="btn bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary px-6 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save Bill Schedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* FOCUSED DAY OBLIGATIONS MODAL */}
      <Modal
        isOpen={isDayModalOpen && dayModalDate !== null}
        onClose={closeDayModal}
        title={`Obligations on ${dayModalDate?.toLocaleDateString('en-IN')}`}
        size="md"
      >
        <div className="space-y-3">
          {dayModalDate &&
            getObligationsForDate(dayModalDate).map((ob) => (
              <div
                key={ob.id}
                onClick={() => openDetailsDrawer(ob.original || ob)}
                className="p-3 border border-slate-700 rounded-xl hover:border-slate-600 bg-dark-900/40 hover:bg-dark-900 transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ob.icon}</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{ob.title}</h4>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">{ob.category}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-100">₹{ob.amount.toLocaleString('en-IN')}</p>
                  <span
                    className={`inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded-full border mt-1 ${getStatusColorClasses(
                      ob.status
                    )}`}
                  >
                    {ob.status}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </Modal>
    </div>
  );
}
