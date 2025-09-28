



import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Page, Transaction, TransactionType, RevenueCategory, ExpenseCategory, User, UserRole, RevenueSource, Currency, RecurringExpense, Frequency, DisbursementSheet, DisbursementRecord, DisbursementMethod, AppSettings, Budget, Project, CustodyItem, DebtItem } from './types';
import { generateFinancialSummary, suggestExpenseCategory } from './services/geminiService';
import * as dataService from './services/dataService';
import { exportToExcel, exportDisbursementSheetToExcel, exportDetailedTransactionReport, exportBudgetReportToExcel, exportToPdf, exportProjectReportToExcel, exportRewardsToExcel, exportDebtsToExcel } from './services/exportService';
import { DashboardIcon, RevenuesIcon, ExpensesIcon, UsersIcon, SparklesIcon, LogoutIcon, ExportIcon, SettingsIcon, RecurringIcon, AidIcon, BellIcon, CloseIcon, ReportsIcon, PaperclipIcon, ExclamationIcon, FilterIcon, TrendingUpIcon, ProjectIcon, RewardIcon, BriefcaseIcon, NotesIcon, DebtsIcon } from './components/icons';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface ReminderInfo {
    generated: Transaction[];
    upcoming: RecurringExpense[];
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  category: string;
}

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error';
}

const initialFilters: Filters = {
  dateFrom: '',
  dateTo: '',
  amountMin: '',
  amountMax: '',
  category: '',
};

const formatCurrency = (amount: number, currency: Currency = Currency.USD) => {
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    };
    const locale = currency === Currency.USD ? 'en-US' : 'ar-EG-u-nu-latn';
    return new Intl.NumberFormat(locale, options).format(amount);
};


const LoginPage: React.FC<{
    onLogin: (username: string, pass: string) => boolean;
}> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!onLogin(username, password)) {
            setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
        }
    };
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-800">أمين الصندوق</h1>
                    <p className="mt-2 text-gray-500">تسجيل الدخول إلى حسابك</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                     {error && (
                        <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                            {error}
                        </div>
                    )}
                    <div>
                        <label htmlFor="username" className="block mb-2 text-sm font-medium text-gray-700">اسم المستخدم</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="اسم المستخدم الخاص بك"
                            required
                        />
                    </div>
                    <div>
                         <label htmlFor="password"className="block mb-2 text-sm font-medium text-gray-700">كلمة المرور</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="********"
                            required
                        />
                    </div>
                    <button type="submit" className="w-full px-5 py-3 text-base font-medium text-center text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300">
                        تسجيل الدخول
                    </button>
                </form>
            </div>
        </div>
    );
};

const EnhancedReminderToast: React.FC<{
    reminders: ReminderInfo;
    onClose: () => void;
}> = ({ reminders, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onClose();
        }, 500);
    };
    
    const { generated, upcoming } = reminders;

    return (
        <div className={`fixed top-8 right-8 w-full max-w-sm bg-white rounded-xl shadow-lg p-4 z-[100] ${isExiting ? 'toast-out' : 'toast-in'}`}>
             <div className="flex justify-end">
                <button onClick={handleClose} className="absolute top-3 right-3 text-gray-400 rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <span className="sr-only">إغلاق</span>
                    <CloseIcon className="h-5 w-5" />
                </button>
            </div>
            
            {generated.length > 0 && (
                <div className="flex items-start border-l-4 border-amber-500 pl-3 mb-4 pt-4">
                    <div className="flex-shrink-0 pt-0.5">
                        <ExclamationIcon className="w-6 h-6 text-amber-500" />
                    </div>
                    <div className="mr-3 w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900">
                            تم إنشاء مصروفات متأخرة
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                            تم إنشاء المعاملات التالية تلقائيًا لأنها تجاوزت تاريخ استحقاقها:
                        </p>
                        <ul className="mt-2 list-disc list-inside text-sm text-gray-500">
                           {generated.map(t => (
                               <li key={t.id}>{t.description.replace(' (دوري)','')} - {formatCurrency(t.amount, t.currency)}</li>
                           ))}
                        </ul>
                    </div>
                </div>
            )}
            
            {upcoming.length > 0 && (
                <div className={`flex items-start border-l-4 border-indigo-500 pl-3 ${generated.length > 0 ? 'pt-4 border-t mt-4' : 'pt-4'}`}>
                    <div className="flex-shrink-0 pt-0.5">
                        <BellIcon className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div className="mr-3 w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900">
                           مصروفات دورية قادمة!
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                           المصروفات التالية مستحقة غداً:
                        </p>
                        <ul className="mt-2 list-disc list-inside text-sm text-gray-500">
                           {upcoming.map(re => (
                               <li key={re.id}>{re.description} - {formatCurrency(re.amount, re.currency)}</li>
                           ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

const ToastContainer: React.FC<{ toasts: Toast[], removeToast: (id: number) => void }> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed bottom-5 right-5 z-[100] space-y-3">
            {toasts.map(toast => (
                <ToastMessage key={toast.id} toast={toast} onDismiss={removeToast} />
            ))}
        </div>
    );
};

const ToastMessage: React.FC<{ toast: Toast, onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onDismiss(toast.id), 500);
        }, 4000);

        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onDismiss(toast.id), 500);
    };

    const isSuccess = toast.type === 'success';
    const bgColor = isSuccess ? 'bg-green-500' : 'bg-red-500';
    const icon = isSuccess ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );

    return (
        <div className={`flex items-center text-white p-4 rounded-lg shadow-lg ${bgColor} ${isExiting ? 'toast-out' : 'toast-in'}`}>
            {icon}
            <p className="mr-3">{toast.message}</p>
            <button onClick={handleClose} className="mr-auto">
                <CloseIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

// Helper Components
const Sidebar: React.FC<{ activePage: Page; setPage: (page: Page) => void; currentUser: User; onLogout: () => void; }> = ({ activePage, setPage, currentUser, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: DashboardIcon, role: [UserRole.ADMIN, UserRole.TREASURER] },
    { id: 'revenues', label: 'الإيرادات', icon: RevenuesIcon, role: [UserRole.ADMIN, UserRole.TREASURER] },
    { id: 'expenses', label: 'المصروفات', icon: ExpensesIcon, role: [UserRole.ADMIN, UserRole.TREASURER] },
    { id: 'rewards', label: 'المكافآت', icon: RewardIcon, role: [UserRole.ADMIN, UserRole.TREASURER] },
    { id: 'projects', label: 'المشاريع', icon: ProjectIcon, role: [UserRole.ADMIN, UserRole.TREASURER] },
    { id: 'custody', label: 'العهد', icon: BriefcaseIcon, role: [UserRole.ADMIN, UserRole.TREASURER] },
    { id: 'debts', label: 'الديون', icon: DebtsIcon, role: [UserRole.ADMIN, UserRole.TREASURER] },
    { id: 'notes', label: 'الملاحظات', icon: NotesIcon, role: [UserRole.ADMIN, UserRole.TREASURER] },
    { id: 'reports', label: 'التقارير والميزانية', icon: ReportsIcon, role: [UserRole.ADMIN, UserRole.TREASURER] },
    { id: 'recurringExpenses', label: 'المصروفات الدورية', icon: RecurringIcon, role: [UserRole.ADMIN, UserRole.TREASURER] },
    { id: 'disbursement', label: 'كشوفات المساعدات', icon: AidIcon, role: [UserRole.ADMIN, UserRole.TREASURER] },
    { id: 'settings', label: 'الإعدادات', icon: SettingsIcon, role: [UserRole.ADMIN] },
  ];
  
  const accessibleItems = navItems.filter(item => currentUser && item.role.includes(currentUser.role));

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col min-h-screen">
      <div className="p-6 text-2xl font-bold border-b border-gray-700">أمين الصندوق</div>
      <nav className="flex-1 p-4">
        {accessibleItems.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id as Page)}
            className={`w-full flex items-center p-3 my-2 rounded-lg transition-colors ${
              activePage === item.id || (activePage === 'users' || activePage === 'revenueSources') && item.id === 'settings' ? 'bg-indigo-600' : 'hover:bg-gray-700'
            }`}
          >
            <item.icon className="w-6 h-6 ml-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
       <div className="p-4 border-t border-gray-700">
          <div className="mb-2">
            <p className="text-sm font-semibold">{currentUser.name}</p>
            <p className="text-xs text-gray-400">{currentUser.username}</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center p-3 rounded-lg hover:bg-red-800/50 text-red-300 transition-colors"
          >
            <LogoutIcon className="w-6 h-6 ml-4" />
            <span>تسجيل الخروج</span>
          </button>
       </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-white rounded-xl shadow-md p-6 flex items-center">
    <div className="bg-indigo-100 text-indigo-600 rounded-full p-4">
      {icon}
    </div>
    <div className="mr-4">
      <p className="text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-800" dir="ltr">{value}</p>
    </div>
  </div>
);

const TransactionRow: React.FC<{ transaction: Transaction, projects: Project[], onEdit: (transaction: Transaction) => void, onDelete: (transaction: Transaction) => void, onViewReceipt: (image: string) => void, isExpensePage: boolean }> = ({ transaction, projects, onEdit, onDelete, onViewReceipt, isExpensePage }) => {
    const projectName = useMemo(() => {
        if (!transaction.projectId) return '-';
        return projects.find(p => p.id === transaction.projectId)?.name || 'مشروع محذوف';
    }, [transaction.projectId, projects]);
    
    return (
        <tr className="border-b hover:bg-gray-50">
            <td className="p-4">{new Date(transaction.date).toLocaleDateString('ar-EG', { numberingSystem: 'latn' })}</td>
            <td className="p-4 flex items-center gap-2">
                {transaction.description}
                {transaction.receiptImage && (
                    <button onClick={() => onViewReceipt(transaction.receiptImage!)} title="عرض الفاتورة">
                        <PaperclipIcon className="w-5 h-5 text-gray-500 hover:text-indigo-600" />
                    </button>
                )}
            </td>
            <td className="p-4">{transaction.recipient || '-'}</td>
            <td className="p-4">{projectName}</td>
            <td className="p-4">{transaction.category}</td>
            <td className={`p-4 font-semibold ${transaction.type === TransactionType.REVENUE ? 'text-green-600' : 'text-red-600'}`} dir="ltr">
                {formatCurrency(transaction.amount, transaction.currency)}
            </td>
            {isExpensePage && (
                <td className="p-4 text-sm text-gray-600">
                    {transaction.exchangeRate ? transaction.exchangeRate.toFixed(2) : '-'}
                </td>
            )}
            <td className="p-4">
                <button onClick={() => onEdit(transaction)} className="text-blue-600 hover:underline ml-4">تعديل</button>
                <button onClick={() => onDelete(transaction)} className="text-red-600 hover:underline">حذف</button>
            </td>
        </tr>
    );
};

const AddEditTransactionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (transaction: Omit<Transaction, 'id'> | Transaction) => void;
    transactionToEdit: Transaction | null;
    revenueSources: RevenueSource[];
    projects: Project[];
    initialType: TransactionType;
}> = ({ isOpen, onClose, onSave, transactionToEdit, revenueSources, projects, initialType }) => {
    const [type, setType] = useState<TransactionType>(TransactionType.REVENUE);
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>(Currency.EGP);
    const [date, setDate] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<RevenueCategory | ExpenseCategory>(RevenueCategory.GENERAL);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [receiptImage, setReceiptImage] = useState<string | null>(null);
    const [recipient, setRecipient] = useState('');
    const [exchangeRate, setExchangeRate] = useState<string>('');
    const [projectId, setProjectId] = useState<string>('');


    React.useEffect(() => {
        if (transactionToEdit) {
            setType(transactionToEdit.type);
            setAmount(String(transactionToEdit.amount));
            setCurrency(transactionToEdit.currency);
            setDate(transactionToEdit.date);
            setDescription(transactionToEdit.description);
            setCategory(transactionToEdit.category);
            setReceiptImage(transactionToEdit.receiptImage || null);
            setRecipient(transactionToEdit.recipient || '');
            setExchangeRate(transactionToEdit.exchangeRate ? String(transactionToEdit.exchangeRate) : '');
            setProjectId(transactionToEdit.projectId || '');
        } else {
             setType(initialType);
             setAmount('');
             setCurrency(Currency.EGP);
             setDate(new Date().toISOString().split('T')[0]);
             setDescription('');
             setCategory(initialType === TransactionType.REVENUE ? RevenueCategory.GENERAL : ExpenseCategory.OPERATIONAL);
             setReceiptImage(null);
             setRecipient('');
             setExchangeRate('');
             setProjectId('');
        }
    }, [transactionToEdit, isOpen, initialType]);


    if (!isOpen) return null;

    const handleSuggestCategory = async () => {
        setIsSuggesting(true);
        const suggested = await suggestExpenseCategory(description);
        if (suggested) {
            setCategory(suggested);
        }
        setIsSuggesting(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setReceiptImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submittedTransaction: Omit<Transaction, 'id'> | Transaction = {
            ...(transactionToEdit || {}),
            id: transactionToEdit ? transactionToEdit.id : '',
            type,
            amount: parseFloat(amount),
            currency,
            date,
            description,
            category,
            receiptImage: receiptImage || undefined,
            recipient: recipient.trim() || undefined,
            projectId: projectId || undefined,
        };

        if (type === TransactionType.EXPENSE && currency === Currency.EGP) {
            const parsedRate = parseFloat(exchangeRate);
            if (!isNaN(parsedRate) && parsedRate > 0) {
                (submittedTransaction as Transaction).exchangeRate = parsedRate;
            }
        }

        onSave(submittedTransaction);
        onClose();
    };

    const categories = type === TransactionType.REVENUE ? Object.values(RevenueCategory) : Object.values(ExpenseCategory);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">{transactionToEdit ? 'تعديل المعاملة' : 'إضافة معاملة جديدة'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">نوع المعاملة</label>
                        <select value={type} onChange={e => {
                            const newType = e.target.value as TransactionType;
                            setType(newType);
                            setCategory(newType === TransactionType.REVENUE ? RevenueCategory.GENERAL : ExpenseCategory.OPERATIONAL);
                        }} className="w-full p-2 border rounded-md">
                            <option value={TransactionType.REVENUE}>إيراد</option>
                            <option value={TransactionType.EXPENSE}>مصروف</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-gray-700 mb-2">المبلغ</label>
                            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-2">العملة</label>
                            <select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className="w-full p-2 border rounded-md">
                                <option value={Currency.EGP}>جنيه مصري (EGP)</option>
                                <option value={Currency.USD}>دولار أمريكي (USD)</option>
                            </select>
                        </div>
                    </div>
                     <div className="mb-4">
                        <label className="block text-gray-700 mb-2">التاريخ</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">الوصف</label>
                        <input 
                            type="text" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            className="w-full p-2 border rounded-md" 
                            required 
                            list={type === TransactionType.REVENUE ? "revenue-sources-datalist" : undefined}
                        />
                        {type === TransactionType.REVENUE && (
                             <datalist id="revenue-sources-datalist">
                                {revenueSources.map(source => <option key={source.id} value={source.name} />)}
                             </datalist>
                        )}
                    </div>
                     <div className="mb-4">
                        <label className="block text-gray-700 mb-2">المشروع (اختياري)</label>
                        <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full p-2 border rounded-md">
                            <option value="">-- بدون مشروع --</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">المُستلِم / المسؤول</label>
                        <input
                            type="text"
                            value={recipient}
                            onChange={e => setRecipient(e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="اسم الشخص المسؤول عن المعاملة"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">الفئة</label>
                        <div className="flex items-center gap-2">
                            <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full p-2 border rounded-md">
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            {type === TransactionType.EXPENSE && (
                                <button type="button" onClick={handleSuggestCategory} disabled={isSuggesting || !description} className="p-2 bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSuggesting ? 'جاري...' : <SparklesIcon className="w-5 h-5" />}
                                </button>
                            )}
                        </div>
                    </div>

                    {type === TransactionType.EXPENSE && currency === Currency.EGP && (
                        <div className="mb-4">
                            <label className="block text-gray-700 mb-2">سعر الصرف (عند تاريخ الصرف)</label>
                             <input type="number" step="0.01" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} className="w-full p-2 border rounded-md" placeholder="اتركه فارغاً لاستخدام السعر الحالي" />
                        </div>
                    )}
                    
                    {type === TransactionType.EXPENSE && (
                        <div className="mb-6">
                            <label className="block text-gray-700 mb-2">إرفاق الفاتورة (اختياري)</label>
                            {receiptImage ? (
                                <div className="flex items-center gap-4">
                                    <img src={receiptImage} alt="Preview" className="w-20 h-20 object-cover rounded-md border" />
                                    <button type="button" onClick={() => setReceiptImage(null)} className="py-1 px-3 bg-red-100 text-red-700 rounded-md hover:bg-red-200">إزالة الصورة</button>
                                </div>
                            ) : (
                                <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300">إلغاء</button>
                        <button type="submit" className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddEditRewardModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (transaction: Omit<Transaction, 'id'> | Transaction) => void;
    rewardToEdit: Transaction | null;
}> = ({ isOpen, onClose, onSave, rewardToEdit }) => {
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>(Currency.EGP);
    const [date, setDate] = useState('');
    const [description, setDescription] = useState('');
    const [recipient, setRecipient] = useState('');

    React.useEffect(() => {
        if (rewardToEdit) {
            setAmount(String(rewardToEdit.amount));
            setCurrency(rewardToEdit.currency);
            setDate(rewardToEdit.date);
            setDescription(rewardToEdit.description);
            setRecipient(rewardToEdit.recipient || '');
        } else {
             setAmount('');
             setCurrency(Currency.EGP);
             setDate(new Date().toISOString().split('T')[0]);
             setDescription('');
             setRecipient('');
        }
    }, [rewardToEdit, isOpen]);

    if (!isOpen) return null;
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submittedReward: Omit<Transaction, 'id'> | Transaction = {
            ...(rewardToEdit || {}),
            id: rewardToEdit ? rewardToEdit.id : '',
            type: TransactionType.EXPENSE,
            category: ExpenseCategory.REWARDS,
            amount: parseFloat(amount),
            currency,
            date,
            description,
            recipient: recipient.trim() || undefined,
        };
        onSave(submittedReward);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">{rewardToEdit ? 'تعديل المكافأة' : 'إضافة مكافأة جديدة'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">عضو اللجنة (المستلم)</label>
                        <input
                            type="text"
                            value={recipient}
                            onChange={e => setRecipient(e.target.value)}
                            className="w-full p-2 border rounded-md"
                            placeholder="اسم الشخص المستلم للمكافأة"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-gray-700 mb-2">قيمة المكافأة</label>
                            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-2">العملة</label>
                            <select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className="w-full p-2 border rounded-md">
                                <option value={Currency.EGP}>جنيه مصري (EGP)</option>
                                <option value={Currency.USD}>دولار أمريكي (USD)</option>
                            </select>
                        </div>
                    </div>
                     <div className="mb-4">
                        <label className="block text-gray-700 mb-2">تاريخ الصرف</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">البيان (سبب المكافأة)</label>
                        <input 
                            type="text" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            className="w-full p-2 border rounded-md" 
                            required 
                        />
                    </div>
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300">إلغاء</button>
                        <button type="submit" className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const AddEditRecurringExpenseModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (expense: Omit<RecurringExpense, 'id' | 'nextDueDate'> | RecurringExpense) => void;
    expenseToEdit: RecurringExpense | null;
}> = ({ isOpen, onClose, onSave, expenseToEdit }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>(Currency.EGP);
    const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.OPERATIONAL);
    const [frequency, setFrequency] = useState<Frequency>(Frequency.MONTHLY);
    const [startDate, setStartDate] = useState('');

    React.useEffect(() => {
        if (expenseToEdit) {
            setDescription(expenseToEdit.description);
            setAmount(String(expenseToEdit.amount));
            setCurrency(expenseToEdit.currency);
            setCategory(expenseToEdit.category);
            setFrequency(expenseToEdit.frequency);
            setStartDate(expenseToEdit.startDate);
        } else {
            setDescription('');
            setAmount('');
            setCurrency(Currency.EGP);
            setCategory(ExpenseCategory.OPERATIONAL);
            setFrequency(Frequency.MONTHLY);
            setStartDate(new Date().toISOString().split('T')[0]);
        }
    }, [expenseToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...(expenseToEdit || {}),
            id: expenseToEdit ? expenseToEdit.id : '',
            description,
            amount: parseFloat(amount),
            currency,
            category,
            frequency,
            startDate,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">{expenseToEdit ? 'تعديل مصروف دوري' : 'إضافة مصروف دوري'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">الوصف</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-gray-700 mb-2">المبلغ</label>
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-2">العملة</label>
                            <select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className="w-full p-2 border rounded-md">
                                <option value={Currency.EGP}>جنيه مصري (EGP)</option>
                                <option value={Currency.USD}>دولار أمريكي (USD)</option>
                            </select>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">الفئة</label>
                        <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} className="w-full p-2 border rounded-md">
                            {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-gray-700 mb-2">التكرار</label>
                            <select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)} className="w-full p-2 border rounded-md">
                                {Object.values(Frequency).map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-2">تاريخ البدء</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-md" required />
                        </div>
                    </div>
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300">إلغاء</button>
                        <button type="submit" className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddEditUserModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: Omit<User, 'id'> | User) => void;
    userToEdit: User | null;
}> = ({ isOpen, onClose, onSave, userToEdit }) => {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.TREASURER);

    React.useEffect(() => {
        if (userToEdit) {
            setName(userToEdit.name);
            setUsername(userToEdit.username);
            setRole(userToEdit.role);
        } else {
            setName('');
            setUsername('');
            setRole(UserRole.TREASURER);
        }
        setPassword(''); // Always reset password for security
    }, [userToEdit, isOpen]);
    
    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: Omit<User, 'id'> | User = {
            ...(userToEdit || {}),
            id: userToEdit ? userToEdit.id : '',
            name,
            username,
            role,
        };
        if (password.trim()) {
            payload.password = password;
        }
        onSave(payload);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">{userToEdit ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">الاسم</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                     <div className="mb-4">
                        <label className="block text-gray-700 mb-2">اسم المستخدم</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                     <div className="mb-4">
                        <label className="block text-gray-700 mb-2">كلمة المرور</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            className="w-full p-2 border rounded-md" 
                            placeholder={userToEdit ? "اتركه فارغاً لعدم التغيير" : ""}
                            required={!userToEdit} 
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 mb-2">الدور</label>
                        <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full p-2 border rounded-md">
                            {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300">إلغاء</button>
                        <button type="submit" className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddEditRevenueSourceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (source: Omit<RevenueSource, 'id'> | RevenueSource) => void;
    sourceToEdit: RevenueSource | null;
}> = ({ isOpen, onClose, onSave, sourceToEdit }) => {
    const [name, setName] = useState('');

    React.useEffect(() => {
        if (sourceToEdit) {
            setName(sourceToEdit.name);
        } else {
            setName('');
        }
    }, [sourceToEdit, isOpen]);
    
    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...(sourceToEdit || {}),
            id: sourceToEdit ? sourceToEdit.id : '',
            name,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">{sourceToEdit ? 'تعديل مصدر إيراد' : 'إضافة مصدر إيراد جديد'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">اسم المصدر (الوصف)</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300">إلغاء</button>
                        <button type="submit" className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ImageViewerModal: React.FC<{ imageUrl: string | null, onClose: () => void }> = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[60]" onClick={onClose}>
            <div className="max-w-4xl max-h-[90vh] p-4" onClick={e => e.stopPropagation()}>
                <img src={imageUrl} alt="Receipt" className="max-w-full max-h-full object-contain" />
            </div>
        </div>
    );
};

const ConfirmationModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: () => void; 
    title: string; 
    message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">{title}</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300">إلغاء</button>
                    <button onClick={onConfirm} className="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700">تأكيد الحذف</button>
                </div>
            </div>
        </div>
    );
};

const AddEditDisbursementSheetModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (sheet: Omit<DisbursementSheet, 'id' | 'createdAt' | 'records'> | DisbursementSheet) => string | undefined;
    sheetToEdit: DisbursementSheet | null;
}> = ({ isOpen, onClose, onSave, sheetToEdit }) => {
    const [name, setName] = useState('');

    useEffect(() => {
        if (sheetToEdit) setName(sheetToEdit.name);
        else setName('');
    }, [sheetToEdit, isOpen]);

    if (!isOpen) return null;
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
             ...(sheetToEdit || { records: [] }),
            id: sheetToEdit ? sheetToEdit.id : '',
            name,
            createdAt: sheetToEdit ? sheetToEdit.createdAt : new Date().toISOString()
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">{sheetToEdit ? 'تعديل اسم الكشف' : 'إنشاء كشف مساعدات جديد'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">اسم الكشف</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300">إلغاء</button>
                        <button type="submit" className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddEditDisbursementRecordModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: Omit<DisbursementRecord, 'id'> | DisbursementRecord) => void;
    recordToEdit: DisbursementRecord | null;
}> = ({ isOpen, onClose, onSave, recordToEdit }) => {
    const [name, setName] = useState('');
    const [nationalId, setNationalId] = useState('');
    const [disbursementDate, setDisbursementDate] = useState('');
    const [method, setMethod] = useState<DisbursementMethod>(DisbursementMethod.CASH);
    const [phone, setPhone] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>(Currency.EGP);

    useEffect(() => {
        if (recordToEdit) {
            setName(recordToEdit.name);
            setNationalId(recordToEdit.nationalId);
            setDisbursementDate(recordToEdit.disbursementDate);
            setMethod(recordToEdit.method);
            setPhone(recordToEdit.phone);
            setAmount(String(recordToEdit.amount));
            setCurrency(recordToEdit.currency);
        } else {
            setName('');
            setNationalId('');
            setDisbursementDate(new Date().toISOString().split('T')[0]);
            setMethod(DisbursementMethod.CASH);
            setPhone('');
            setAmount('');
            setCurrency(Currency.EGP);
        }
    }, [recordToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...(recordToEdit || {}),
            id: recordToEdit ? recordToEdit.id : '',
            name, nationalId, disbursementDate, method, phone,
            amount: parseFloat(amount),
            currency,
        });
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-6">{recordToEdit ? 'تعديل بيانات المستفيد' : 'إضافة مستفيد جديد للكشف'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="mb-4">
                            <label className="block text-gray-700 mb-2">الاسم الكامل</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-md" required />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 mb-2">رقم الهوية</label>
                            <input type="text" value={nationalId} onChange={e => setNationalId(e.target.value)} className="w-full p-2 border rounded-md" required />
                        </div>
                         <div className="mb-4">
                            <label className="block text-gray-700 mb-2">تاريخ الصرف</label>
                            <input type="date" value={disbursementDate} onChange={e => setDisbursementDate(e.target.value)} className="w-full p-2 border rounded-md" required />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 mb-2">طريقة الصرف</label>
                            <select value={method} onChange={e => setMethod(e.target.value as DisbursementMethod)} className="w-full p-2 border rounded-md">
                                {Object.values(DisbursementMethod).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 mb-2">رقم الهاتف</label>
                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 border rounded-md" />
                        </div>
                         <div className="mb-4">
                            <label className="block text-gray-700 mb-2">المبلغ</label>
                            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 border rounded-md" required />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 mb-2">العملة</label>
                            <select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className="w-full p-2 border rounded-md">
                                <option value={Currency.EGP}>جنيه مصري (EGP)</option>
                                <option value={Currency.USD}>دولار أمريكي (USD)</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 mt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300">إلغاء</button>
                        <button type="submit" className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const ExportPdfModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onExport: (range: 'all' | { from: string, to: string }) => void;
  isExporting: boolean;
}> = ({ isOpen, onClose, onExport, isExporting }) => {
  const [rangeType, setRangeType] = useState<'all' | 'custom'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  if (!isOpen) return null;

  const handleExportClick = () => {
    if (rangeType === 'all') {
      onExport('all');
    } else {
      if (dateFrom && dateTo) {
        onExport({ from: dateFrom, to: dateTo });
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6">تصدير تقرير PDF</h2>
        <div className="space-y-4">
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="exportRange"
                value="all"
                checked={rangeType === 'all'}
                onChange={() => setRangeType('all')}
                className="form-radio h-4 w-4 text-indigo-600"
              />
              <span className="text-gray-700">تصدير كل البيانات</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="exportRange"
                value="custom"
                checked={rangeType === 'custom'}
                onChange={() => setRangeType('custom')}
                className="form-radio h-4 w-4 text-indigo-600"
              />
              <span className="text-gray-700">تحديد نطاق زمني</span>
            </label>
          </div>
          {rangeType === 'custom' && (
            <div className="grid grid-cols-2 gap-4 pl-6 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">من تاريخ</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">إلى تاريخ</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-4 mt-8">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300">إلغاء</button>
          <button
            onClick={handleExportClick}
            disabled={isExporting || (rangeType === 'custom' && (!dateFrom || !dateTo))}
            className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-wait"
          >
            {isExporting ? 'جاري التصدير...' : 'تصدير الآن'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AddEditProjectModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (project: Omit<Project, 'id'> | Project) => void;
    projectToEdit: Project | null;
}> = ({ isOpen, onClose, onSave, projectToEdit }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [budget, setBudget] = useState('');

    React.useEffect(() => {
        if (projectToEdit) {
            setName(projectToEdit.name);
            setDescription(projectToEdit.description);
            setBudget(String(projectToEdit.budget));
        } else {
            setName('');
            setDescription('');
            setBudget('');
        }
    }, [projectToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...(projectToEdit || {}),
            id: projectToEdit ? projectToEdit.id : '',
            name,
            description,
            budget: parseFloat(budget) || 0,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">{projectToEdit ? 'تعديل مشروع' : 'إضافة مشروع جديد'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">اسم المشروع</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">الوصف</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-md" rows={3}></textarea>
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 mb-2">الميزانية (USD)</label>
                        <input type="number" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} className="w-full p-2 border rounded-md" placeholder="0.00" />
                    </div>
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300">إلغاء</button>
                        <button type="submit" className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddEditCustodyModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: Omit<CustodyItem, 'id'> | CustodyItem) => void;
    itemToEdit: CustodyItem | null;
}> = ({ isOpen, onClose, onSave, itemToEdit }) => {
    const [itemName, setItemName] = useState('');
    const [custodianName, setCustodianName] = useState('');
    const [receivedDate, setReceivedDate] = useState('');

    React.useEffect(() => {
        if (itemToEdit) {
            setItemName(itemToEdit.itemName);
            setCustodianName(itemToEdit.custodianName);
            setReceivedDate(itemToEdit.receivedDate);
        } else {
            setItemName('');
            setCustodianName('');
            setReceivedDate(new Date().toISOString().split('T')[0]);
        }
    }, [itemToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...(itemToEdit || {}),
            id: itemToEdit ? itemToEdit.id : '',
            itemName,
            custodianName,
            receivedDate,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">{itemToEdit ? 'تعديل عهدة' : 'إضافة عهدة جديدة'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">اسم العهدة (لابتوب، جوال، ...)</label>
                        <input type="text" value={itemName} onChange={e => setItemName(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">اسم المستلم</label>
                        <input type="text" value={custodianName} onChange={e => setCustodianName(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 mb-2">تاريخ الاستلام</label>
                        <input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300">إلغاء</button>
                        <button type="submit" className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddEditDebtModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: Omit<DebtItem, 'id'> | DebtItem) => void;
    itemToEdit: DebtItem | null;
}> = ({ isOpen, onClose, onSave, itemToEdit }) => {
    const [creditorName, setCreditorName] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>(Currency.EGP);
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');

    React.useEffect(() => {
        if (itemToEdit) {
            setCreditorName(itemToEdit.creditorName);
            setAmount(String(itemToEdit.amount));
            setCurrency(itemToEdit.currency);
            setDescription(itemToEdit.description);
            setDate(itemToEdit.date);
        } else {
            setCreditorName('');
            setAmount('');
            setCurrency(Currency.EGP);
            setDescription('');
            setDate(new Date().toISOString().split('T')[0]);
        }
    }, [itemToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...(itemToEdit || {}),
            id: itemToEdit ? itemToEdit.id : '',
            creditorName,
            amount: parseFloat(amount),
            currency,
            description,
            date,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">{itemToEdit ? 'تعديل دين' : 'إضافة دين جديد'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">اسم الدائن</label>
                        <input type="text" value={creditorName} onChange={e => setCreditorName(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-gray-700 mb-2">المبلغ</label>
                            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-2">العملة</label>
                            <select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className="w-full p-2 border rounded-md">
                                <option value={Currency.EGP}>جنيه مصري (EGP)</option>
                                <option value={Currency.USD}>دولار أمريكي (USD)</option>
                            </select>
                        </div>
                    </div>
                     <div className="mb-4">
                        <label className="block text-gray-700 mb-2">تاريخ الاستحقاق</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded-md" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">البيان (سبب الدين)</label>
                        <input 
                            type="text" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            className="w-full p-2 border rounded-md" 
                            required 
                        />
                    </div>
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 rounded-md hover:bg-gray-300">إلغاء</button>
                        <button type="submit" className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};



// Main Pages
const DashboardPage: React.FC<{
    transactions: Transaction[];
    projects: Project[];
    onAddTransaction: (type: TransactionType) => void;
    onEditTransaction: (transaction: Transaction) => void;
    onDeleteTransaction: (transaction: Transaction) => void;
    onViewReceipt: (image: string) => void;
    unifiedUSDBalances: any;
}> = ({ transactions, projects, onAddTransaction, onEditTransaction, onDeleteTransaction, onViewReceipt, unifiedUSDBalances }) => {
    
    const [summary, setSummary] = useState("جاري إنشاء الملخص...");
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);
    const { totalRevenuesUSD, totalExpensesUSD, currentBalanceUSD } = unifiedUSDBalances;

    const generateSummary = useCallback(async () => {
        setIsLoadingSummary(true);
        const settings = dataService.getSettings();
        const summaryText = await generateFinancialSummary(unifiedUSDBalances, settings.usdToEgpRate, transactions);
        setSummary(summaryText);
        setIsLoadingSummary(false);
    }, [unifiedUSDBalances, transactions]);

    useEffect(() => {
        generateSummary();
    }, [generateSummary]);

    const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

    const expenseData = useMemo(() => {
        const expenseByCategory = transactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .reduce((acc, t) => {
                const category = t.category;
                const rate = t.exchangeRate || dataService.getSettings().usdToEgpRate;
                const amountUSD = t.currency === Currency.EGP ? t.amount / rate : t.amount;
                acc[category] = (acc[category] || 0) + amountUSD;
                return acc;
            }, {} as Record<ExpenseCategory, number>);
            
        return Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));
    }, [transactions]);
    
    const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

    const financialTrendData = useMemo(() => {
        const last6Months = Array.from({ length: 6 }).map((_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            return { month: d.toLocaleString('ar-EG', { month: 'short' }), year: d.getFullYear(), revenues: 0, expenses: 0 };
        }).reverse();

        transactions.forEach(t => {
            const date = new Date(t.date);
            const month = date.toLocaleString('ar-EG', { month: 'short' });
            const year = date.getFullYear();
            const monthData = last6Months.find(m => m.month === month && m.year === year);
            if (monthData) {
                const rate = t.exchangeRate || dataService.getSettings().usdToEgpRate;
                const amountUSD = t.currency === Currency.EGP ? t.amount / rate : t.amount;
                if (t.type === TransactionType.REVENUE) {
                    monthData.revenues += amountUSD;
                } else {
                    monthData.expenses += amountUSD;
                }
            }
        });
        return last6Months;

    }, [transactions]);

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">لوحة التحكم</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard title="إجمالي الإيرادات (المعادل)" value={formatCurrency(totalRevenuesUSD)} icon={<RevenuesIcon className="w-8 h-8"/>} />
                <StatCard title="إجمالي المصروفات (المعادل)" value={formatCurrency(totalExpensesUSD)} icon={<ExpensesIcon className="w-8 h-8"/>} />
                <StatCard title="الرصيد الحالي (المعادل)" value={formatCurrency(currentBalanceUSD)} icon={<DashboardIcon className="w-8 h-8"/>} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* AI Summary */}
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">ملخص مالي ذكي</h2>
                        <button onClick={generateSummary} disabled={isLoadingSummary} className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50">
                            <SparklesIcon className={`w-6 h-6 text-indigo-500 ${isLoadingSummary ? 'animate-pulse' : ''}`}/>
                        </button>
                    </div>
                     <div className={`text-gray-700 whitespace-pre-wrap ${isLoadingSummary ? 'animate-pulse' : ''}`}>
                         {isLoadingSummary ? 'جاري تحليل البيانات...' : summary}
                     </div>
                </div>

                {/* Expense Breakdown */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold mb-4">توزيع المصروفات (USD)</h2>
                    <ResponsiveContainer width="100%" height={250}>
                       <PieChart>
                            <Pie
                                data={expenseData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {expenseData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [formatCurrency(value), "المبلغ"]} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

             {/* Financial Trend */}
            <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center"><TrendingUpIcon className="w-6 h-6 ml-2 text-gray-500" /> الأداء المالي لآخر 6 أشهر (USD)</h2>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={financialTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => formatCurrency(value, Currency.USD).replace('$', '')}/>
                        <Tooltip formatter={(value: number) => [formatCurrency(value), ""]} />
                        <Legend />
                        <Bar dataKey="revenues" fill="#10B981" name="الإيرادات" />
                        <Bar dataKey="expenses" fill="#EF4444" name="المصروفات" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            {/* Recent Transactions */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">آخر المعاملات</h2>
                    <div className="space-x-2 space-x-reverse">
                         <button onClick={() => onAddTransaction(TransactionType.REVENUE)} className="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700">إضافة إيراد</button>
                         <button onClick={() => onAddTransaction(TransactionType.EXPENSE)} className="py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700">إضافة مصروف</button>
                    </div>
                 </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-4 font-semibold">التاريخ</th>
                                <th className="p-4 font-semibold">البيان</th>
                                <th className="p-4 font-semibold">المُستلِم</th>
                                <th className="p-4 font-semibold">المشروع</th>
                                <th className="p-4 font-semibold">الفئة</th>
                                <th className="p-4 font-semibold">المبلغ</th>
                                <th className="p-4 font-semibold">سعر الصرف</th>
                                <th className="p-4 font-semibold">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTransactions.map(tx => (
                                <TransactionRow key={tx.id} transaction={tx} projects={projects} onEdit={onEditTransaction} onDelete={onDeleteTransaction} onViewReceipt={onViewReceipt} isExpensePage={true} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const TransactionsPage: React.FC<{
  type: TransactionType;
  transactions: Transaction[];
  projects: Project[];
  onAdd: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onViewReceipt: (image: string) => void;
}> = ({ type, transactions, projects, onAdd, onEdit, onDelete, onViewReceipt }) => {
    const title = type === TransactionType.REVENUE ? 'الإيرادات' : 'المصروفات';
    const allCategories = type === TransactionType.REVENUE ? Object.values(RevenueCategory) : Object.values(ExpenseCategory);
    
    const [filters, setFilters] = useState<Filters>(initialFilters);
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (filters.dateFrom && t.date < filters.dateFrom) return false;
            if (filters.dateTo && t.date > filters.dateTo) return false;
            if (filters.amountMin && t.amount < parseFloat(filters.amountMin)) return false;
            if (filters.amountMax && t.amount > parseFloat(filters.amountMax)) return false;
            if (filters.category && t.category !== filters.category) return false;
            return true;
        });
    }, [transactions, filters]);

    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const clearFilters = () => {
        setFilters(initialFilters);
        setCurrentPage(1);
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">{title}</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowFilters(!showFilters)} className="p-2 rounded-md bg-gray-100 hover:bg-gray-200">
                        <FilterIcon className="w-6 h-6 text-gray-600" />
                    </button>
                    <button onClick={onAdd} className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                        إضافة {type === TransactionType.REVENUE ? 'إيراد' : 'مصروف'}
                    </button>
                </div>
            </div>
            
             {showFilters && (
                <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <select name="category" value={filters.category} onChange={handleFilterChange} className="p-2 border rounded-md">
                            <option value="">كل الفئات</option>
                            {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                         <input type="number" name="amountMin" placeholder="أقل مبلغ" value={filters.amountMin} onChange={handleFilterChange} className="p-2 border rounded-md" />
                         <input type="number" name="amountMax" placeholder="أعلى مبلغ" value={filters.amountMax} onChange={handleFilterChange} className="p-2 border rounded-md" />
                         <div className="flex items-center gap-2">
                             <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} className="w-full p-2 border rounded-md" />
                             <span>-</span>
                             <input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} className="w-full p-2 border rounded-md" />
                         </div>
                    </div>
                     <div className="mt-4 flex justify-end">
                        <button onClick={clearFilters} className="py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700">مسح الفلاتر</button>
                     </div>
                </div>
             )}

            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-4 font-semibold">التاريخ</th>
                            <th className="p-4 font-semibold">البيان</th>
                            <th className="p-4 font-semibold">المُستلِم</th>
                            <th className="p-4 font-semibold">المشروع</th>
                            <th className="p-4 font-semibold">الفئة</th>
                            <th className="p-4 font-semibold">المبلغ</th>
                            {type === TransactionType.EXPENSE && <th className="p-4 font-semibold">سعر الصرف</th>}
                            <th className="p-4 font-semibold">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTransactions.map(tx => (
                            <TransactionRow key={tx.id} transaction={tx} projects={projects} onEdit={onEdit} onDelete={onDelete} onViewReceipt={onViewReceipt} isExpensePage={type === TransactionType.EXPENSE} />
                        ))}
                    </tbody>
                </table>
            </div>
             {totalPages > 1 && (
                <div className="flex justify-center items-center mt-6">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 mx-1 bg-white border rounded-md disabled:opacity-50"
                    >
                        السابق
                    </button>
                     <span className="mx-2">صفحة {currentPage} من {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 mx-1 bg-white border rounded-md disabled:opacity-50"
                    >
                        التالي
                    </button>
                </div>
            )}
        </div>
    );
};

const RewardsPage: React.FC<{
  rewards: Transaction[];
  onAdd: () => void;
  onEdit: (reward: Transaction) => void;
  onDelete: (reward: Transaction) => void;
  onExport: () => void;
}> = ({ rewards, onAdd, onEdit, onDelete, onExport }) => {
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">المكافآت</h1>
                 <div className="flex items-center gap-2">
                     <button onClick={onExport} className="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2">
                        <ExportIcon className="w-5 h-5"/>
                        <span>تصدير كشف المكافآت</span>
                    </button>
                    <button onClick={onAdd} className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                        إضافة مكافأة
                    </button>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-4 font-semibold">التاريخ</th>
                            <th className="p-4 font-semibold">عضو اللجنة (المستلم)</th>
                            <th className="p-4 font-semibold">البيان</th>
                            <th className="p-4 font-semibold">المبلغ</th>
                            <th className="p-4 font-semibold">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rewards.map(reward => (
                            <tr key={reward.id} className="border-b hover:bg-gray-50">
                                <td className="p-4">{new Date(reward.date).toLocaleDateString('ar-EG', { numberingSystem: 'latn' })}</td>
                                <td className="p-4">{reward.recipient || '-'}</td>
                                <td className="p-4">{reward.description}</td>
                                <td className="p-4 font-semibold text-red-600" dir="ltr">
                                    {formatCurrency(reward.amount, reward.currency)}
                                </td>
                                <td className="p-4">
                                    <button onClick={() => onEdit(reward)} className="text-blue-600 hover:underline ml-4">تعديل</button>
                                    <button onClick={() => onDelete(reward)} className="text-red-600 hover:underline">حذف</button>
                                </td>
                            </tr>
                        ))}
                         {rewards.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center p-8 text-gray-500">لا توجد مكافآت مسجلة.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const RecurringExpensesPage: React.FC<{
  recurringExpenses: RecurringExpense[];
  onAdd: () => void;
  onEdit: (expense: RecurringExpense) => void;
  onDelete: (expense: RecurringExpense) => void;
}> = ({ recurringExpenses, onAdd, onEdit, onDelete }) => {
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">المصروفات الدورية</h1>
                <button onClick={onAdd} className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">إضافة مصروف دوري</button>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                 <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-4 font-semibold">الوصف</th>
                            <th className="p-4 font-semibold">المبلغ</th>
                            <th className="p-4 font-semibold">الفئة</th>
                            <th className="p-4 font-semibold">التكرار</th>
                            <th className="p-4 font-semibold">تاريخ البدء</th>
                            <th className="p-4 font-semibold">تاريخ الاستحقاق القادم</th>
                            <th className="p-4 font-semibold">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recurringExpenses.map(re => (
                            <tr key={re.id} className="border-b hover:bg-gray-50">
                                <td className="p-4">{re.description}</td>
                                <td className="p-4 font-semibold text-red-600" dir="ltr">{formatCurrency(re.amount, re.currency)}</td>
                                <td className="p-4">{re.category}</td>
                                <td className="p-4">{re.frequency}</td>
                                <td className="p-4">{new Date(re.startDate).toLocaleDateString('ar-EG', { numberingSystem: 'latn' })}</td>
                                <td className="p-4">{new Date(re.nextDueDate).toLocaleDateString('ar-EG', { numberingSystem: 'latn' })}</td>
                                <td className="p-4">
                                    <button onClick={() => onEdit(re)} className="text-blue-600 hover:underline ml-4">تعديل</button>
                                    <button onClick={() => onDelete(re)} className="text-red-600 hover:underline">حذف</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
            </div>
        </div>
    );
};

const UsersPage: React.FC<{
  users: User[];
  onAddUser: () => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
}> = ({ users, onAddUser, onEditUser, onDeleteUser }) => {
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>
                <button onClick={onAddUser} className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">إضافة مستخدم</button>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                 <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-4 font-semibold">الاسم</th>
                            <th className="p-4 font-semibold">اسم المستخدم</th>
                            <th className="p-4 font-semibold">الدور</th>
                            <th className="p-4 font-semibold">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                                <td className="p-4">{user.name}</td>
                                <td className="p-4">{user.username}</td>
                                <td className="p-4">{user.role}</td>
                                <td className="p-4">
                                    <button onClick={() => onEditUser(user)} className="text-blue-600 hover:underline ml-4">تعديل</button>
                                    <button onClick={() => onDeleteUser(user)} className="text-red-600 hover:underline">حذف</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
            </div>
        </div>
    );
};

const RevenueSourcesPage: React.FC<{
  sources: RevenueSource[];
  onAddSource: () => void;
  onEditSource: (source: RevenueSource) => void;
  onDeleteSource: (source: RevenueSource) => void;
}> = ({ sources, onAddSource, onEditSource, onDeleteSource }) => {
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">مصادر الإيرادات (للاقتراحات)</h1>
                <button onClick={onAddSource} className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">إضافة مصدر</button>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                 <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-4 font-semibold">اسم المصدر</th>
                            <th className="p-4 font-semibold">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sources.map(source => (
                            <tr key={source.id} className="border-b hover:bg-gray-50">
                                <td className="p-4">{source.name}</td>
                                <td className="p-4">
                                    <button onClick={() => onEditSource(source)} className="text-blue-600 hover:underline ml-4">تعديل</button>
                                    <button onClick={() => onDeleteSource(source)} className="text-red-600 hover:underline">حذف</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
            </div>
        </div>
    );
};

const DisbursementPage: React.FC<{
  sheets: DisbursementSheet[];
  onSaveSheet: (sheet: Omit<DisbursementSheet, 'id' | 'createdAt' | 'records'> | DisbursementSheet) => string | undefined;
  onDeleteSheet: (sheetId: string) => void;
  onSaveRecord: (sheetId: string, record: Omit<DisbursementRecord, 'id'> | DisbursementRecord) => void;
  onDeleteRecord: (sheetId: string, recordId: string) => void;
  onExportSheet: (sheetId: string) => void;
}> = ({ sheets, onSaveSheet, onDeleteSheet, onSaveRecord, onDeleteRecord, onExportSheet }) => {
    const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
    const [sheetToEdit, setSheetToEdit] = useState<DisbursementSheet | null>(null);
    const [activeSheetId, setActiveSheetId] = useState<string | null>(sheets.length > 0 ? sheets[0].id : null);
    
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
    const [recordToEdit, setRecordToEdit] = useState<DisbursementRecord | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'sheet' | 'record', id: string, sheetId?: string } | null>(null);
    
    const activeSheet = useMemo(() => sheets.find(s => s.id === activeSheetId), [sheets, activeSheetId]);

    const handleAddSheet = () => { setSheetToEdit(null); setIsSheetModalOpen(true); };
    const handleEditSheet = (sheet: DisbursementSheet) => { setSheetToEdit(sheet); setIsSheetModalOpen(true); };

    const handleAddRecord = () => { setRecordToEdit(null); setIsRecordModalOpen(true); };
    const handleEditRecord = (record: DisbursementRecord) => { setRecordToEdit(record); setIsRecordModalOpen(true); };

// Fix: Ensure `handleSaveSheetAndActivate` returns a `string | undefined` to match the `onSave` prop type.
    const handleSaveSheetAndActivate = (sheetData: Omit<DisbursementSheet, 'id' | 'createdAt' | 'records'> | DisbursementSheet) => {
        const isNew = !('id' in sheetData) || !sheetData.id;
        const newId = onSaveSheet(sheetData);
        if (isNew && newId) {
            setActiveSheetId(newId);
        }
        return newId;
    };
    
    const handleDeleteConfirmation = (type: 'sheet' | 'record', id: string, sheetId?: string) => {
        setDeleteConfirmation({ type, id, sheetId });
    };

    const confirmDelete = () => {
        if (!deleteConfirmation) return;
        if (deleteConfirmation.type === 'sheet') {
            onDeleteSheet(deleteConfirmation.id);
            if (activeSheetId === deleteConfirmation.id) {
                setActiveSheetId(sheets.length > 1 ? sheets.find(s => s.id !== deleteConfirmation.id)!.id : null);
            }
        } else if (deleteConfirmation.type === 'record' && deleteConfirmation.sheetId) {
            onDeleteRecord(deleteConfirmation.sheetId, deleteConfirmation.id);
        }
        setDeleteConfirmation(null);
    };

    return (
        <div className="p-8">
            <AddEditDisbursementSheetModal
                isOpen={isSheetModalOpen}
                onClose={() => setIsSheetModalOpen(false)}
                onSave={handleSaveSheetAndActivate}
                sheetToEdit={sheetToEdit}
            />
            {activeSheetId && (
                <AddEditDisbursementRecordModal
                    isOpen={isRecordModalOpen}
                    onClose={() => setIsRecordModalOpen(false)}
                    onSave={(record) => onSaveRecord(activeSheetId, record)}
                    recordToEdit={recordToEdit}
                />
            )}
            <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={confirmDelete}
                title={`تأكيد حذف ${deleteConfirmation?.type === 'sheet' ? 'الكشف' : 'المستفيد'}`}
                message={`هل أنت متأكد من رغبتك في حذف ${deleteConfirmation?.type === 'sheet' ? 'هذا الكشف بكل سجلاته' : 'بيانات هذا المستفيد'}؟ لا يمكن التراجع عن هذا الإجراء.`}
            />

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">كشوفات المساعدات</h1>
                <div className="flex items-center gap-2">
                     <select 
                        value={activeSheetId || ''} 
                        onChange={(e) => setActiveSheetId(e.target.value)}
                        className="p-2 border rounded-md bg-white min-w-[200px]"
                        disabled={sheets.length === 0}
                     >
                         {sheets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                         {sheets.length === 0 && <option>لا توجد كشوفات</option>}
                     </select>
                    {activeSheet && (
                        <>
                         <button onClick={() => handleEditSheet(activeSheet)} className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md">تعديل اسم الكشف</button>
                         <button onClick={() => onExportSheet(activeSheetId!)} className="p-2 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded-md">تصدير الكشف (Excel)</button>
                         <button onClick={() => handleDeleteConfirmation('sheet', activeSheet.id)} className="p-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-md">حذف الكشف</button>
                        </>
                    )}
                    <button onClick={handleAddSheet} className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">إنشاء كشف جديد</button>
                </div>
            </div>

            {activeSheet ? (
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">{activeSheet.name}</h2>
                        <button onClick={handleAddRecord} className="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700">إضافة مستفيد</button>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold">الاسم الكامل</th>
                                    <th className="p-4 font-semibold">رقم الهوية</th>
                                    <th className="p-4 font-semibold">تاريخ الصرف</th>
                                    <th className="p-4 font-semibold">المبلغ</th>
                                    <th className="p-4 font-semibold">طريقة الصرف</th>
                                    <th className="p-4 font-semibold">رقم الهاتف</th>
                                    <th className="p-4 font-semibold">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeSheet.records.map(record => (
                                    <tr key={record.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4">{record.name}</td>
                                        <td className="p-4">{record.nationalId}</td>
                                        <td className="p-4">{new Date(record.disbursementDate).toLocaleDateString('ar-EG', { numberingSystem: 'latn' })}</td>
                                        <td className="p-4 font-semibold text-gray-700" dir="ltr">{formatCurrency(record.amount, record.currency)}</td>
                                        <td className="p-4">{record.method}</td>
                                        <td className="p-4">{record.phone || '-'}</td>
                                        <td className="p-4">
                                            <button onClick={() => handleEditRecord(record)} className="text-blue-600 hover:underline ml-4">تعديل</button>
                                            <button onClick={() => handleDeleteConfirmation('record', record.id, activeSheet.id)} className="text-red-600 hover:underline">حذف</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {activeSheet.records.length === 0 && (
                             <p className="text-center text-gray-500 py-8">لا يوجد مستفيدون في هذا الكشف بعد. ابدأ بإضافة مستفيد.</p>
                        )}
                    </div>
                </div>
            ) : (
                 <div className="text-center bg-white p-12 rounded-xl shadow-md">
                    <AidIcon className="w-16 h-16 mx-auto text-gray-300" />
                    <h2 className="mt-4 text-xl font-semibold text-gray-700">لم يتم تحديد كشف</h2>
                    <p className="mt-2 text-gray-500">الرجاء إنشاء كشف جديد أو اختيار واحد من القائمة لعرض بيانات المستفيدين.</p>
                 </div>
            )}
        </div>
    );
};


const ReportsPage: React.FC<{ 
    transactions: Transaction[],
    budgets: Budget[],
    projects: Project[],
    onSaveBudgets: (budgets: Budget[]) => void,
    onExport: () => void,
    onViewReceipt: (image: string) => void,
    onEditTransaction: (tx: Transaction) => void,
    onDeleteTransaction: (tx: Transaction) => void,
}> = ({ transactions, budgets, projects, onSaveBudgets, onExport, onViewReceipt, onEditTransaction, onDeleteTransaction }) => {
    const [activeTab, setActiveTab] = useState<'main' | 'budget'>('main');
    const [monthlyBudgets, setMonthlyBudgets] = useState<Record<ExpenseCategory, string>>(() => {
        const initial = {} as Record<ExpenseCategory, string>;
        Object.values(ExpenseCategory).forEach(cat => {
            const existing = budgets.find(b => b.category === cat);
            initial[cat] = existing ? String(existing.amount) : '';
        });
        return initial;
    });
    
    // State for interactive report
    const [reportFilters, setReportFilters] = useState({
        dateFrom: '',
        dateTo: '',
        type: 'all', // 'all', 'REVENUE', 'EXPENSE'
        categories: [] as string[],
    });
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [reportGenerated, setReportGenerated] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const categoryDropdownRef = useRef<HTMLDivElement>(null);
    const ITEMS_PER_PAGE = 10;
    
    const allCategories = useMemo(() => [...Object.values(RevenueCategory), ...Object.values(ExpenseCategory)], []);
    
    // Close category dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setReportFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCategoryChange = (category: string) => {
        setReportFilters(prev => {
            const newCategories = prev.categories.includes(category)
                ? prev.categories.filter(c => c !== category)
                : [...prev.categories, category];
            return { ...prev, categories: newCategories };
        });
    };

    const resetFilters = () => {
        setReportFilters({ dateFrom: '', dateTo: '', type: 'all', categories: [] });
        setReportGenerated(false);
        setCurrentPage(1);
    };
    
    const handleGenerateReport = () => {
        setReportGenerated(true);
        setCurrentPage(1);
    }
    
    const filteredTransactionsForReport = useMemo(() => {
        return transactions.filter(t => {
            if (reportFilters.dateFrom && t.date < reportFilters.dateFrom) return false;
            if (reportFilters.dateTo && t.date > reportFilters.dateTo) return false;
            if (reportFilters.type !== 'all' && t.type !== reportFilters.type) return false;
            if (reportFilters.categories.length > 0 && !reportFilters.categories.includes(t.category)) return false;
            return true;
        });
    }, [transactions, reportFilters]);
    
    const reportSummary = useMemo(() => {
        const rate = dataService.getSettings().usdToEgpRate;
        return filteredTransactionsForReport.reduce((acc, t) => {
            const txRate = (t.type === TransactionType.EXPENSE && t.exchangeRate) ? t.exchangeRate : rate;
            const amountInUSD = t.currency === Currency.EGP ? t.amount / txRate : t.amount;
            if (t.type === TransactionType.REVENUE) {
                acc.totalRevenuesUSD += amountInUSD;
            } else {
                acc.totalExpensesUSD += amountInUSD;
            }
            return acc;
        }, { totalRevenuesUSD: 0, totalExpensesUSD: 0 });
    }, [filteredTransactionsForReport]);

    const paginatedReportTxs = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTransactionsForReport.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredTransactionsForReport, currentPage]);
    const totalPages = Math.ceil(filteredTransactionsForReport.length / ITEMS_PER_PAGE);
    
    const handleExportFilteredReport = () => {
        if (filteredTransactionsForReport.length > 0) {
            exportDetailedTransactionReport(filteredTransactionsForReport);
        } else {
            alert('لا توجد بيانات لتصديرها.');
        }
    };
    
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    
    const handleSaveBudgets = () => {
        const newBudgets: Budget[] = Object.entries(monthlyBudgets)
            .filter(([, amount]) => amount && parseFloat(amount) > 0)
            .map(([category, amount]) => ({
                category: category as ExpenseCategory,
                amount: parseFloat(amount),
                currency: Currency.USD
            }));
        onSaveBudgets(newBudgets);
    };

    const handleExportProjectReport = () => {
        const project = projects.find(p => p.id === selectedProjectId);
        if (!project) {
            alert('الرجاء اختيار مشروع صحيح.');
            return;
        }
        const projectTransactions = transactions.filter(t => t.projectId === selectedProjectId);
        if (projectTransactions.length === 0) {
            alert('لا توجد معاملات مرتبطة بهذا المشروع.');
            return;
        }
        exportProjectReportToExcel(project, projectTransactions, dataService.getSettings());
    };

    const budgetVsActualData = useMemo(() => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const monthlyExpenses = transactions.filter(t => 
            t.type === TransactionType.EXPENSE && 
            new Date(t.date) >= startOfMonth &&
            new Date(t.date) <= endOfMonth
        );

        const actualSpending = monthlyExpenses.reduce((acc, t) => {
            const rate = t.exchangeRate || dataService.getSettings().usdToEgpRate;
            const amountUSD = t.currency === Currency.EGP ? t.amount / rate : t.amount;
            acc[t.category] = (acc[t.category] || 0) + amountUSD;
            return acc;
        }, {} as Record<string, number>);

        return Object.values(ExpenseCategory).map(category => {
            const budgetAmount = parseFloat(monthlyBudgets[category] || '0');
            const actualAmount = actualSpending[category] || 0;
            const remaining = budgetAmount - actualAmount;
            const percentage = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;
            return {
                category,
                budget: budgetAmount,
                actual: actualAmount,
                remaining,
                percentage: Math.min(percentage, 100) // Cap at 100 for visual
            };
        });
    }, [transactions, monthlyBudgets]);

    const expenseDistributionData = useMemo(() => {
        const expenseByCategory = filteredTransactionsForReport
            .filter(t => t.type === TransactionType.EXPENSE)
            .reduce((acc, t) => {
                const rate = t.exchangeRate || dataService.getSettings().usdToEgpRate;
                const amountUSD = t.currency === Currency.EGP ? t.amount / rate : t.amount;
                acc[t.category] = (acc[t.category] || 0) + amountUSD;
                return acc;
            }, {} as Record<string, number>);
        return Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));
    }, [filteredTransactionsForReport]);
    const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">التقارير والميزانية</h1>
            
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('main')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'main' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        التقارير العامة
                    </button>
                    <button onClick={() => setActiveTab('budget')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'budget' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        إدارة الميزانية
                    </button>
                </nav>
            </div>
            
            {activeTab === 'main' && (
                <div className="space-y-8">
                    {/* Interactive Report Section */}
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-bold mb-4 flex items-center"><FilterIcon className="w-6 h-6 ml-2 text-gray-500" />مستكشف التقارير التفاعلي</h2>
                        {/* Filters */}
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">من تاريخ</label>
                                    <input type="date" name="dateFrom" value={reportFilters.dateFrom} onChange={handleFilterChange} className="mt-1 w-full p-2 border rounded-md"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">إلى تاريخ</label>
                                    <input type="date" name="dateTo" value={reportFilters.dateTo} onChange={handleFilterChange} className="mt-1 w-full p-2 border rounded-md"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">نوع المعاملة</label>
                                    <select name="type" value={reportFilters.type} onChange={handleFilterChange} className="mt-1 w-full p-2 border rounded-md">
                                        <option value="all">الكل</option>
                                        <option value={TransactionType.REVENUE}>إيرادات فقط</option>
                                        <option value={TransactionType.EXPENSE}>مصروفات فقط</option>
                                    </select>
                                </div>
                                <div className="relative" ref={categoryDropdownRef}>
                                    <label className="block text-sm font-medium text-gray-700">الفئات</label>
                                    <button onClick={() => setIsCategoryDropdownOpen(o => !o)} className="mt-1 w-full p-2 border rounded-md bg-white text-right">
                                        {reportFilters.categories.length > 0 ? `${reportFilters.categories.length} فئات مختارة` : 'كل الفئات'}
                                    </button>
                                    {isCategoryDropdownOpen && (
                                        <div className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {allCategories.map(cat => (
                                                <label key={cat} className="flex items-center p-2 text-sm hover:bg-gray-100 cursor-pointer">
                                                    <input type="checkbox" checked={reportFilters.categories.includes(cat)} onChange={() => handleCategoryChange(cat)} className="ml-2"/>
                                                    {cat}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end gap-2">
                                <button onClick={resetFilters} className="py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700">إعادة تعيين</button>
                                <button onClick={handleGenerateReport} className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">إنشاء التقرير</button>
                            </div>
                        </div>

                        {/* Results */}
                        {reportGenerated && (
                            <div className="mt-6">
                                {filteredTransactionsForReport.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">لا توجد معاملات تطابق معايير البحث.</p>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                          <h3 className="text-lg font-bold">نتائج التقرير</h3>
                                          <button onClick={handleExportFilteredReport} className="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center gap-2">
                                            <ExportIcon className="w-4 h-4" />
                                            تصدير العرض الحالي
                                          </button>
                                        </div>
                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <StatCard title="إجمالي الإيرادات" value={formatCurrency(reportSummary.totalRevenuesUSD)} icon={<RevenuesIcon className="w-6 h-6"/>} />
                                            <StatCard title="إجمالي المصروفات" value={formatCurrency(reportSummary.totalExpensesUSD)} icon={<ExpensesIcon className="w-6 h-6"/>} />
                                            <StatCard title="صافي الرصيد" value={formatCurrency(reportSummary.totalRevenuesUSD - reportSummary.totalExpensesUSD)} icon={<DashboardIcon className="w-6 h-6"/>} />
                                        </div>
                                        {/* Charts */}
                                        {expenseDistributionData.length > 0 && reportFilters.type !== 'REVENUE' && (
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <h4 className="text-md font-bold mb-2">توزيع المصروفات (USD)</h4>
                                                <ResponsiveContainer width="100%" height={250}>
                                                    <PieChart>
                                                        <Pie data={expenseDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                                                          {expenseDistributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                        </Pie>
                                                        <Tooltip formatter={(value: number) => [formatCurrency(value), "المبلغ"]} />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                        {/* Table */}
                                        <div>
                                            <h4 className="text-md font-bold mb-2">قائمة المعاملات</h4>
                                            <div className="overflow-x-auto border rounded-lg">
                                                <table className="w-full text-right bg-white">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            <th className="p-3 font-semibold text-sm">التاريخ</th>
                                                            <th className="p-3 font-semibold text-sm">البيان</th>
                                                            <th className="p-3 font-semibold text-sm">الفئة</th>
                                                            <th className="p-3 font-semibold text-sm">النوع</th>
                                                            <th className="p-3 font-semibold text-sm">المبلغ</th>
                                                            <th className="p-3 font-semibold text-sm">إجراءات</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {paginatedReportTxs.map(tx => (
                                                            <tr key={tx.id} className="border-t hover:bg-gray-50">
                                                                <td className="p-3 text-sm">{tx.date}</td>
                                                                <td className="p-3 text-sm">{tx.description}</td>
                                                                <td className="p-3 text-sm">{tx.category}</td>
                                                                <td className="p-3 text-sm"><span className={`px-2 py-1 rounded-full text-xs ${tx.type === TransactionType.REVENUE ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{tx.type === TransactionType.REVENUE ? 'إيراد' : 'مصروف'}</span></td>
                                                                <td className="p-3 text-sm font-semibold" dir="ltr">{formatCurrency(tx.amount, tx.currency)}</td>
                                                                <td className="p-3 text-sm">
                                                                    <button onClick={() => onEditTransaction(tx)} className="text-blue-600 hover:underline ml-3">تعديل</button>
                                                                    <button onClick={() => onDeleteTransaction(tx)} className="text-red-600 hover:underline">حذف</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {totalPages > 1 && (
                                                <div className="flex justify-center items-center mt-4">
                                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 mx-1 bg-white border rounded-md disabled:opacity-50 text-sm">السابق</button>
                                                    <span className="mx-2 text-sm">صفحة {currentPage} من {totalPages}</span>
                                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 mx-1 bg-white border rounded-md disabled:opacity-50 text-sm">التالي</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                     {/* Other Reports */}
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-bold mb-4">التقارير المتخصصة</h2>
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-gray-800">التقرير المالي الشامل</h3>
                                <p className="text-gray-600 text-sm mt-1 mb-3">يقوم هذا التقرير بإنشاء ملف Excel شامل يحتوي على لوحة مالية موحدة (USD)، وتفاصيل الإيرادات والمصروفات، وجميع كشوفات المساعدات في ملف واحد.</p>
                                <button onClick={onExport} className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm">تصدير التقرير الشامل (Excel)</button>
                            </div>
                             <div className="border-t pt-6">
                                <h3 className="font-semibold text-gray-800">تقارير المشاريع</h3>
                                <div className="flex items-end gap-4 mt-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">اختر المشروع</label>
                                        <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="p-2 border rounded-md min-w-[250px] text-sm">
                                            <option value="" disabled>-- حدد مشروع --</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={handleExportProjectReport} disabled={!selectedProjectId} className="py-2 px-4 bg-teal-600 text-white rounded-md hover:bg-teal-700 h-10 disabled:opacity-50 text-sm">تصدير تقرير المشروع</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'budget' && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Budget setup */}
                     <div className="bg-white p-6 rounded-xl shadow-md">
                         <h2 className="text-xl font-bold mb-4">إعداد الميزانية الشهرية (USD)</h2>
                         <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                             {Object.values(ExpenseCategory).map(category => (
                                 <div key={category}>
                                     <label className="block text-sm font-medium text-gray-700">{category}</label>
                                     <input
                                         type="number"
                                         placeholder="0.00"
                                         value={monthlyBudgets[category]}
                                         onChange={e => setMonthlyBudgets(prev => ({ ...prev, [category]: e.target.value }))}
                                         className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                     />
                                 </div>
                             ))}
                         </div>
                         <button onClick={handleSaveBudgets} className="w-full mt-6 py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">حفظ الميزانية</button>
                     </div>
                     {/* Budget vs Actual Report */}
                     <div className="bg-white p-6 rounded-xl shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">الميزانية مقابل الإنفاق الفعلي (هذا الشهر)</h2>
                            <button onClick={() => exportBudgetReportToExcel(budgetVsActualData)} className="py-1 px-3 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded-md">تصدير</button>
                        </div>
                         <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
                            {budgetVsActualData.map(item => (
                                <div key={item.category}>
                                    <div className="flex justify-between mb-1 text-sm">
                                        <span className="font-medium text-gray-700">{item.category}</span>
                                        <span className="text-gray-500">{formatCurrency(item.actual)} / {formatCurrency(item.budget)}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${item.percentage}%` }}></div>
                                    </div>
                                </div>
                            ))}
                         </div>
                     </div>
                 </div>
            )}
        </div>
    );
};

const SettingsPage: React.FC<{
  settings: AppSettings,
  onSaveSettings: (settings: AppSettings) => void
}> = ({ settings, onSaveSettings }) => {
    const [page, setPage] = useState<'users' | 'sources' | 'main'>('main');
    const [currentRate, setCurrentRate] = useState(String(settings.usdToEgpRate));
    
    // This is a proxy component to reuse existing page components under a unified settings page
    const [users, setUsers] = useState<User[]>(dataService.getUsers);
    const [revenueSources, setRevenueSources] = useState<RevenueSource[]>(dataService.getRevenueSources);
    
    // Modals state...
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
    const [sourceToEdit, setSourceToEdit] = useState<RevenueSource | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'user' | 'source', data: any } | null>(null);

    const handleSaveSettings = () => {
        const rate = parseFloat(currentRate);
        if(!isNaN(rate) && rate > 0) {
            onSaveSettings({ usdToEgpRate: rate });
        } else {
            alert("الرجاء إدخال سعر صرف صحيح.");
        }
    };

    // User handlers
    const handleSaveUser = (user: Omit<User, 'id'> | User) => {
        const updatedUsers = [...users];
        if ('id' in user && user.id) {
            const index = updatedUsers.findIndex(u => u.id === user.id);
            if (index > -1) updatedUsers[index] = user as User;
        } else {
             const newUser: User = { ...user, id: `u${Date.now()}` };
             updatedUsers.push(newUser);
        }
        setUsers(updatedUsers);
        dataService.saveUsers(updatedUsers);
    };
    const handleDeleteUser = (user: User) => {
        const updated = users.filter(u => u.id !== user.id);
        setUsers(updated);
        dataService.saveUsers(updated);
        setDeleteConfirmation(null);
    };

    // Source handlers
    const handleSaveSource = (source: Omit<RevenueSource, 'id'> | RevenueSource) => {
        const updatedSources = [...revenueSources];
        if ('id' in source && source.id) {
            const index = updatedSources.findIndex(s => s.id === source.id);
            if (index > -1) updatedSources[index] = source as RevenueSource;
        } else {
             const newSource: RevenueSource = { ...source, id: `rs${Date.now()}` };
             updatedSources.push(newSource);
        }
        setRevenueSources(updatedSources);
        dataService.saveRevenueSources(updatedSources);
    };
    const handleDeleteSource = (source: RevenueSource) => {
        const updated = revenueSources.filter(s => s.id !== source.id);
        setRevenueSources(updated);
        dataService.saveRevenueSources(updated);
        setDeleteConfirmation(null);
    };

    return (
        <div className="p-8">
             <AddEditUserModal 
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                onSave={handleSaveUser}
                userToEdit={userToEdit}
            />
             <AddEditRevenueSourceModal
                isOpen={isSourceModalOpen}
                onClose={() => setIsSourceModalOpen(false)}
                onSave={handleSaveSource}
                sourceToEdit={sourceToEdit}
            />
             <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={() => {
                    if(deleteConfirmation?.type === 'user') handleDeleteUser(deleteConfirmation.data);
                    else if(deleteConfirmation?.type === 'source') handleDeleteSource(deleteConfirmation.data);
                }}
                title={`تأكيد حذف ${deleteConfirmation?.type === 'user' ? 'المستخدم' : 'المصدر'}`}
                message={`هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.`}
            />

            <h1 className="text-3xl font-bold mb-6">الإعدادات</h1>
            
            <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                <h2 className="text-xl font-bold mb-2">سعر الصرف</h2>
                <p className="text-gray-600 mb-4">حدد سعر صرف الدولار الأمريكي مقابل الجنيه المصري المستخدم في التقارير الموحدة.</p>
                <div className="flex items-center gap-4">
                    <span className="text-gray-700 font-medium">1 USD =</span>
                    <input 
                        type="number" 
                        value={currentRate}
                        onChange={e => setCurrentRate(e.target.value)}
                        step="0.01"
                        className="p-2 border rounded-md w-40"
                    />
                    <span className="text-gray-700 font-medium">EGP</span>
                    <button onClick={handleSaveSettings} className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">حفظ السعر</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-md">
                     <UsersPage 
                        users={users}
                        onAddUser={() => { setUserToEdit(null); setIsUserModalOpen(true); }}
                        onEditUser={(user) => { setUserToEdit(user); setIsUserModalOpen(true); }}
                        onDeleteUser={(user) => setDeleteConfirmation({ type: 'user', data: user })}
                     />
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <RevenueSourcesPage
                        sources={revenueSources}
                        onAddSource={() => { setSourceToEdit(null); setIsSourceModalOpen(true); }}
                        onEditSource={(source) => { setSourceToEdit(source); setIsSourceModalOpen(true); }}
                        onDeleteSource={(source) => setDeleteConfirmation({ type: 'source', data: source })}
                    />
                </div>
            </div>
        </div>
    );
};

const ProjectsPage: React.FC<{
  projects: Project[];
  onSaveProject: (project: Omit<Project, 'id'> | Project) => void;
  onDeleteProject: (project: Project) => void;
}> = ({ projects, onSaveProject, onDeleteProject }) => {
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<Project | null>(null);

    const handleAdd = () => {
        setProjectToEdit(null);
        setIsProjectModalOpen(true);
    };

    const handleEdit = (project: Project) => {
        setProjectToEdit(project);
        setIsProjectModalOpen(true);
    };
    
    return (
        <div className="p-8">
             <AddEditProjectModal
                isOpen={isProjectModalOpen}
                onClose={() => setIsProjectModalOpen(false)}
                onSave={onSaveProject}
                projectToEdit={projectToEdit}
            />
             <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={() => {
                    if (deleteConfirmation) onDeleteProject(deleteConfirmation);
                }}
                title="تأكيد حذف المشروع"
                message="هل أنت متأكد من رغبتك في حذف هذا المشروع؟ سيتم فك ارتباط جميع المعاملات به."
            />

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">إدارة المشاريع</h1>
                <button onClick={handleAdd} className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">إضافة مشروع</button>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                 <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-4 font-semibold">اسم المشروع</th>
                            <th className="p-4 font-semibold">الوصف</th>
                            <th className="p-4 font-semibold">الميزانية (USD)</th>
                            <th className="p-4 font-semibold">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.map(project => (
                            <tr key={project.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-bold">{project.name}</td>
                                <td className="p-4 text-gray-600">{project.description}</td>
                                <td className="p-4" dir="ltr">{formatCurrency(project.budget, Currency.USD)}</td>
                                <td className="p-4">
                                    <button onClick={() => handleEdit(project)} className="text-blue-600 hover:underline ml-4">تعديل</button>
                                    <button onClick={() => setDeleteConfirmation(project)} className="text-red-600 hover:underline">حذف</button>
                                </td>
                            </tr>
                        ))}
                         {projects.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center p-8 text-gray-500">لا توجد مشاريع معرفة. ابدأ بإضافة مشروع جديد.</td>
                            </tr>
                        )}
                    </tbody>
                 </table>
            </div>
        </div>
    );
};

const CustodyPage: React.FC<{
  custodyItems: CustodyItem[];
  onAdd: () => void;
  onEdit: (item: CustodyItem) => void;
  onDelete: (item: CustodyItem) => void;
}> = ({ custodyItems, onAdd, onEdit, onDelete }) => {
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">إدارة العهد</h1>
                <button onClick={onAdd} className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">إضافة عهدة</button>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                 <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-4 font-semibold">اسم العهدة</th>
                            <th className="p-4 font-semibold">المستلم</th>
                            <th className="p-4 font-semibold">تاريخ الاستلام</th>
                            <th className="p-4 font-semibold">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {custodyItems.map(item => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                                <td className="p-4">{item.itemName}</td>
                                <td className="p-4">{item.custodianName}</td>
                                <td className="p-4">{new Date(item.receivedDate).toLocaleDateString('ar-EG', { numberingSystem: 'latn' })}</td>
                                <td className="p-4">
                                    <button onClick={() => onEdit(item)} className="text-blue-600 hover:underline ml-4">تعديل</button>
                                    <button onClick={() => onDelete(item)} className="text-red-600 hover:underline">حذف</button>
                                </td>
                            </tr>
                        ))}
                         {custodyItems.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center p-8 text-gray-500">لا توجد عهد مسجلة حالياً.</td>
                            </tr>
                        )}
                    </tbody>
                 </table>
            </div>
        </div>
    );
};

const NotesPage: React.FC<{
    initialNotes: string;
    onSave: (notes: string) => void;
}> = ({ initialNotes, onSave }) => {
    const [currentNotes, setCurrentNotes] = useState(initialNotes);

    const handleSaveClick = () => {
        onSave(currentNotes);
    };

    return (
        <div className="p-8 h-full flex flex-col">
            <h1 className="text-3xl font-bold mb-6">الملاحظات</h1>
            <div className="bg-white p-6 rounded-xl shadow-md flex-grow flex flex-col">
                <textarea
                    value={currentNotes}
                    onChange={(e) => setCurrentNotes(e.target.value)}
                    className="w-full h-full p-4 border rounded-md resize-none flex-grow focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="اكتب ملاحظاتك هنا..."
                />
                <div className="mt-4 flex justify-end">
                    <button onClick={handleSaveClick} className="py-2 px-6 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                        حفظ الملاحظات
                    </button>
                </div>
            </div>
        </div>
    );
};

const DebtsPage: React.FC<{
  debts: DebtItem[];
  onAdd: () => void;
  onEdit: (item: DebtItem) => void;
  onDelete: (item: DebtItem) => void;
  onExport: () => void;
}> = ({ debts, onAdd, onEdit, onDelete, onExport }) => {
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">إدارة الديون</h1>
                 <div className="flex items-center gap-2">
                     <button onClick={onExport} className="py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2">
                        <ExportIcon className="w-5 h-5"/>
                        <span>تصدير كشف الديون</span>
                    </button>
                    <button onClick={onAdd} className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                        إضافة دين جديد
                    </button>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-4 font-semibold">تاريخ الاستحقاق</th>
                            <th className="p-4 font-semibold">اسم الدائن</th>
                            <th className="p-4 font-semibold">البيان</th>
                            <th className="p-4 font-semibold">المبلغ</th>
                            <th className="p-4 font-semibold">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {debts.map(debt => (
                            <tr key={debt.id} className="border-b hover:bg-gray-50">
                                <td className="p-4">{new Date(debt.date).toLocaleDateString('ar-EG', { numberingSystem: 'latn' })}</td>
                                <td className="p-4">{debt.creditorName}</td>
                                <td className="p-4">{debt.description}</td>
                                <td className="p-4 font-semibold" dir="ltr">
                                    {formatCurrency(debt.amount, debt.currency)}
                                </td>
                                <td className="p-4">
                                    <button onClick={() => onEdit(debt)} className="text-blue-600 hover:underline ml-4">تعديل</button>
                                    <button onClick={() => onDelete(debt)} className="text-red-600 hover:underline">حذف</button>
                                </td>
                            </tr>
                        ))}
                         {debts.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center p-8 text-gray-500">لا توجد ديون مسجلة.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const App = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(dataService.getUsers()[0]); // Default to first user for dev
    const [page, setPage] = useState<Page>('dashboard');
    const [transactions, setTransactions] = useState<Transaction[]>(dataService.getTransactions);
    const [revenueSources, setRevenueSources] = useState<RevenueSource[]>(dataService.getRevenueSources);
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>(dataService.getRecurringExpenses);
    const [disbursementSheets, setDisbursementSheets] = useState<DisbursementSheet[]>(dataService.getDisbursementSheets);
    const [settings, setSettings] = useState<AppSettings>(dataService.getSettings);
    const [budgets, setBudgets] = useState<Budget[]>(dataService.getBudgets);
    const [projects, setProjects] = useState<Project[]>(dataService.getProjects);
    const [custodyItems, setCustodyItems] = useState<CustodyItem[]>(dataService.getCustodyItems);
    const [notes, setNotes] = useState<string>(dataService.getNotes);
    const [debts, setDebts] = useState<DebtItem[]>(dataService.getDebts);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
    const [newTransactionType, setNewTransactionType] = useState<TransactionType>(TransactionType.REVENUE);
    const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
    const [rewardToEdit, setRewardToEdit] = useState<Transaction | null>(null);
    const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
    const [recurringToEdit, setRecurringToEdit] = useState<RecurringExpense | null>(null);
    const [isCustodyModalOpen, setIsCustodyModalOpen] = useState(false);
    const [custodyItemToEdit, setCustodyItemToEdit] = useState<CustodyItem | null>(null);
    const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
    const [debtToEdit, setDebtToEdit] = useState<DebtItem | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<any>(null); // For any type of deletion
    const [imageToView, setImageToView] = useState<string | null>(null);
    const [reminders, setReminders] = useState<ReminderInfo | null>(null);

    const [isExporting, setIsExporting] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);


    const addToast = (message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };


    const unifiedUSDBalances = useMemo(() => {
        const rate = settings.usdToEgpRate;
        const balances = transactions.reduce((acc, t) => {
            const txRate = (t.type === TransactionType.EXPENSE && t.exchangeRate) ? t.exchangeRate : rate;
            const amountInUSD = t.currency === Currency.EGP ? t.amount / txRate : t.amount;
            if (t.type === TransactionType.REVENUE) {
                acc.totalRevenuesUSD += amountInUSD;
            } else {
                acc.totalExpensesUSD += amountInUSD;
            }
            return acc;
        }, { totalRevenuesUSD: 0, totalExpensesUSD: 0 });

        return {
            ...balances,
            currentBalanceUSD: balances.totalRevenuesUSD - balances.totalExpensesUSD
        };
    }, [transactions, settings.usdToEgpRate]);


    const calculateNextDueDate = (startDate: string, frequency: Frequency): string => {
        const date = new Date(startDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        while (date < now) {
            if (frequency === Frequency.MONTHLY) {
                date.setMonth(date.getMonth() + 1);
            } else if (frequency === Frequency.YEARLY) {
                date.setFullYear(date.getFullYear() + 1);
            }
        }
        return date.toISOString().split('T')[0];
    };
    
    // Process recurring expenses on load
    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const expensesToUpdate = [...recurringExpenses];
        const newTransactions: Transaction[] = [];
        const upcomingReminders: RecurringExpense[] = [];
        let updated = false;

        expensesToUpdate.forEach(expense => {
            let nextDueDate = new Date(expense.nextDueDate);
            
            // Check for overdue expenses
            while (nextDueDate < today) {
                updated = true;
                const newTx: Transaction = {
                    id: `tx-re-${Date.now()}-${Math.random()}`,
                    type: TransactionType.EXPENSE,
                    amount: expense.amount,
                    currency: expense.currency,
                    date: nextDueDate.toISOString().split('T')[0],
                    description: `${expense.description} (دوري)`,
                    category: expense.category,
                };
                newTransactions.push(newTx);
                
                // Calculate the next due date from the last due date
                if (expense.frequency === Frequency.MONTHLY) {
                    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                } else if (expense.frequency === Frequency.YEARLY) {
                    nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
                }
                expense.nextDueDate = nextDueDate.toISOString().split('T')[0];
            }
            
            // Check for upcoming expenses (due tomorrow)
            if (nextDueDate.getTime() === tomorrow.getTime()) {
                upcomingReminders.push(expense);
            }
        });

        if (updated) {
            setRecurringExpenses(expensesToUpdate);
            dataService.saveRecurringExpenses(expensesToUpdate);
            
            const allTransactions = [...transactions, ...newTransactions];
            setTransactions(allTransactions);
            dataService.saveTransactions(allTransactions);
        }

        if (newTransactions.length > 0 || upcomingReminders.length > 0) {
            setReminders({ generated: newTransactions, upcoming: upcomingReminders });
        }

    }, []); // Run only on initial load

    const handleLogin = (username: string, pass: string): boolean => {
        const users = dataService.getUsers();
        const user = users.find(u => u.username === username && u.password === pass);
        if (user) {
            setCurrentUser(user);
            return true;
        }
        return false;
    };
    const handleLogout = () => {
        setCurrentUser(null);
    };

    const saveTransaction = (transaction: Omit<Transaction, 'id'> | Transaction) => {
        const updatedTransactions = [...transactions];
        if ('id' in transaction && transaction.id) {
            // Editing existing
            const index = updatedTransactions.findIndex(t => t.id === transaction.id);
            if (index > -1) {
                const existingTx = updatedTransactions[index];
                const updatedTx = { ...existingTx, ...transaction };

                if (updatedTx.type === TransactionType.EXPENSE && updatedTx.currency === Currency.EGP) {
                    // If a specific rate wasn't passed from the modal (i.e., user cleared it),
                    // it means "use the current global rate". The modal ensures `transaction.exchangeRate` is undefined in this case.
                    if (transaction.exchangeRate === undefined) {
                        updatedTx.exchangeRate = settings.usdToEgpRate;
                    }
                } else {
                    // Not an EGP expense, so remove any lingering rate.
                    delete updatedTx.exchangeRate;
                }
                updatedTransactions[index] = updatedTx;
            }
            addToast('تم تحديث المعاملة بنجاح.');
        } else {
            // Adding new
            const newTransaction: Transaction = {
                 ...transaction,
                 id: `tx${Date.now()}`
            };

            // Set the current exchange rate for new EGP expenses
            if (newTransaction.type === TransactionType.EXPENSE && newTransaction.currency === Currency.EGP) {
                newTransaction.exchangeRate = settings.usdToEgpRate;
            }

            updatedTransactions.push(newTransaction as Transaction);
            addToast('تمت إضافة المعاملة بنجاح.');
        }
        // Sort transactions after every save to maintain order
        const sortedTransactions = updatedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(sortedTransactions);
        dataService.saveTransactions(sortedTransactions);
    };

    const deleteTransaction = (transaction: Transaction) => {
        const updated = transactions.filter(t => t.id !== transaction.id);
        setTransactions(updated);
        dataService.saveTransactions(updated);
        setDeleteConfirmation(null);
        addToast('تم حذف المعاملة.', 'error');
    };
    
    const saveRecurringExpense = (expense: Omit<RecurringExpense, 'id' | 'nextDueDate'> | RecurringExpense) => {
        const updatedExpenses = [...recurringExpenses];
        if ('id' in expense && expense.id) {
             const index = updatedExpenses.findIndex(e => e.id === expense.id);
             if (index > -1) {
                updatedExpenses[index] = { ...expense, nextDueDate: calculateNextDueDate(expense.startDate, expense.frequency) } as RecurringExpense;
             }
             addToast('تم تحديث المصروف الدوري.');
        } else {
            const newExpense: RecurringExpense = {
                ...expense,
                id: `re${Date.now()}`,
                nextDueDate: calculateNextDueDate(expense.startDate, expense.frequency)
            };
            updatedExpenses.push(newExpense);
            addToast('تم إضافة مصروف دوري جديد.');
        }
        setRecurringExpenses(updatedExpenses);
        dataService.saveRecurringExpenses(updatedExpenses);
    };

    const deleteRecurringExpense = (expense: RecurringExpense) => {
        const updated = recurringExpenses.filter(e => e.id !== expense.id);
        setRecurringExpenses(updated);
        dataService.saveRecurringExpenses(updated);
        setDeleteConfirmation(null);
        addToast('تم حذف المصروف الدوري.', 'error');
    };

    const handleSaveDisbursementSheet = (sheet: Omit<DisbursementSheet, 'id' | 'createdAt' | 'records'> | DisbursementSheet): string | undefined => {
        const updatedSheets = [...disbursementSheets];
        let newId;
        if ('id' in sheet && sheet.id) {
            const index = updatedSheets.findIndex(s => s.id === sheet.id);
            if (index > -1) updatedSheets[index] = sheet as DisbursementSheet;
             addToast('تم تحديث اسم الكشف.');
        } else {
             const newSheet: DisbursementSheet = {
                 ...sheet,
                 id: `ds${Date.now()}`,
                 createdAt: new Date().toISOString(),
                 records: [],
             };
             updatedSheets.push(newSheet);
             newId = newSheet.id;
             addToast('تم إنشاء كشف جديد.');
        }
        setDisbursementSheets(updatedSheets);
        dataService.saveDisbursementSheets(updatedSheets);
        return newId;
    };

    const handleDeleteDisbursementSheet = (sheetId: string) => {
        const updated = disbursementSheets.filter(s => s.id !== sheetId);
        setDisbursementSheets(updated);
        dataService.saveDisbursementSheets(updated);
        addToast('تم حذف الكشف.', 'error');
    };
    
    const handleSaveDisbursementRecord = (sheetId: string, record: Omit<DisbursementRecord, 'id'> | DisbursementRecord) => {
        const updatedSheets = [...disbursementSheets];
        const sheetIndex = updatedSheets.findIndex(s => s.id === sheetId);
        if (sheetIndex === -1) return;
        
        const sheet = updatedSheets[sheetIndex];
        const records = [...sheet.records];

        if ('id' in record && record.id) {
            const recordIndex = records.findIndex(r => r.id === record.id);
            if(recordIndex > -1) records[recordIndex] = record as DisbursementRecord;
            addToast('تم تحديث بيانات المستفيد.');
        } else {
            const newRecord: DisbursementRecord = { ...record, id: `dr${Date.now()}` };
            records.push(newRecord);
            addToast('تمت إضافة مستفيد جديد.');
        }
        
        updatedSheets[sheetIndex] = { ...sheet, records };
        setDisbursementSheets(updatedSheets);
        dataService.saveDisbursementSheets(updatedSheets);
    };

    const handleDeleteDisbursementRecord = (sheetId: string, recordId: string) => {
         const updatedSheets = [...disbursementSheets];
        const sheetIndex = updatedSheets.findIndex(s => s.id === sheetId);
        if (sheetIndex === -1) return;
        
        const sheet = updatedSheets[sheetIndex];
        const records = sheet.records.filter(r => r.id !== recordId);

        updatedSheets[sheetIndex] = { ...sheet, records };
        setDisbursementSheets(updatedSheets);
        dataService.saveDisbursementSheets(updatedSheets);
        addToast('تم حذف المستفيد.', 'error');
    };
    
    const handleSaveSettings = (newSettings: AppSettings) => {
        setSettings(newSettings);
        dataService.saveSettings(newSettings);
        addToast('تم حفظ الإعدادات بنجاح.');
    };
    
    const handleSaveBudgets = (newBudgets: Budget[]) => {
        setBudgets(newBudgets);
        dataService.saveBudgets(newBudgets);
        addToast('تم حفظ الميزانية بنجاح.');
    };

    const handleSaveProject = (project: Omit<Project, 'id'> | Project) => {
        const updatedProjects = [...projects];
        if ('id' in project && project.id) {
            const index = updatedProjects.findIndex(p => p.id === project.id);
            if (index > -1) updatedProjects[index] = project as Project;
            addToast('تم تحديث المشروع.');
        } else {
            const newProject: Project = { ...project, id: `proj${Date.now()}` };
            updatedProjects.push(newProject);
            addToast('تم إضافة مشروع جديد.');
        }
        setProjects(updatedProjects);
        dataService.saveProjects(updatedProjects);
    };

    const handleDeleteProject = (project: Project) => {
        // Unlink transactions before deleting
        const updatedTransactions = transactions.map(t => {
            if (t.projectId === project.id) {
                return { ...t, projectId: undefined };
            }
            return t;
        });
        setTransactions(updatedTransactions);
        dataService.saveTransactions(updatedTransactions);

        const updatedProjects = projects.filter(p => p.id !== project.id);
        setProjects(updatedProjects);
        dataService.saveProjects(updatedProjects);
        setDeleteConfirmation(null);
        addToast('تم حذف المشروع.', 'error');
    };

    const handleSaveCustodyItem = (item: Omit<CustodyItem, 'id'> | CustodyItem) => {
        const updatedItems = [...custodyItems];
        if ('id' in item && item.id) {
            const index = updatedItems.findIndex(i => i.id === item.id);
            if (index > -1) updatedItems[index] = item as CustodyItem;
            addToast('تم تحديث العهدة بنجاح.');
        } else {
            const newItem: CustodyItem = { ...item, id: `cust${Date.now()}` };
            updatedItems.push(newItem);
            addToast('تمت إضافة عهدة جديدة.');
        }
        setCustodyItems(updatedItems);
        dataService.saveCustodyItems(updatedItems);
    };

    const handleDeleteCustodyItem = (item: CustodyItem) => {
        const updated = custodyItems.filter(i => i.id !== item.id);
        setCustodyItems(updated);
        dataService.saveCustodyItems(updated);
        setDeleteConfirmation(null);
        addToast('تم حذف العهدة.', 'error');
    };

    const handleSaveNotes = (newNotes: string) => {
        setNotes(newNotes);
        dataService.saveNotes(newNotes);
        addToast('تم حفظ الملاحظات.');
    };

    const handleSaveDebt = (item: Omit<DebtItem, 'id'> | DebtItem) => {
        const updatedItems = [...debts];
        if ('id' in item && item.id) {
            const index = updatedItems.findIndex(i => i.id === item.id);
            if (index > -1) updatedItems[index] = item as DebtItem;
            addToast('تم تحديث الدين بنجاح.');
        } else {
            const newItem: DebtItem = { ...item, id: `debt${Date.now()}` };
            updatedItems.push(newItem);
            addToast('تمت إضافة دين جديد.');
        }
        setDebts(updatedItems);
        dataService.saveDebts(updatedItems);
    };

    const handleDeleteDebt = (item: DebtItem) => {
        const updated = debts.filter(d => d.id !== item.id);
        setDebts(updated);
        dataService.saveDebts(updated);
        setDeleteConfirmation(null);
        addToast('تم حذف الدين.', 'error');
    };


    if (!currentUser) {
        return <LoginPage onLogin={handleLogin} />;
    }

    const rewards = transactions.filter(t => t.category === ExpenseCategory.REWARDS);

    return (
        <div className="flex bg-gray-100 min-h-screen">
            <Sidebar activePage={page} setPage={setPage} currentUser={currentUser} onLogout={handleLogout} />
            <main className="flex-1 overflow-y-auto">
                {page === 'dashboard' && <DashboardPage 
                    transactions={transactions}
                    projects={projects}
                    onAddTransaction={(type) => {
                        setNewTransactionType(type);
                        setTransactionToEdit(null);
                        setIsTransactionModalOpen(true);
                    }}
                    onEditTransaction={(tx) => {
                        setTransactionToEdit(tx);
                        setIsTransactionModalOpen(true);
                    }}
                    onDeleteTransaction={(tx) => setDeleteConfirmation({ type: 'transaction', data: tx })}
                    onViewReceipt={setImageToView}
                    unifiedUSDBalances={unifiedUSDBalances}
                />}
                {page === 'revenues' && <TransactionsPage
                    type={TransactionType.REVENUE}
                    transactions={transactions.filter(t => t.type === TransactionType.REVENUE)}
                    projects={projects}
                    onAdd={() => {
                        setNewTransactionType(TransactionType.REVENUE);
                        setTransactionToEdit(null);
                        setIsTransactionModalOpen(true);
                    }}
                    onEdit={(tx) => {
                        setTransactionToEdit(tx);
                        setIsTransactionModalOpen(true);
                    }}
                    onDelete={(tx) => setDeleteConfirmation({ type: 'transaction', data: tx })}
                    onViewReceipt={setImageToView}
                />}
                {page === 'expenses' && <TransactionsPage
                    type={TransactionType.EXPENSE}
                    transactions={transactions.filter(t => t.type === TransactionType.EXPENSE)}
                    projects={projects}
                    onAdd={() => {
                        setNewTransactionType(TransactionType.EXPENSE);
                        setTransactionToEdit(null);
                        setIsTransactionModalOpen(true);
                    }}
                    onEdit={(tx) => {
                        setTransactionToEdit(tx);
                        setIsTransactionModalOpen(true);
                    }}
                    onDelete={(tx) => setDeleteConfirmation({ type: 'transaction', data: tx })}
                    onViewReceipt={setImageToView}
                />}
                {page === 'rewards' && <RewardsPage 
                    rewards={rewards}
                    onAdd={() => { setRewardToEdit(null); setIsRewardModalOpen(true); }}
                    onEdit={(reward) => { setRewardToEdit(reward); setIsRewardModalOpen(true); }}
                    onDelete={(reward) => setDeleteConfirmation({ type: 'transaction', data: reward })}
                    onExport={() => exportRewardsToExcel(rewards)}
                />}
                {page === 'recurringExpenses' && <RecurringExpensesPage 
                    recurringExpenses={recurringExpenses}
                    onAdd={() => { setRecurringToEdit(null); setIsRecurringModalOpen(true); }}
                    onEdit={(re) => { setRecurringToEdit(re); setIsRecurringModalOpen(true); }}
                    onDelete={(re) => setDeleteConfirmation({ type: 'recurring', data: re })}
                />}
                {page === 'disbursement' && <DisbursementPage 
                    sheets={disbursementSheets}
                    onSaveSheet={handleSaveDisbursementSheet}
                    onDeleteSheet={handleDeleteDisbursementSheet}
                    onSaveRecord={handleSaveDisbursementRecord}
                    onDeleteRecord={handleDeleteDisbursementRecord}
                    onExportSheet={(sheetId) => {
                        const sheet = disbursementSheets.find(s => s.id === sheetId);
                        if(sheet) exportDisbursementSheetToExcel(sheet);
                    }}
                />}
                {page === 'projects' && <ProjectsPage 
                    projects={projects}
                    // FIX: Cannot find name 'setIsProjectModalOpen'. The `ProjectsPage` component manages its own modal state.
                    onSaveProject={(project) => { handleSaveProject(project); }}
                    onDeleteProject={(project) => setDeleteConfirmation({ type: 'project', data: project })}
                />}
                 {page === 'custody' && <CustodyPage 
                    custodyItems={custodyItems}
                    onAdd={() => { setCustodyItemToEdit(null); setIsCustodyModalOpen(true); }}
                    onEdit={(item) => { setCustodyItemToEdit(item); setIsCustodyModalOpen(true); }}
                    onDelete={(item) => setDeleteConfirmation({ type: 'custody', data: item })}
                />}
                 {page === 'notes' && <NotesPage 
                    initialNotes={notes}
                    onSave={handleSaveNotes}
                />}
                 {page === 'debts' && <DebtsPage 
                    debts={debts}
                    onAdd={() => { setDebtToEdit(null); setIsDebtModalOpen(true); }}
                    onEdit={(item) => { setDebtToEdit(item); setIsDebtModalOpen(true); }}
                    onDelete={(item) => setDeleteConfirmation({ type: 'debt', data: item })}
                    onExport={() => exportDebtsToExcel(debts)}
                />}
                {page === 'reports' && <ReportsPage 
                    transactions={transactions} 
                    budgets={budgets}
                    projects={projects}
                    onSaveBudgets={handleSaveBudgets}
                    onExport={() => exportToExcel(transactions, settings, disbursementSheets)}
                    onViewReceipt={setImageToView}
                    onEditTransaction={(tx) => {
                        setTransactionToEdit(tx);
                        setIsTransactionModalOpen(true);
                    }}
                    onDeleteTransaction={(tx) => setDeleteConfirmation({ type: 'transaction', data: tx })}
                />}
                {page === 'settings' && currentUser.role === UserRole.ADMIN && <SettingsPage settings={settings} onSaveSettings={handleSaveSettings} />}

                {/* Modals & Global Components */}
                <AddEditTransactionModal
                    isOpen={isTransactionModalOpen}
                    onClose={() => setIsTransactionModalOpen(false)}
                    onSave={saveTransaction}
                    transactionToEdit={transactionToEdit}
                    revenueSources={revenueSources}
                    projects={projects}
                    initialType={newTransactionType}
                />
                <AddEditRewardModal 
                    isOpen={isRewardModalOpen}
                    onClose={() => setIsRewardModalOpen(false)}
                    onSave={saveTransaction}
                    rewardToEdit={rewardToEdit}
                />
                <AddEditRecurringExpenseModal
                    isOpen={isRecurringModalOpen}
                    onClose={() => setIsRecurringModalOpen(false)}
                    onSave={saveRecurringExpense}
                    expenseToEdit={recurringToEdit}
                />
                <AddEditCustodyModal
                    isOpen={isCustodyModalOpen}
                    onClose={() => setIsCustodyModalOpen(false)}
                    onSave={(item) => { handleSaveCustodyItem(item); setIsCustodyModalOpen(false); }}
                    itemToEdit={custodyItemToEdit}
                />
                 <AddEditDebtModal
                    isOpen={isDebtModalOpen}
                    onClose={() => setIsDebtModalOpen(false)}
                    onSave={(item) => { handleSaveDebt(item); setIsDebtModalOpen(false); }}
                    itemToEdit={debtToEdit}
                />
                <ImageViewerModal imageUrl={imageToView} onClose={() => setImageToView(null)} />
                <ConfirmationModal
                    isOpen={!!deleteConfirmation}
                    onClose={() => setDeleteConfirmation(null)}
                    onConfirm={() => {
                        if (deleteConfirmation) {
                            switch (deleteConfirmation.type) {
                                case 'transaction': deleteTransaction(deleteConfirmation.data); break;
                                case 'recurring': deleteRecurringExpense(deleteConfirmation.data); break;
                                case 'project': handleDeleteProject(deleteConfirmation.data); break;
                                case 'custody': handleDeleteCustodyItem(deleteConfirmation.data); break;
                                case 'debt': handleDeleteDebt(deleteConfirmation.data); break;
                                default: 
                                    console.warn('Unknown delete confirmation type:', deleteConfirmation.type);
                                    setDeleteConfirmation(null);
                            }
                        }
                    }}
                    title="تأكيد الحذف"
                    message="هل أنت متأكد من رغبتك في حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء."
                />
                {reminders && <EnhancedReminderToast reminders={reminders} onClose={() => setReminders(null)} />}
                <ToastContainer toasts={toasts} removeToast={removeToast} />
            </main>
        </div>
    );
};
export default App;