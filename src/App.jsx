import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  User, Lock, LogOut, Plus, Minus, Camera, Upload, Search,
  TrendingUp, TrendingDown, Wallet, Calendar, Clock, AlertCircle,
  CheckCircle, XCircle, ChevronRight, BarChart3, PieChart, Receipt,
  Building2, Users, CreditCard, ArrowUpRight, ArrowDownRight,
  Home, FileText, Settings, DollarSign, Briefcase, X, Check,
  Loader2, Image as ImageIcon, Trash2, Edit3, Save, Filter,
  Cloud, RefreshCw, ChevronDown
} from 'lucide-react';
import {
  getProfile,
  getAllProfiles,
  resetUserPassword,
  verifyPassword,
  getProfileByUsername,
  getGeminiApiKey,
  saveGeminiApiKey,
  getAllTransactions, upsertTransaction, deleteTransactionById,
  getAllProjectsFromDB, upsertProject,
  getAllAttendanceFromDB, upsertAttendance,
  getAllAdvancesFromDB, insertAdvance, deleteAdvanceById,
  getAllBonusesFromDB, insertBonus,
  getAllWageHistory, upsertWageHistoryEntry, deleteWageHistoryEntry, updateWageHistoryDate,
  updateProfileFields,
} from './lib/supabase';

// ================== ERROR BOUNDARY ==================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h2>
            <p className="text-gray-600 mb-2">กรุณารีเฟรชหน้าเว็บหรือติดต่อผู้ดูแลระบบ</p>
            {this.state.error && (
              <p className="text-xs text-gray-400 mb-4 font-mono break-all">{this.state.error.message}</p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-indigo-700 transition"
            >
              รีเฟรชหน้าเว็บ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


// ================== SUPABASE DATA HOOK ==================
const useSupabaseData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [transactions, projects, attendance, advances, bonuses, wageHistoryMap, staff] =
        await Promise.all([
          getAllTransactions(),
          getAllProjectsFromDB(),
          getAllAttendanceFromDB(),
          getAllAdvancesFromDB(),
          getAllBonusesFromDB(),
          getAllWageHistory(),
          getAllProfiles(),
        ]);
      return { transactions, projects, attendance, advances, bonuses, wageHistoryMap, staff };
    } catch (err) {
      console.error('fetchAllData error:', err);
      setError('ไม่สามารถดึงข้อมูลได้');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, fetchAllData };
};


// ================== CONSTANTS & INITIAL DATA ==================
const EXPENSE_CATEGORIES = ['ค่าอุปกรณ์', 'ค่าเดินทาง', 'ค่าแรงช่าง', 'ค่าอาหาร', 'ค่าเบ็ดเตล็ด', 'ค่าสันทนาการ', 'อื่นๆ'];
const INCOME_CATEGORIES = ['ค่าติดตั้ง', 'ค่าบริการ', 'ค่าซ่อมบำรุง', 'ค่าอุปกรณ์', 'อื่นๆ'];

// ข้อมูลเริ่มต้นเป็นค่าว่าง - ใช้ข้อมูลจริงจาก Google Sheets
const INITIAL_PROJECTS = [];
const INITIAL_TRANSACTIONS = [];
const INITIAL_ATTENDANCE = {};
const INITIAL_ADVANCES = [];
const INITIAL_BONUSES = [];

// ================== GEMINI API FUNCTION ==================
const analyzeReceiptWithGemini = async (base64Image, apiKey) => {
  if (!apiKey) {
    throw new Error('กรุณาใส่ Gemini API Key');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `วิเคราะห์ใบเสร็จนี้และส่งข้อมูลกลับมาในรูปแบบ JSON ดังนี้:
{
  "amount": ยอดเงินรวมทั้งหมด (ตัวเลขเท่านั้น),
  "items": "รายการสินค้า/บริการ (รวมเป็นข้อความเดียว)",
  "date": "วันที่ในใบเสร็จ (รูปแบบ YYYY-MM-DD หรือ null ถ้าไม่มี)",
  "vendor": "ชื่อร้าน/ผู้ขาย (หรือ null ถ้าไม่มี)"
}
ตอบเฉพาะ JSON เท่านั้น ไม่ต้องมีคำอธิบายเพิ่มเติม`
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500
        }
      })
    }
  );

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const msg = errBody?.error?.message || `HTTP ${response.status}`;
    if (response.status === 400) throw new Error(`API Key ไม่ถูกต้อง หรือรูปแบบคำขอผิดพลาด: ${msg}`);
    if (response.status === 403) throw new Error(`API Key ไม่มีสิทธิ์ใช้งาน: ${msg}`);
    if (response.status === 429) throw new Error(`เกิน quota การใช้งาน กรุณารอสักครู่: ${msg}`);
    throw new Error(`Gemini API Error (${response.status}): ${msg}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('ไม่สามารถอ่านข้อมูลจากใบเสร็จได้');
};

// ================== UTILITY FUNCTIONS ==================
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const generateId = (prefix) => `${prefix}${Date.now()}`;

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// คำนวณรายได้รวมจาก wageHistory (แบ่งช่วงตาม effectiveDate)
const calculateEarningsWithHistory = (wageHistory, startDate, endDate) => {
  if (!wageHistory || wageHistory.length === 0 || !startDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return 0;

  // เรียงตาม effectiveDate
  const sorted = [...wageHistory].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));

  let totalEarnings = 0;

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const entryStart = new Date(entry.effectiveDate);
    const nextEntry = sorted[i + 1];
    const entryEnd = nextEntry ? new Date(new Date(nextEntry.effectiveDate).getTime() - 86400000) : end;

    // หาช่วงที่ overlap กับ startDate - endDate
    const periodStart = entryStart < start ? start : entryStart;
    const periodEnd = entryEnd > end ? end : entryEnd;

    if (periodStart <= periodEnd) {
      const days = Math.floor((periodEnd - periodStart) / 86400000) + 1;
      totalEarnings += entry.dailyWage * days;
    }
  }

  return totalEarnings;
};

// คำนวณรายได้จากวันทำงานจริงใน attendance (แม่นยำกว่าใช้วันปฏิทิน)
const calculateEarningsFromAttendance = (wageHistory, attendanceByMonth) => {
  if (!wageHistory?.length || !attendanceByMonth) return null;
  const entries = Object.entries(attendanceByMonth);
  if (entries.length === 0) return null;

  const sorted = [...wageHistory].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));

  return entries.reduce((total, [month, data]) => {
    const workDays = data.workDays || 0;
    if (!workDays) return total;

    const [y, mo] = month.split('-').map(Number);
    const monthStart = new Date(y, mo - 1, 1);
    const monthEnd = new Date(y, mo, 0); // วันสุดท้ายของเดือน
    const daysInMonth = monthEnd.getDate();

    let monthEarnings = 0;
    for (let i = 0; i < sorted.length; i++) {
      const wageStart = new Date(sorted[i].effectiveDate);
      const wageEnd = sorted[i + 1]
        ? new Date(new Date(sorted[i + 1].effectiveDate).getTime() - 86400000)
        : monthEnd;

      const overlapStart = wageStart > monthStart ? wageStart : monthStart;
      const overlapEnd = wageEnd < monthEnd ? wageEnd : monthEnd;

      if (overlapStart <= overlapEnd) {
        const overlapDays = Math.floor((overlapEnd - overlapStart) / 86400000) + 1;
        const workedDays = Math.round(workDays * overlapDays / daysInMonth);
        monthEarnings += workedDays * sorted[i].dailyWage;
      }
    }
    return total + monthEarnings;
  }, 0);
};

// ================== COMPONENTS ==================

// Login Screen - verify from profiles table
const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // ตรวจสอบ username + password จากตาราง profiles
      const profile = await verifyPassword(username, password);

      if (profile) {
        // บันทึก session ลง localStorage
        const sessionData = {
          user: profile,
          loginTime: Date.now(),
        };
        localStorage.setItem('money_tracker_session', JSON.stringify(sessionData));
        onLogin(profile);
      } else {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <img src="/logoTCS.png" alt="TonComService" className="w-32 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">TonComService</h1>
          <p className="text-gray-500 mt-2">Network & CCTV - ระบบจัดการรายรับ-รายจ่าย</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ชื่อผู้ใช้
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="Username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              รหัสผ่าน
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="รหัสผ่าน"
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5" />
            )}
            เข้าสู่ระบบ
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-500 text-center">
          ติดต่อผู้ดูแลระบบเพื่อสร้างบัญชีใหม่
        </p>
      </div>
    </div>
  );
};

// Loading Screen
const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
      <img src="/logoTCS.png" alt="TonComService" className="w-24 mx-auto mb-4" />
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
      <p className="text-gray-600">กำลังโหลด...</p>
    </div>
  </div>
);

// Autocomplete Input Component
const AutocompleteInput = ({ value, onChange, suggestions, placeholder, icon: Icon }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    const safeValue = typeof value === 'string' ? value : '';
    const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
    if (safeValue && safeSuggestions.length > 0) {
      const filtered = safeSuggestions
        .filter(s => typeof s === 'string' && s.toLowerCase().includes(safeValue.toLowerCase()))
        .slice(0, 5);
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  }, [value, suggestions]);

  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition`}
        placeholder={placeholder}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-4 py-2 text-left hover:bg-indigo-50 transition text-sm"
              onClick={() => {
                onChange(suggestion);
                setShowSuggestions(false);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, subtitle, icon: Icon, color = 'indigo', trend }) => {
  const bgClasses = {
    indigo: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
    emerald: 'bg-gradient-to-br from-emerald-300 to-emerald-500',
    red: 'bg-gradient-to-br from-red-300 to-rose-500',
    purple: 'bg-gradient-to-br from-purple-400 to-purple-600',
    yellow: 'bg-gradient-to-br from-yellow-300 to-orange-400',
  };

  return (
    <div className={`${bgClasses[color] || bgClasses.indigo} rounded-xl p-4 shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/70 font-medium">{title}</p>
          <p className="text-xl font-bold text-white mt-0.5">{value}</p>
          {subtitle && <p className="text-xs text-white/60 mt-0.5 leading-tight">{subtitle}</p>}
        </div>
        <div className="p-2 rounded-lg bg-white/20 ml-2 flex-shrink-0">
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs text-white/80">
          {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          <span>{Math.abs(trend)}% จากเดือนก่อน</span>
        </div>
      )}
    </div>
  );
};

// Transaction Form Modal
const TransactionModal = ({
  isOpen,
  onClose,
  onSave,
  projects,
  suggestions,
  geminiApiKey,
  setGeminiApiKey,
  editingTransaction,
  staffList,
  onSaveAdvance
}) => {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [advanceStaffId, setAdvanceStaffId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setCategory(editingTransaction.category);
      setProjectId(editingTransaction.projectId);
      setDescription(editingTransaction.description);
      setDate(editingTransaction.date);
      setAdvanceStaffId(editingTransaction.advanceStaffId || '');
    } else {
      resetForm();
    }
  }, [editingTransaction]);

  const resetForm = () => {
    setType('expense');
    setAmount('');
    setCategory('');
    setProjectId('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setScanError('');
    setAdvanceStaffId('');
  };

  const handleImageCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!geminiApiKey) {
      setShowApiKeyInput(true);
      return;
    }

    setIsScanning(true);
    setScanError('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        try {
          const result = await analyzeReceiptWithGemini(base64, geminiApiKey);
          if (result.amount) setAmount(result.amount.toString());
          if (result.items) setDescription(Array.isArray(result.items) ? result.items.join(', ') : String(result.items));
          if (result.date) setDate(result.date);
        } catch (err) {
          setScanError(err.message);
        }
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setScanError('ไม่สามารถอ่านไฟล์รูปภาพได้');
      setIsScanning(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !category || !projectId) return;
    if (category === 'เบิกเงินพนักงาน' && !advanceStaffId) return;

    setPendingTransaction({
      id: editingTransaction?.id || generateId('T'),
      type,
      amount: parseFloat(amount),
      category,
      projectId,
      description: category === 'เบิกเงินพนักงาน'
        ? `เบิกเงิน - ${(staffList || []).find(s => s.id === advanceStaffId)?.name || advanceStaffId}${description ? ` (${description})` : ''}`
        : description,
      date,
      createdBy: 'admin',
      advanceStaffId: category === 'เบิกเงินพนักงาน' ? advanceStaffId : undefined
    });
    setShowConfirm(true);
  };

  const handleConfirmSave = () => {
    if (pendingTransaction) {
      onSave(pendingTransaction);
      // ถ้าเป็นเบิกเงินพนักงาน ให้บันทึก advance ด้วย
      if (pendingTransaction.advanceStaffId && onSaveAdvance) {
        const currentMonth = `${new Date(pendingTransaction.date).getFullYear()}-${String(new Date(pendingTransaction.date).getMonth() + 1).padStart(2, '0')}`;
        onSaveAdvance({
          id: generateId('A'),
          staffId: pendingTransaction.advanceStaffId,
          amount: pendingTransaction.amount,
          date: pendingTransaction.date,
          month: currentMonth,
          description: pendingTransaction.description
        });
      }
    }
    setShowConfirm(false);
    setPendingTransaction(null);
    resetForm();
    onClose();
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
    setPendingTransaction(null);
  };

  if (!isOpen) return null;

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">
            {editingTransaction ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${type === 'income'
                ? 'bg-emerald-500 text-white shadow'
                : 'text-gray-600 hover:bg-gray-200'
                }`}
            >
              <TrendingUp className="w-4 h-4" />
              รายรับ
            </button>
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${type === 'expense'
                ? 'bg-red-500 text-white shadow'
                : 'text-gray-600 hover:bg-gray-200'
                }`}
            >
              <TrendingDown className="w-4 h-4" />
              รายจ่าย
            </button>
          </div>

          {/* OCR Scanner */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageCapture}
              className="hidden"
            />

            {showApiKeyInput && !geminiApiKey ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">ใส่ Gemini API Key เพื่อใช้งาน OCR</p>
                <input
                  type="text"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 bg-indigo-500 text-white rounded-lg text-sm"
                >
                  บันทึกและเลือกรูป
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="w-full flex flex-col items-center gap-2 text-gray-500 hover:text-indigo-600 transition"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <span className="text-sm">กำลังสแกนใบเสร็จ...</span>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Camera className="w-8 h-8" />
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <span className="text-sm">ถ่ายรูป / เลือกรูปใบเสร็จ (AI OCR)</span>
                  </>
                )}
              </button>
            )}

            {scanError && (
              <p className="text-red-500 text-sm mt-2 text-center">{scanError}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">จำนวนเงิน</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-lg font-semibold"
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">โปรเจกต์</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              required
            >
              <option value="">-- เลือกโปรเจกต์ --</option>
              {[...projects].filter(p => p.status !== 'completed').reverse().map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">หมวดหมู่</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 rounded-lg text-sm transition ${category === cat
                    ? type === 'income'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Staff Selector for Advance */}
          {type === 'expense' && category === 'เบิกเงินพนักงาน' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">เลือกพนักงาน</label>
              <select
                value={advanceStaffId}
                onChange={(e) => setAdvanceStaffId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                required
              >
                <option value="">-- เลือกพนักงาน --</option>
                {(staffList || []).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">รายละเอียด</label>
            <AutocompleteInput
              value={description}
              onChange={setDescription}
              suggestions={suggestions}
              placeholder="รายละเอียดรายการ..."
              icon={FileText}
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">วันที่</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={`w-full py-3 rounded-xl font-medium text-white transition flex items-center justify-center gap-2 ${type === 'income'
              ? 'bg-emerald-500 hover:bg-emerald-600'
              : 'bg-red-500 hover:bg-red-600'
              }`}
          >
            <Save className="w-5 h-5" />
            {editingTransaction ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}
          </button>
        </form>
      </div>

      {/* Confirmation Popup */}
      {showConfirm && pendingTransaction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={handleCancelConfirm}>
          <div className="bg-white rounded-2xl p-5 mx-4 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-3">ยืนยันการบันทึก</h3>
            <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">ประเภท</span>
                <span className={`font-medium ${pendingTransaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {pendingTransaction.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">จำนวน</span>
                <span className="font-semibold">{formatCurrency(pendingTransaction.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">หมวดหมู่</span>
                <span>{pendingTransaction.category}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">งาน</span>
                <span>{projects.find(p => p.id === pendingTransaction.projectId)?.name || '-'}</span>
              </div>
              {pendingTransaction.advanceStaffId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">พนักงาน</span>
                  <span className="font-medium text-purple-600">{(staffList || []).find(s => s.id === pendingTransaction.advanceStaffId)?.name || pendingTransaction.advanceStaffId}</span>
                </div>
              )}
              {pendingTransaction.description && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">รายละเอียด</span>
                  <span className="text-right max-w-[60%]">{pendingTransaction.description}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">วันที่</span>
                <span>{formatDate(pendingTransaction.date)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancelConfirm}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmSave}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Project Modal
const ProjectModal = ({ isOpen, onClose, onSave, editingProject }) => {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [status, setStatus] = useState('in_progress');
  const [contractValue, setContractValue] = useState('');

  useEffect(() => {
    if (editingProject) {
      setName(editingProject.name);
      setClient(editingProject.client);
      setStatus(editingProject.status);
      setContractValue(editingProject.contractValue > 0 ? String(editingProject.contractValue) : '');
    } else {
      setName('');
      setClient('');
      setStatus('in_progress');
      setContractValue('');
    }
  }, [editingProject]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: editingProject?.id || generateId('P'),
      name,
      client,
      status,
      contractValue: parseFloat(contractValue) || 0,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">
            {editingProject ? 'แก้ไขโปรเจกต์' : 'เพิ่มโปรเจกต์ใหม่'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อโปรเจกต์</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="เช่น ติดตั้งกล้อง บ้านคุณ..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ลูกค้า</label>
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="ชื่อลูกค้า / บริษัท"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">มูลค่างาน (บาท)</label>
            <input
              type="number"
              value={contractValue}
              onChange={(e) => setContractValue(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="0"
              min="0"
            />
            <p className="text-xs text-gray-400 mt-1">ราคาที่จะเรียกเก็บจากลูกค้า (เมื่องานเสร็จจะนับว่าเก็บเงินแล้ว)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">สถานะ</label>
            <div className="flex gap-2">
              {[
                { value: 'in_progress', label: 'กำลังดำเนินการ', color: 'yellow' },
                { value: 'completed', label: 'เสร็จสิ้น', color: 'emerald' },
              ].map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={`flex-1 py-2 rounded-lg font-medium transition ${status === s.value
                    ? s.color === 'emerald'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-yellow-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            บันทึก
          </button>
        </form>
      </div>
    </div>
  );
};

// Settings Modal
const SettingsModal = ({
  isOpen,
  onClose,
  geminiApiKey,
  onSaveGeminiKey,
  onFetchData,
}) => {
  const [tempGeminiKey, setTempGeminiKey] = useState(geminiApiKey);

  useEffect(() => {
    setTempGeminiKey(geminiApiKey);
  }, [geminiApiKey, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            ตั้งค่า
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Gemini API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Camera className="w-4 h-4 inline mr-1" />
              Gemini API Key (สำหรับ OCR)
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={tempGeminiKey}
                onChange={(e) => setTempGeminiKey(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
                placeholder="AIza..."
              />
              <button
                onClick={() => onSaveGeminiKey(tempGeminiKey)}
                disabled={tempGeminiKey === geminiApiKey}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition flex items-center gap-1 ${tempGeminiKey === geminiApiKey
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600'
                  }`}
              >
                <Save className="w-4 h-4" />
                บันทึก
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ใช้สำหรับสแกนใบเสร็จอัตโนมัติ
            </p>
          </div>

          {/* Refresh Data */}
          <div className="border-t pt-4">
            <button
              onClick={() => { onFetchData(); onClose(); }}
              className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              โหลดข้อมูลใหม่จาก Supabase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Advance Payment Modal (Owner adds for staff)
const AdvanceModal = ({ isOpen, onClose, onSave, staffList }) => {
  const [staffId, setStaffId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const month = date.substring(0, 7);
    onSave({
      id: generateId('A'),
      staffId,
      amount: parseFloat(amount),
      description,
      date,
      month
    });
    setStaffId('');
    setAmount('');
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">บันทึกการเบิกเงิน</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">พนักงาน</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              required
            >
              <option value="">-- เลือกพนักงาน --</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">จำนวนเงิน</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">หมายเหตุ</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="เช่น เบิกเงิน"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">วันที่</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
          >
            บันทึก
          </button>
        </form>
      </div>
    </div>
  );
};

// Bonus Modal
const BonusModal = ({ isOpen, onClose, onSave, staffList, editingBonus }) => {
  const [staffId, setStaffId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (editingBonus) {
      setStaffId(editingBonus.staffId || '');
      setAmount(String(editingBonus.amount || ''));
      setDescription(editingBonus.description || '');
      setDate(editingBonus.date || new Date().toISOString().split('T')[0]);
    } else {
      setStaffId('');
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [editingBonus, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const month = date.substring(0, 7);
    onSave({
      id: editingBonus?.id || generateId('B'),
      staffId,
      amount: parseFloat(amount),
      description,
      date,
      month
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">
            {editingBonus ? 'แก้ไขเงินพิเศษ' : 'บันทึกเงินพิเศษ'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">พนักงาน</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
              required
              disabled={!!editingBonus}
            >
              <option value="">-- เลือกพนักงาน --</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">จำนวนเงิน (บาท)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
              placeholder="0"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">รายละเอียดงาน</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
              placeholder="เช่น ติดตั้งกล้อง PTT สาขานครปฐม"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">วันที่</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition"
          >
            บันทึกเงินพิเศษ
          </button>
        </form>
      </div>
    </div>
  );
};

// Attendance Modal
const AttendanceModal = ({ isOpen, onClose, onSave, staffList, editingData }) => {
  const [staffId, setStaffId] = useState('');
  const [month, setMonth] = useState(getCurrentMonth());
  const [workDays, setWorkDays] = useState('');
  const [lateDays, setLateDays] = useState('');
  const [absentDays, setAbsentDays] = useState('');
  const [leaveDays, setLeaveDays] = useState('');

  useEffect(() => {
    if (editingData) {
      setStaffId(editingData.staffId || '');
      setMonth(editingData.month || getCurrentMonth());
      setWorkDays(String(editingData.workDays ?? ''));
      setLateDays(String(editingData.lateDays ?? ''));
      setAbsentDays(String(editingData.absentDays ?? ''));
      setLeaveDays(String(editingData.leaveDays ?? ''));
    } else {
      setStaffId('');
      setMonth(getCurrentMonth());
      setWorkDays('');
      setLateDays('');
      setAbsentDays('');
      setLeaveDays('');
    }
  }, [editingData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      staffId,
      month,
      workDays: parseInt(workDays) || 0,
      lateDays: parseInt(lateDays) || 0,
      absentDays: parseInt(absentDays) || 0,
      leaveDays: parseInt(leaveDays) || 0
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">
            {editingData ? 'แก้ไขเวลาทำงาน' : 'บันทึกเวลาทำงาน'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">พนักงาน</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              required
              disabled={!!editingData}
            >
              <option value="">-- เลือกพนักงาน --</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">เดือน</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">วันทำงาน</label>
              <input
                type="number"
                value={workDays}
                onChange={(e) => setWorkDays(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">สาย (หัก 50)</label>
              <input
                type="number"
                value={lateDays}
                onChange={(e) => setLateDays(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ขาด (หัก 300)</label>
              <input
                type="number"
                value={absentDays}
                onChange={(e) => setAbsentDays(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ลา</label>
              <input
                type="number"
                value={leaveDays}
                onChange={(e) => setLeaveDays(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
          >
            บันทึก
          </button>
        </form>
      </div>
    </div>
  );
};

// Revenue Chart Component
const RevenueChart = ({ transactions, projects }) => {
  const [period, setPeriod] = useState('month');

  const uncollectedTotal = useMemo(() =>
    (projects || [])
      .filter(p => p.status === 'in_progress' && p.contractValue > 0)
      .reduce((sum, p) => sum + p.contractValue, 0)
  , [projects]);

  const chartData = useMemo(() => {
    const grouped = {};

    const getKey = (dateStr) => {
      const d = new Date(dateStr);
      if (period === 'day') {
        return dateStr;
      } else if (period === 'week') {
        const day = d.getDay();
        const diff = (day === 0 ? -6 : 1 - day);
        const mon = new Date(d);
        mon.setDate(d.getDate() + diff);
        return mon.toISOString().split('T')[0];
      } else if (period === 'month') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else {
        return String(d.getFullYear());
      }
    };

    const getLabel = (key) => {
      if (period === 'day') {
        const d = new Date(key);
        return `${d.getDate()}/${d.getMonth() + 1}`;
      } else if (period === 'week') {
        const d = new Date(key);
        return `${d.getDate()}/${d.getMonth() + 1}`;
      } else if (period === 'month') {
        const [y, m] = key.split('-');
        return `${m}/${y.slice(2)}`;
      } else {
        return key;
      }
    };

    transactions.forEach(t => {
      if (!t.date) return;
      const key = getKey(t.date);
      if (!grouped[key]) grouped[key] = { key, income: 0, expense: 0 };
      if (t.type === 'income') grouped[key].income += t.amount;
      else grouped[key].expense += t.amount;
    });

    let keys = Object.keys(grouped).sort();
    const limits = { day: 14, week: 12, month: 12, year: 10 };
    keys = keys.slice(-limits[period]);

    return keys.map((k, i) => ({
      label: getLabel(k),
      รายรับ: Math.round(grouped[k].income),
      รายจ่าย: Math.round(grouped[k].expense),
      กำไร: Math.round(grouped[k].income - grouped[k].expense),
      // ใส่ยอดยังไม่เรียกเก็บเฉพาะแท่งสุดท้าย (ปัจจุบัน)
      ยังไม่เรียกเก็บ: i === keys.length - 1 && uncollectedTotal > 0 ? Math.round(uncollectedTotal) : 0,
    }));
  }, [transactions, period, uncollectedTotal]);

  const tabs = [
    { id: 'day', label: 'รายวัน' },
    { id: 'week', label: 'รายสัปดาห์' },
    { id: 'month', label: 'รายเดือน' },
    { id: 'year', label: 'รายปี' },
  ];

  const formatK = (v) => {
    if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}K`;
    return v;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-xs">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-gray-500">{p.name}:</span>
            <span className="font-semibold" style={{ color: p.color }}>
              ฿{p.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 text-sm">ผลประกอบการ</h3>
        <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setPeriod(t.id)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition ${period === t.id ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">ยังไม่มีข้อมูล</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatK} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="รายรับ" stackId="income" fill="#34d399" radius={[0, 0, 0, 0]} maxBarSize={32} />
            <Bar dataKey="ยังไม่เรียกเก็บ" stackId="income" fill="#fb923c" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="รายจ่าย" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Line type="monotone" dataKey="กำไร" stroke="#818cf8" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <div className="flex justify-center gap-4 mt-2 flex-wrap">
        {[
          ['รายรับ', '#34d399'],
          ['ยังไม่เรียกเก็บ', '#fb923c'],
          ['รายจ่าย', '#f87171'],
          ['กำไร', '#818cf8'],
        ].map(([name, color]) => (
          <div key={name} className="flex items-center gap-1 text-xs text-gray-500">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
            {name}
          </div>
        ))}
      </div>
    </div>
  );
};

// Owner Dashboard
const OwnerDashboard = ({ transactions, projects, staffData, attendance, advances }) => {
  const today = new Date().toISOString().split('T')[0];
  const [viewMode, setViewMode] = useState('all'); // custom, week, month, all
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d.toISOString().split('T')[0];
  });

  // สร้างรายการเดือนจาก transactions + advances
  const availableMonths = useMemo(() => {
    const months = new Set();
    const toMonth = (str) => str ? str.substring(0, 7) : null;
    const isValidMonth = (m) => m && /^\d{4}-\d{2}$/.test(m);
    months.add(getCurrentMonth());
    transactions.forEach(t => { const m = toMonth(t.date); if (isValidMonth(m)) months.add(m); });
    advances.forEach(a => {
      const m = toMonth(a.month) || toMonth(a.date);
      if (isValidMonth(m)) months.add(m);
    });
    return [...months].sort().reverse();
  }, [transactions, advances]);

  // คำนวณช่วงวันที่จาก viewMode
  const dateRange = useMemo(() => {
    if (viewMode === 'custom') {
      return { from: dateFrom, to: dateTo };
    }
    if (viewMode === 'week') {
      const start = new Date(selectedWeek);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] };
    }
    if (viewMode === 'month') {
      const [y, m] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      return { from: `${selectedMonth}-01`, to: `${selectedMonth}-${String(lastDay).padStart(2, '0')}` };
    }
    // all
    return { from: null, to: null };
  }, [viewMode, dateFrom, dateTo, selectedMonth, selectedWeek]);

  const inRange = useCallback((dateStr) => {
    if (!dateRange.from) return true;
    if (!dateStr) return false;
    return dateStr >= dateRange.from && dateStr <= dateRange.to;
  }, [dateRange]);

  // เดือนที่อยู่ในช่วง (สำหรับ attendance)
  const monthsInRange = useMemo(() => {
    if (!dateRange.from) {
      // all: รวมทุกเดือนที่มี attendance
      const months = new Set();
      if (attendance) {
        Object.values(attendance).forEach(staffAtt => {
          if (staffAtt && typeof staffAtt === 'object') {
            Object.keys(staffAtt).forEach(m => months.add(m));
          }
        });
      }
      return [...months];
    }
    const months = new Set();
    const startMonth = dateRange.from.substring(0, 7);
    const endMonth = dateRange.to.substring(0, 7);
    let cur = startMonth;
    while (cur <= endMonth) {
      months.add(cur);
      const [y, m] = cur.split('-').map(Number);
      const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
      cur = next;
    }
    return [...months];
  }, [dateRange, attendance]);

  const stats = useMemo(() => {
    const filtered = transactions.filter(t => inRange(t.date));
    const incomeItems = filtered.filter(t => t.type === 'income');
    const expenseItems = filtered.filter(t => t.type === 'expense');
    const totalIncome = incomeItems.reduce((sum, t) => sum + t.amount, 0);
    const operatingExpense = expenseItems.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = operatingExpense; // รายจ่าย = ค่าใช้จ่ายจากการดำเนินงาน (เงินเบิกอยู่ใน ค่าแรงคงเหลือ)
    const incomeCount = incomeItems.length;
    const expenseCount = expenseItems.length;

    // เงินเบิกพนักงาน (ตามช่วงวันที่ที่เลือก)
    const advancesInRange = advances.filter(a => {
      const advDate = a.date || (a.month ? `${a.month}-01` : null);
      return inRange(advDate);
    });
    const totalAdvances = advancesInRange.reduce((sum, a) => sum + a.amount, 0);

    // จำนวนวันในช่วงที่เลือก (สำหรับ custom/week)
    const daysInRange = dateRange.from
      ? Math.max(1, Math.floor((new Date(dateRange.to) - new Date(dateRange.from)) / 86400000) + 1)
      : null;

    // ค่าแรงเตรียมจ่ายแต่ละคน พร้อม breakdown (ตามช่วงวันที่ที่เลือก)
    const useAttendance = viewMode === 'month' || viewMode === 'all';
    const staffWageBreakdown = (staffData || [])
      .filter(s => s.active !== false && s.role !== 'owner')
      .map(staff => {
        const dailyWage = staff.daily_wage || staff.dailyWage || 0;
        let wageCost = 0;
        let workDays = 0;
        if (useAttendance) {
          monthsInRange.forEach(month => {
            const att = attendance?.[staff.username]?.[month] || { workDays: 0, lateDays: 0, absentDays: 0 };
            workDays += att.workDays || 0;
            wageCost += (dailyWage * (att.workDays || 0)) - ((att.lateDays || 0) * 50) - ((att.absentDays || 0) * 300);
          });
        } else {
          workDays = daysInRange || 1;
          wageCost = dailyWage * workDays;
        }
        return { name: staff.name, dailyWage, workDays, wageCost };
      });

    const totalStaffCost = staffWageBreakdown.reduce((sum, s) => sum + s.wageCost, 0);

    // ค่าแรงสะสมจริงถึงวันนี้ (ทุกคน) — ใช้ attendance ถ้ามี ไม่งั้นคำนวณจากวันเริ่มงาน
    const today = new Date().toISOString().split('T')[0];
    const staffWagesAccumulated = (staffData || [])
      .filter(s => s.active !== false && s.role !== 'owner')
      .map(staff => {
        const wageHistory = staff.wageHistory && staff.wageHistory.length > 0
          ? staff.wageHistory
          : [{ dailyWage: staff.daily_wage || staff.dailyWage || 0, effectiveDate: staff.startDate || staff.start_date || today }];
        const staffAttendance = attendance?.[staff.username] || {};
        const earned = calculateEarningsFromAttendance(wageHistory, staffAttendance)
          ?? calculateEarningsWithHistory(wageHistory, staff.startDate || staff.start_date, today);
        const staffAdvances = advances.filter(a => a.staffId === staff.username).reduce((s, a) => s + a.amount, 0);
        return { name: staff.name, earned: earned || 0, advances: staffAdvances, owed: Math.max(0, (earned || 0) - staffAdvances) };
      });

    const totalStaffWagesEarned = staffWagesAccumulated.reduce((sum, s) => sum + s.earned, 0);
    const totalAdvancesAllTime = advances.reduce((sum, a) => sum + a.amount, 0);
    const wageOwed = totalStaffWagesEarned - totalAdvancesAllTime;

    const profit = totalIncome - totalExpense;
    const netProfit = profit - totalStaffCost - totalAdvances;
    // กำไรสุทธิ ณ ปัจจุบัน = รายรับ - รายจ่าย - ค่าแรงคงเหลือที่ยังต้องจ่าย (ทั้งหมด)
    const realNetProfit = totalIncome - totalExpense - Math.max(0, wageOwed);
    const activeProjects = projects.filter(p => p.status === 'in_progress').length;
    // มูลค่างานที่ยังไม่ได้เรียกเก็บ (in_progress เท่านั้น)
    const uncollectedTotal = projects
      .filter(p => p.status === 'in_progress' && p.contractValue > 0)
      .reduce((sum, p) => sum + p.contractValue, 0);

    // กำไรรวมจากแต่ละโปรเจกต์ (เฉพาะโปรเจกต์ที่มีกำไรบวก)
    const filteredForStats = transactions.filter(t => inRange(t.date));
    const projectIds = [...new Set(filteredForStats.filter(t => t.projectId).map(t => t.projectId))];
    const totalProjectProfit = projectIds.reduce((sum, pid) => {
      const txns = filteredForStats.filter(t => t.projectId === pid);
      const pIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const pExpense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const pProfit = pIncome - pExpense;
      return sum + Math.max(0, pProfit);
    }, 0);

    // กองทุนสันทนาการ: 1% จากกำไรรวมแต่ละโปรเจกต์
    const entertainmentFund = totalProjectProfit * 0.01;
    // ค่าสันทนาการที่เบิกไปแล้ว (รายจ่ายหมวด "ค่าสันทนาการ" ในช่วงที่เลือก)
    const entertainmentSpent = filteredForStats
      .filter(t => t.type === 'expense' && t.category === 'ค่าสันทนาการ')
      .reduce((s, t) => s + t.amount, 0);
    const entertainmentRemaining = entertainmentFund - entertainmentSpent;
    // เงินสำรองฉุกเฉิน: 20% จากกำไรรวมแต่ละโปรเจกต์
    const emergencyFund = totalProjectProfit * 0.20;

    return { totalIncome, totalExpense, operatingExpense, totalAdvances, incomeCount, expenseCount, profit, totalStaffCost, netProfit, wageOwed, totalStaffWagesEarned, totalAdvancesAllTime, realNetProfit, activeProjects, uncollectedTotal, staffWageBreakdown, staffWagesAccumulated, daysInRange, useAttendance, entertainmentFund, entertainmentSpent, entertainmentRemaining, emergencyFund, totalProjectProfit };
  }, [transactions, projects, staffData, attendance, advances, inRange, monthsInRange, viewMode, dateRange]);

  // รายการในช่วงที่เลือก
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => inRange(t.date))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
  }, [transactions, inRange]);

  // ปุ่มเลื่อนอาทิตย์
  const shiftWeek = (dir) => {
    const d = new Date(selectedWeek);
    d.setDate(d.getDate() + dir * 7);
    setSelectedWeek(d.toISOString().split('T')[0]);
  };

  // ปุ่มเลื่อนเดือน
  const shiftMonth = (dir) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nd = new Date(y, m - 1 + dir, 1);
    setSelectedMonth(`${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`);
  };

  // label ช่วงวันที่
  const rangeLabel = useMemo(() => {
    if (viewMode === 'all') return 'ทั้งหมด';
    if (viewMode === 'custom') return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
    if (viewMode === 'week') {
      const end = new Date(selectedWeek);
      end.setDate(end.getDate() + 6);
      return `${formatDate(selectedWeek)} - ${formatDate(end.toISOString().split('T')[0])}`;
    }
    return selectedMonth;
  }, [viewMode, dateFrom, dateTo, selectedMonth, selectedWeek]);

  return (
    <div className="space-y-4">
      {/* View Mode Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {[
          { id: 'custom', label: 'เลือกวัน' },
          { id: 'week', label: 'รายสัปดาห์' },
          { id: 'month', label: 'รายเดือน' },
          { id: 'all', label: 'ทั้งหมด' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${viewMode === tab.id ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Controls */}
      {viewMode === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          <span className="text-gray-400 text-sm">ถึง</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
      )}

      {viewMode === 'week' && (
        <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <button onClick={() => shiftWeek(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
          <span className="text-sm font-medium text-gray-700">{rangeLabel}</span>
          <button onClick={() => shiftWeek(1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      )}

      {viewMode === 'month' && (
        <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <button onClick={() => shiftMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="text-sm font-medium text-gray-700 border-0 bg-transparent focus:ring-0 text-center cursor-pointer">
            {availableMonths.map(m => (
              <option key={m} value={m}>{m === getCurrentMonth() ? `${m} (เดือนนี้)` : m}</option>
            ))}
          </select>
          <button onClick={() => shiftMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard title="รายรับ" value={formatCurrency(stats.totalIncome)} subtitle={`ผลรวมรายรับทุกหมวด • ${stats.incomeCount} รายการ`} icon={TrendingUp} color="emerald" />
        <StatsCard title="รายจ่าย" value={formatCurrency(stats.totalExpense)} subtitle={`ค่าใช้จ่ายดำเนินงาน • ${stats.expenseCount} รายการ`} icon={TrendingDown} color="red" />
        <StatsCard
          title="ค่าแรงคงเหลือ (ถึงวันนี้)"
          value={formatCurrency(Math.max(0, stats.wageOwed))}
          subtitle={`แรง ${formatCurrency(stats.totalStaffWagesEarned)} - เบิก ${formatCurrency(stats.totalAdvancesAllTime)}`}
          icon={Users}
          color="purple"
        />
        <StatsCard
          title="กำไรสุทธิ ณ ปัจจุบัน"
          value={formatCurrency(stats.realNetProfit)}
          subtitle="รายรับ - รายจ่าย - ค่าแรงคงเหลือ"
          icon={stats.realNetProfit >= 0 ? TrendingUp : TrendingDown}
          color={stats.realNetProfit >= 0 ? 'emerald' : 'red'}
        />
      </div>

      {/* กราฟผลประกอบการ */}
      <RevenueChart transactions={transactions} projects={projects} />

      {stats.uncollectedTotal > 0 ? (
        <div className="bg-gradient-to-r from-orange-300 to-amber-400 rounded-xl p-3 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70 font-medium">โปรเจกต์กำลังดำเนินการ</p>
            <p className="text-xs text-white/60">{stats.activeProjects} งาน • ยังไม่เรียกเก็บ</p>
          </div>
          <p className="text-lg font-bold text-white">{formatCurrency(stats.uncollectedTotal)}</p>
        </div>
      ) : (
        <p className="text-xs text-gray-400">โปรเจกต์กำลังดำเนินการ: {stats.activeProjects} งาน</p>
      )}

      {/* การแบ่งเงินจากกำไรสุทธิ */}
      {stats.totalProjectProfit > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 shadow-sm border border-indigo-100">
          <h3 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2 text-sm">
            <span className="text-base">💰</span>
            แบ่งเงินจากกำไรรวมแต่ละงาน {formatCurrency(stats.totalProjectProfit)}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-3 ${stats.entertainmentRemaining < 0 ? 'bg-gradient-to-br from-red-400 to-rose-500' : 'bg-gradient-to-br from-amber-300 to-orange-400'} shadow-sm`}>
              <p className="text-xs text-white/70 font-medium mb-1">ค่าสันทนาการ (1%)</p>
              <p className="text-lg font-bold text-white">{formatCurrency(stats.entertainmentRemaining)}</p>
              <p className="text-xs text-white/60 mt-0.5">คงเหลือ</p>
              <div className="mt-2 pt-2 border-t border-white/20 space-y-0.5">
                <div className="flex justify-between text-xs text-white/70">
                  <span>budget</span>
                  <span className="font-medium text-white">{formatCurrency(stats.entertainmentFund)}</span>
                </div>
                <div className="flex justify-between text-xs text-white/70">
                  <span>เบิกไปแล้ว</span>
                  <span className="font-medium text-white">-{formatCurrency(stats.entertainmentSpent)}</span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-teal-300 to-cyan-500 rounded-xl p-3 shadow-sm">
              <p className="text-xs text-white/70 font-medium mb-1">เงินสำรองฉุกเฉิน (20%)</p>
              <p className="text-lg font-bold text-white">{formatCurrency(stats.emergencyFund)}</p>
              <p className="text-xs text-white/60 mt-0.5">20% × กำไรรวมแต่ละงาน</p>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-indigo-500" />
          รายการล่าสุด
        </h3>
        {filteredTransactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">ไม่มีรายการในช่วงนี้</p>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map(t => {
              const projectName = t.projectId ? projects.find(p => p.id === t.projectId)?.name : null;
              return (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{t.description || t.category}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                      {projectName && (
                        <button
                          onClick={() => setSelectedProjectId(t.projectId)}
                          className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition"
                        >
                          {projectName}
                        </button>
                      )}
                    </div>
                  </div>
                  <span className={`font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Project Detail Modal */}
      {selectedProjectId && (() => {
        const project = projects.find(p => p.id === selectedProjectId);
        if (!project) return null;
        const projectTxns = transactions
          .filter(t => t.projectId === selectedProjectId)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        const totalIncome = projectTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const totalExpense = projectTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const profit = totalIncome - totalExpense;
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelectedProjectId(null)}>
            <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{project.name}</h3>
                  {project.client && <p className="text-sm text-gray-500">{project.client}</p>}
                </div>
                <button onClick={() => setSelectedProjectId(null)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-2 p-4 border-b border-gray-100">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">รายรับ</p>
                  <p className="font-bold text-emerald-600 text-sm">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">รายจ่าย</p>
                  <p className="font-bold text-red-600 text-sm">{formatCurrency(totalExpense)}</p>
                </div>
                <div className={`${profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'} rounded-xl p-3 text-center`}>
                  <p className="text-xs text-gray-500">{profit >= 0 ? 'กำไร' : 'ขาดทุน'}</p>
                  <p className={`font-bold text-sm ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(profit))}</p>
                </div>
              </div>

              {/* Transaction List */}
              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-sm text-gray-500 mb-3">รายการทั้งหมด ({projectTxns.length} รายการ)</p>
                {projectTxns.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">ยังไม่มีรายการ</p>
                ) : (
                  <div className="space-y-2">
                    {projectTxns.map(t => (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{t.description || t.category}</p>
                          <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                        </div>
                        <span className={`font-semibold text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// Owner Transactions List
const OwnerTransactions = ({ transactions, projects, onAdd, onEdit, onDelete, filterProject, setFilterProject }) => {
  const today = new Date().toISOString().split('T')[0];
  const [viewMode, setViewMode] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // all | income | expense
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d.toISOString().split('T')[0];
  });
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const dateRange = useMemo(() => {
    if (viewMode === 'custom') return { from: dateFrom, to: dateTo };
    if (viewMode === 'week') {
      const start = new Date(selectedWeek);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] };
    }
    if (viewMode === 'month') {
      const [y, m] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      return { from: `${selectedMonth}-01`, to: `${selectedMonth}-${String(lastDay).padStart(2, '0')}` };
    }
    return { from: null, to: null };
  }, [viewMode, dateFrom, dateTo, selectedMonth, selectedWeek]);

  const shiftWeek = (dir) => {
    const d = new Date(selectedWeek);
    d.setDate(d.getDate() + dir * 7);
    setSelectedWeek(d.toISOString().split('T')[0]);
  };
  const shiftMonth = (dir) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nd = new Date(y, m - 1 + dir, 1);
    setSelectedMonth(`${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`);
  };

  const availableMonths = useMemo(() => {
    const months = new Set();
    months.add(getCurrentMonth());
    transactions.forEach(t => { if (t.date) months.add(t.date.substring(0, 7)); });
    return [...months].sort().reverse();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (filterProject) filtered = filtered.filter(t => t.projectId === filterProject);
    if (dateRange.from) {
      filtered = filtered.filter(t => t.date >= dateRange.from && t.date <= dateRange.to);
    }
    if (typeFilter !== 'all') filtered = filtered.filter(t => t.type === typeFilter);
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, filterProject, dateRange, typeFilter]);

  const summary = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, profit: income - expense };
  }, [filteredTransactions]);

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'ไม่ระบุ';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">รายการทั้งหมด</h2>
        <button
          onClick={onAdd}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          เพิ่ม
        </button>
      </div>

      {/* Date Filter Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {[
          { id: 'custom', label: 'กำหนดเอง' },
          { id: 'week', label: 'รายสัปดาห์' },
          { id: 'month', label: 'รายเดือน' },
          { id: 'all', label: 'ทั้งหมด' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${viewMode === tab.id ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {viewMode === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm" />
          <span className="text-gray-400 text-sm">ถึง</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm" />
        </div>
      )}

      {viewMode === 'week' && (
        <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <button onClick={() => shiftWeek(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {(() => { const e = new Date(selectedWeek); e.setDate(e.getDate() + 6); return `${formatDate(selectedWeek)} - ${formatDate(e.toISOString().split('T')[0])}`; })()}
          </span>
          <button onClick={() => shiftWeek(1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      )}

      {viewMode === 'month' && (
        <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <button onClick={() => shiftMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="text-sm font-medium text-gray-700 border-0 bg-transparent focus:ring-0 text-center cursor-pointer">
            {availableMonths.map(m => (
              <option key={m} value={m}>{m === getCurrentMonth() ? `${m} (เดือนนี้)` : m}</option>
            ))}
          </select>
          <button onClick={() => shiftMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-emerald-50 rounded-xl p-2">
          <p className="text-xs text-gray-500">รายรับ</p>
          <p className="text-sm font-bold text-emerald-600">{formatCurrency(summary.income)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-2">
          <p className="text-xs text-gray-500">รายจ่าย</p>
          <p className="text-sm font-bold text-red-600">{formatCurrency(summary.expense)}</p>
        </div>
        <div className={`rounded-xl p-2 ${summary.profit >= 0 ? 'bg-indigo-50' : 'bg-red-50'}`}>
          <p className="text-xs text-gray-500">กำไร</p>
          <p className={`text-sm font-bold ${summary.profit >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>{formatCurrency(summary.profit)}</p>
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {[
          { id: 'all', label: 'ทั้งหมด' },
          { id: 'income', label: 'รายรับ' },
          { id: 'expense', label: 'รายจ่าย' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setTypeFilter(tab.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
              typeFilter === tab.id
                ? tab.id === 'income'
                  ? 'bg-emerald-500 text-white shadow'
                  : tab.id === 'expense'
                    ? 'bg-red-500 text-white shadow'
                    : 'bg-indigo-600 text-white shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Project Filter */}
      <select
        value={filterProject}
        onChange={(e) => setFilterProject(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm"
      >
        <option value="">ทุกโปรเจกต์</option>
        {[...projects].reverse().map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {/* Transactions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>ไม่มีรายการ</p>
          </div>
        ) : (
          filteredTransactions.map((t, index) => (
            <div
              key={t.id}
              className={`p-4 flex items-center justify-between ${index !== filteredTransactions.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className="flex-1">
                <p className="font-medium text-gray-800">{t.description || t.category}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                  {t.projectId && (
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                      {getProjectName(t.projectId)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
                <button
                  onClick={() => onEdit(t)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <Edit3 className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={() => onDelete(t.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Owner Projects
const OwnerProjects = ({ projects, transactions, onAdd, onEdit }) => {
  const projectStats = useMemo(() => {
    return [...projects].sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === 'in_progress' ? -1 : 1;
    }).map(p => {
      const projectTransactions = transactions.filter(t => t.projectId === p.id);
      const income = projectTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = projectTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      return { ...p, income, expense, profit: income - expense };
    });
  }, [projects, transactions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">โปรเจกต์</h2>
        <button
          onClick={onAdd}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          เพิ่ม
        </button>
      </div>

      <div className="space-y-3">
        {projectStats.map(p => (
          <div
            key={p.id}
            onClick={() => onEdit(p)}
            className={`rounded-xl p-4 shadow-md cursor-pointer hover:shadow-lg transition ${
              p.status === 'completed'
                ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                : 'bg-gradient-to-br from-indigo-400 to-purple-500'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white">{p.name}</h3>
                <p className="text-sm text-white/70">{p.client}</p>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
                {p.status === 'completed' ? 'เสร็จสิ้น' : 'กำลังดำเนินการ'}
              </span>
            </div>
            {p.contractValue > 0 && (
              <div className="mb-3 flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-white/15">
                <span className="text-white/70">มูลค่างาน</span>
                <span className="font-semibold text-white">{formatCurrency(p.contractValue)}{p.status === 'completed' ? ' (เก็บเงินแล้ว)' : ''}</span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="bg-white/15 rounded-lg p-2 text-center">
                <p className="text-white/60 text-xs">รายรับ</p>
                <p className="font-semibold text-emerald-300 text-xs">{formatCurrency(p.income)}</p>
              </div>
              <div className="bg-white/15 rounded-lg p-2 text-center">
                <p className="text-white/60 text-xs">รายจ่าย</p>
                <p className="font-semibold text-red-300 text-xs">{formatCurrency(p.expense)}</p>
              </div>
              <div className="bg-white/15 rounded-lg p-2 text-center">
                <p className="text-white/60 text-xs">กำไร</p>
                <p className={`font-semibold text-xs ${p.profit >= 0 ? 'text-yellow-300' : 'text-red-300'}`}>
                  {formatCurrency(p.profit)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Password Reset Modal
const PasswordResetModal = ({ isOpen, onClose, staff, onReset }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 4) {
      setError('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsLoading(true);
    try {
      await onReset(staff.id, newPassword);
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !staff) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">ตั้งรหัสผ่านใหม่</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-indigo-50 rounded-xl p-3 text-center">
            <p className="text-sm text-gray-600">ตั้งรหัสผ่านให้</p>
            <p className="font-bold text-indigo-700">{staff.name}</p>
            <p className="text-xs text-gray-500">({staff.username})</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">รหัสผ่านใหม่</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="อย่างน้อย 4 ตัวอักษร"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="ใส่รหัสผ่านอีกครั้ง"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">เปลี่ยนรหัสผ่านสำเร็จ!</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || success}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            บันทึกรหัสผ่านใหม่
          </button>
        </form>
      </div>
    </div>
  );
};

// Wage Edit Modal
const WageEditModal = ({ isOpen, onClose, onSave, onUpdateHistoryDate, onDeleteHistoryEntry, onUpdateStartDate, staff, staffList }) => {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [newWage, setNewWage] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingEntry, setEditingEntry] = useState(null); // { originalDate, newDate }
  const [confirmDelete, setConfirmDelete] = useState(null); // { effectiveDate, dailyWage }
  const [editStartDate, setEditStartDate] = useState('');

  useEffect(() => {
    if (staff) {
      setSelectedStaffId(staff.username || staff.id);
      setNewWage('');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setEditingEntry(null);
      // โหลด startDate จาก staff data (ตัด timestamp ออกให้เหลือแค่ yyyy-mm-dd)
      const sd = staff.startDate || staff.start_date || '';
      setEditStartDate(sd ? sd.split('T')[0] : '');
    }
  }, [staff]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      staffId: selectedStaffId,
      dailyWage: parseFloat(newWage),
      effectiveDate
    });
    setSelectedStaffId('');
    setNewWage('');
    onClose();
  };

  if (!isOpen) return null;

  const selectedInfo = staffList?.find(s => s.id === selectedStaffId || s.username === selectedStaffId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">แก้ไขค่าแรงพนักงาน</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">พนักงาน</label>
            {staff ? (
              <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700">
                {staff.name} (@{staff.username})
              </div>
            ) : (
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                required
              >
                <option value="">-- เลือกพนักงาน --</option>
                {(staffList || []).filter(s => s.role !== 'owner').map(s => (
                  <option key={s.id || s.username} value={s.username || s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {selectedInfo && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-600 font-medium">ค่าแรงปัจจุบัน</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(selectedInfo.dailyWage || selectedInfo.daily_wage || 0)}/วัน</p>
            </div>
          )}

          {/* แก้ไขวันเริ่มงาน */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-medium text-gray-600">วันเริ่มงาน</p>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => {
                  if (editStartDate && selectedStaffId && onUpdateStartDate) {
                    onUpdateStartDate({ staffId: selectedStaffId, startDate: editStartDate });
                  }
                }}
                className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition whitespace-nowrap"
              >
                บันทึก
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ค่าแรงใหม่ (บาท/วัน)</label>
            <input
              type="number"
              value={newWage}
              onChange={(e) => setNewWage(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="0"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">วันที่มีผล (ค่าแรงเก่าจะใช้ถึงก่อนวันนี้)</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              required
            />
          </div>

          {newWage && effectiveDate && selectedInfo && (
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
              <p className="text-xs font-medium text-emerald-700 mb-1">ตัวอย่างการคำนวณ</p>
              <p className="text-xs text-emerald-600">
                ก่อน {formatDate(effectiveDate)}: ใช้ค่าแรงเดิม {formatCurrency(selectedInfo.dailyWage || 0)}/วัน
              </p>
              <p className="text-xs text-emerald-600">
                ตั้งแต่ {formatDate(effectiveDate)}: ใช้ค่าแรงใหม่ {formatCurrency(parseFloat(newWage))}/วัน
              </p>
            </div>
          )}

          {selectedInfo?.wageHistory?.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 mb-2">ประวัติค่าแรง</p>
              <div className="space-y-1.5">
                {[...selectedInfo.wageHistory].sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate)).map((h, i) => (
                  editingEntry?.originalDate === h.effectiveDate ? (
                    <div key={i} className="flex items-center gap-2 bg-white border border-indigo-200 rounded-lg px-2 py-1.5">
                      <input
                        type="date"
                        value={editingEntry.newDate}
                        onChange={(e) => setEditingEntry(prev => ({ ...prev, newDate: e.target.value }))}
                        className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <span className="text-xs text-gray-600 whitespace-nowrap">{formatCurrency(h.dailyWage)}/วัน</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (editingEntry.newDate && onUpdateHistoryDate) {
                            onUpdateHistoryDate({
                              staffId: selectedStaffId,
                              originalDate: editingEntry.originalDate,
                              newDate: editingEntry.newDate
                            });
                          }
                          setEditingEntry(null);
                        }}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition"
                        title="บันทึก"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingEntry(null)}
                        className="p-1 text-gray-400 hover:bg-gray-100 rounded transition"
                        title="ยกเลิก"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div key={i} className="flex items-center justify-between text-xs group">
                      <span className="text-gray-500">{formatDate(h.effectiveDate)}</span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-700">{formatCurrency(h.dailyWage)}/วัน</span>
                        <button
                          type="button"
                          onClick={() => setEditingEntry({ originalDate: h.effectiveDate, newDate: h.effectiveDate })}
                          className="p-1 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition opacity-0 group-hover:opacity-100"
                          title="แก้ไขวันที่"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete({ effectiveDate: h.effectiveDate, dailyWage: h.dailyWage })}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition opacity-0 group-hover:opacity-100"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Confirm Delete Popup */}
          {confirmDelete && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40">
              <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-xs w-full text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="font-bold text-gray-800 mb-1">ยืนยันการลบ?</h3>
                <p className="text-sm text-gray-500 mb-1">
                  ค่าแรง <span className="font-semibold text-gray-700">{formatCurrency(confirmDelete.dailyWage)}/วัน</span>
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  วันที่มีผล <span className="font-semibold text-gray-700">{formatDate(confirmDelete.effectiveDate)}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteHistoryEntry) {
                        onDeleteHistoryEntry({ staffId: selectedStaffId, effectiveDate: confirmDelete.effectiveDate });
                      }
                      setConfirmDelete(null);
                    }}
                    className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition"
                  >
                    ลบเลย
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
          >
            บันทึกค่าแรงใหม่
          </button>
        </form>
      </div>
    </div>
  );
};

// Owner Staff Management
const OwnerStaff = ({ staffData, attendance, advances, bonuses, onAddAdvance, onAddBonus, onAddAttendance, onEditAttendance, onResetPassword, onEditWage, positions = {}, onSavePosition, onSaveLevel }) => {
  const currentMonth = getCurrentMonth();
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingPositionId, setEditingPositionId] = useState(null);
  const [positionInput, setPositionInput] = useState('');
  const [expandedAdvancesId, setExpandedAdvancesId] = useState(null);
  const [editingLevelId, setEditingLevelId] = useState(null);
  const [levelInput, setLevelInput] = useState('');

  // คำนวณจำนวนวันทำงาน (รวมทุกวัน)
  const calculateWorkingDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
  };

  const allStaffStats = useMemo(() => {
    const today = new Date();
    return staffData
      .filter(s => s.active !== false)
      .map(staff => {
        const monthAttendance = attendance[staff.username]?.[currentMonth] || {
          workDays: 0, lateDays: 0, absentDays: 0, leaveDays: 0
        };
        const monthAdvances = advances.filter(a => a.staffId === staff.username && a.month === currentMonth);
        const totalAdvance = monthAdvances.reduce((sum, a) => sum + a.amount, 0);

        const dailyWage = staff.daily_wage || staff.dailyWage || 0;

        // คำนวณวันทำงานจากวันเริ่มงานใน Sheet
        const startDate = staff.start_date || staff.startDate || staff.created_at;
        const workingDaysFromStart = startDate ? calculateWorkingDays(startDate, today) : 0;

        // เงินพิเศษเดือนนี้ (จาก bonuses array)
        const monthBonusList = (bonuses || []).filter(b => b.staffId === staff.username && b.month === currentMonth);
        const monthBonus = monthBonusList.reduce((sum, b) => sum + b.amount, 0);
        const grossPay = dailyWage * monthAttendance.workDays + monthBonus;
        const monthDeductions = (monthAttendance.lateDays * 50) + (monthAttendance.absentDays * 300);
        const netSalary = grossPay - monthDeductions - totalAdvance;

        // รายได้รวมตั้งแต่วันเริ่มงาน (คำนวณจาก wageHistory + เงินพิเศษสะสม)
        const wageHistory = staff.wageHistory || [{ dailyWage, effectiveDate: startDate || '2025-01-01' }];
        const staffAttendance = attendance[staff.username] || {};
        const allStaffBonuses = (bonuses || []).filter(b => b.staffId === staff.username);
        const totalAllBonuses = allStaffBonuses.reduce((sum, b) => sum + b.amount, 0);
        const totalWageEarnings = calculateEarningsFromAttendance(wageHistory, staffAttendance)
          ?? calculateEarningsWithHistory(wageHistory, startDate, today);
        const totalEarnings = totalWageEarnings + totalAllBonuses;

        // คำนวณเงินเบิกทั้งหมด (ทุกเดือน) จาก Sheet
        const allTimeAdvances = advances.filter(a => a.staffId === staff.username);
        const totalAllAdvances = allTimeAdvances.reduce((sum, a) => sum + a.amount, 0);

        // คำนวณหักสาย/ขาด ทุกเดือนจาก attendance Sheet
        const totalAllDeductions = Object.values(staffAttendance).reduce((sum, m) => {
          return sum + ((m.lateDays || 0) * 50) + ((m.absentDays || 0) * 300);
        }, 0);

        // รายได้สุทธิตั้งแต่เริ่มงาน = รายได้รวม - เบิกทั้งหมด - หักสาย/ขาดทั้งหมด
        const netTotalEarnings = totalEarnings - totalAllAdvances - totalAllDeductions;

        return {
          ...staff,
          dailyWage,
          wageHistory,
          attendance: monthAttendance,
          totalAdvance,
          grossPay,
          monthBonus,
          monthBonusList,
          deductions: monthDeductions,
          netSalary,
          startDate,
          workingDaysFromStart,
          totalWageEarnings,
          totalEarnings,
          totalAllBonuses,
          totalAllAdvances,
          totalAllDeductions,
          netTotalEarnings
        };
      });
  }, [staffData, attendance, advances, bonuses, currentMonth]);

  // คำนวณค่าใช้จ่ายพนักงานรายวันรวม (สำหรับใช้คำนวณต้นทุน)
  const dailyStaffExpense = useMemo(() => {
    return allStaffStats
      .filter(s => s.role === 'staff')
      .reduce((sum, s) => sum + s.dailyWage, 0);
  }, [allStaffStats]);

  const handleResetPassword = (staff) => {
    setSelectedStaff(staff);
    setShowPasswordModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">พนักงาน</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddAttendance}
            className="bg-purple-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition flex items-center gap-1"
          >
            <Clock className="w-4 h-4" />
            บันทึกเวลา
          </button>
          <button
            onClick={onAddBonus}
            className="bg-amber-500 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-amber-600 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            เงินพิเศษ
          </button>
          <button
            onClick={onAddAdvance}
            className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            บันทึกเบิก
          </button>
        </div>
      </div>

      {/* สรุปค่าใช้จ่ายพนักงานรายวัน */}
      <div className="bg-gradient-to-r from-indigo-400 to-purple-500 rounded-xl p-4 text-white">
        <p className="text-sm opacity-90">ค่าใช้จ่ายพนักงานต่อวัน (โดยประมาณ)</p>
        <p className="text-2xl font-bold">{formatCurrency(dailyStaffExpense)}</p>
        <p className="text-xs opacity-75 mt-1">รวมค่าแรงพนักงานทุกคน/วัน</p>
      </div>

      <p className="text-sm text-gray-500">เดือน {currentMonth}</p>

      <div className="space-y-3">
        {allStaffStats.map(staff => (
          <div key={staff.id} className="bg-gradient-to-br from-slate-500 to-slate-700 rounded-xl p-4 shadow-md">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white">{staff.name}</h3>
                <p className="text-sm text-white/60 flex items-center gap-1">
                  {staff.role === 'owner' ? 'เจ้าของกิจการ' : (
                    <>
                      ค่าแรง/วัน: {formatCurrency(staff.dailyWage)}
                      <button
                        onClick={() => onEditWage(staff)}
                        className="p-0.5 hover:bg-white/20 rounded transition"
                        title="แก้ไขค่าแรง"
                      >
                        <Edit3 className="w-3 h-3 text-white/70" />
                      </button>
                    </>
                  )}
                </p>
                <p className="text-xs text-white/40">@{staff.username}</p>
                {staff.role === 'staff' && (
                  <div className="mt-1">
                    {editingPositionId === (staff.username || staff.id) ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={positionInput}
                          onChange={e => setPositionInput(e.target.value)}
                          placeholder="ระบุตำแหน่ง..."
                          className="text-xs border border-white/30 bg-white/10 text-white rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-white/50 w-36 placeholder-white/40"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') { onSavePosition(staff.username || staff.id, positionInput); setEditingPositionId(null); }
                            if (e.key === 'Escape') setEditingPositionId(null);
                          }}
                        />
                        <button onClick={() => { onSavePosition(staff.username || staff.id, positionInput); setEditingPositionId(null); }} className="p-0.5 text-emerald-400 hover:bg-white/10 rounded">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingPositionId(null)} className="p-0.5 text-white/40 hover:bg-white/10 rounded">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/15 text-white/80">
                          {positions[staff.username || staff.id] || staff.position || 'ยังไม่ระบุตำแหน่ง'}
                        </span>
                        <button
                          onClick={() => { setEditingPositionId(staff.username || staff.id); setPositionInput(positions[staff.username || staff.id] || ''); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition"
                          title="แก้ไขตำแหน่ง"
                        >
                          <Edit3 className="w-3 h-3 text-white/50" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {staff.role === 'staff' && staff.startDate && (
                  <p className="text-xs text-white/40 mt-0.5">
                    เริ่มงาน: {formatDate(staff.startDate)} ({staff.workingDaysFromStart} วันทำงาน)
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {staff.role === 'staff' && (
                  editingLevelId === (staff.username || staff.id) ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-white/50">Lv.</span>
                      <input
                        type="number"
                        value={levelInput}
                        onChange={e => setLevelInput(e.target.value)}
                        className="w-14 text-center text-sm font-bold bg-white/10 border border-white/30 text-white rounded-lg px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                        min="1" max="99" autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') { onSaveLevel(staff.username || staff.id, levelInput); setEditingLevelId(null); }
                          if (e.key === 'Escape') setEditingLevelId(null);
                        }}
                      />
                      <button onClick={() => { onSaveLevel(staff.username || staff.id, levelInput); setEditingLevelId(null); }} className="p-0.5 text-emerald-400 hover:bg-white/10 rounded">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingLevelId(null)} className="p-0.5 text-white/40 hover:bg-white/10 rounded">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingLevelId(staff.username || staff.id); setLevelInput(String(staff.level || 1)); }}
                      className="flex flex-col items-center bg-gradient-to-b from-yellow-400 to-amber-500 rounded-lg px-2.5 py-1 shadow-sm hover:from-yellow-300 hover:to-amber-400 transition"
                      title="กดเพื่อแก้ไข Level"
                    >
                      <span className="text-xs font-bold text-amber-900 leading-none">Lv.</span>
                      <span className="text-lg font-black text-amber-900 leading-tight">{staff.level || 1}</span>
                    </button>
                  )
                )}
                <button
                  onClick={() => handleResetPassword(staff)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                  title="ตั้งรหัสผ่านใหม่"
                >
                  <Lock className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>
            {staff.role === 'staff' && (
              <>
                {/* รายได้รวมตั้งแต่เริ่มงาน */}
                <div className="bg-white/10 rounded-lg p-3 mb-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white/60">รายได้รวม ({staff.workingDaysFromStart} วัน)</span>
                      <span className="text-sm font-bold text-blue-300">{formatCurrency(staff.totalWageEarnings)}</span>
                    </div>
                    {staff.totalAllBonuses > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-white/60">ค่าแรงพิเศษสะสม</span>
                        <span className="text-sm font-semibold text-yellow-300">+{formatCurrency(staff.totalAllBonuses)}</span>
                      </div>
                    )}
                    <button
                      className="flex justify-between items-center w-full hover:bg-white/10 rounded transition px-1 -mx-1"
                      onClick={() => setExpandedAdvancesId(expandedAdvancesId === staff.username ? null : staff.username)}
                    >
                      <span className="text-xs text-white/60 flex items-center gap-1">
                        หักเบิกแล้ว
                        <ChevronDown className={`w-3 h-3 text-purple-300 transition-transform ${expandedAdvancesId === staff.username ? 'rotate-180' : ''}`} />
                      </span>
                      <span className="text-sm font-semibold text-purple-300">-{formatCurrency(staff.totalAllAdvances)}</span>
                    </button>
                    {staff.totalAllDeductions > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-white/60">หักสาย/ขาด</span>
                        <span className="text-sm font-semibold text-red-300">-{formatCurrency(staff.totalAllDeductions)}</span>
                      </div>
                    )}
                    <div className="border-t border-white/20 pt-2 flex justify-between items-center">
                      <span className="text-xs font-medium text-white/70">คงเหลือสุทธิ</span>
                      <span className={`text-lg font-bold ${staff.netTotalEarnings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(staff.netTotalEarnings)}
                      </span>
                    </div>
                  </div>
                </div>
                {/* ประวัติค่าแรง */}
                {staff.wageHistory && staff.wageHistory.length > 1 && (
                  <div className="bg-white/10 rounded-lg p-2 mb-3">
                    <p className="text-xs font-medium text-white/50 mb-1">ประวัติค่าแรง</p>
                    <div className="space-y-0.5">
                      {[...staff.wageHistory].sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate)).map((h, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-white/40">{formatDate(h.effectiveDate)}</span>
                          <span className={`font-medium ${i === 0 ? 'text-blue-300' : 'text-white/50'}`}>{formatCurrency(h.dailyWage)}/วัน</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* สถิติเดือนนี้ */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-white/50">สถิติเดือนนี้</p>
                  <button
                    onClick={() => onEditAttendance(staff)}
                    className="text-xs text-blue-300 hover:text-blue-200 flex items-center gap-1 transition"
                  >
                    <Edit3 className="w-3 h-3" />
                    แก้ไข
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="bg-emerald-500/30 rounded-lg p-2 text-center">
                    <p className="font-semibold text-emerald-300">{staff.attendance.workDays}</p>
                    <p className="text-white/50">วันทำงาน</p>
                  </div>
                  <div className="bg-yellow-500/30 rounded-lg p-2 text-center">
                    <p className="font-semibold text-yellow-300">{staff.attendance.lateDays}</p>
                    <p className="text-white/50">สาย</p>
                  </div>
                  <div className="bg-red-500/30 rounded-lg p-2 text-center">
                    <p className="font-semibold text-red-300">{staff.attendance.absentDays}</p>
                    <p className="text-white/50">ขาด</p>
                  </div>
                  <div className="bg-purple-500/30 rounded-lg p-2 text-center">
                    <p className="font-semibold text-purple-300">{formatCurrency(staff.totalAdvance)}</p>
                    <p className="text-white/50">เบิกเดือนนี้</p>
                  </div>
                </div>
                {staff.monthBonusList?.length > 0 && (
                  <div className="mt-2 bg-amber-500/20 rounded-lg p-2 space-y-1">
                    <p className="text-xs font-medium text-yellow-300">เงินพิเศษเดือนนี้ (+{formatCurrency(staff.monthBonus)})</p>
                    {staff.monthBonusList.map((b, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-white/50">{formatDate(b.date)} · {b.description}</span>
                        <span className="font-semibold text-yellow-300">{formatCurrency(b.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ประวัติเบิกเงินทั้งหมด (expandable) */}
                {expandedAdvancesId === staff.username && (
                  <div className="mt-2 bg-purple-500/20 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-purple-300">ประวัติเบิกเงินทั้งหมด</p>
                    {(() => {
                      const staffAdvances = advances
                        .filter(a => a.staffId === staff.username)
                        .sort((a, b) => new Date(b.date) - new Date(a.date));
                      if (staffAdvances.length === 0) {
                        return <p className="text-xs text-white/40 text-center py-2">ยังไม่มีรายการเบิกเงิน</p>;
                      }
                      return staffAdvances.map((adv, i) => (
                        <div key={adv.id || i} className="flex justify-between items-start text-xs border-b border-white/10 pb-1 last:border-0 last:pb-0">
                          <div>
                            <p className="font-medium text-white/80">{adv.description || 'เบิกเงิน'}</p>
                            <p className="text-white/40">{formatDate(adv.date)} · เดือน {adv.month || '-'}</p>
                          </div>
                          <span className="font-semibold text-purple-300 shrink-0 ml-2">{formatCurrency(adv.amount)}</span>
                        </div>
                      ));
                    })()}
                    <div className="border-t border-white/20 pt-1 flex justify-between text-xs font-semibold">
                      <span className="text-purple-300">รวมทั้งหมด</span>
                      <span className="text-purple-300">{formatCurrency(staff.totalAllAdvances)}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <PasswordResetModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setSelectedStaff(null);
        }}
        staff={selectedStaff}
        onReset={onResetPassword}
      />

      <div className="bg-indigo-50 rounded-xl p-4 mt-4">
        <p className="text-sm text-indigo-700 font-medium mb-1">จัดการผู้ใช้ผ่าน Supabase Dashboard</p>
        <ul className="text-xs text-indigo-600 space-y-1 list-disc list-inside">
          <li>เพิ่ม/ลบ user: Authentication &gt; Users</li>
          <li>เปลี่ยนรหัสผ่าน: คลิก ⋮ ข้าง user &gt; Reset password</li>
          <li>แก้ไขข้อมูล: Table Editor &gt; profiles</li>
        </ul>
      </div>
    </div>
  );
};

// Staff Dashboard
const StaffDashboard = ({ user, attendance, advances, bonuses, staffData, positions = {}, onRefresh, isLoading, dataLoaded }) => {
  const currentMonth = getCurrentMonth();
  const [viewMode, setViewMode] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  const username = user.profile?.username || user.username || user.email?.split('@')[0];
  const staffInfo = staffData.find(s => s.username === username || s.id === user.id) || {
    id: user.id,
    username,
    name: user.profile?.name || user.name || username,
    role: 'staff',
    dailyWage: parseFloat(user.profile?.daily_wage || user.daily_wage) || 0,
    daily_wage: parseFloat(user.profile?.daily_wage || user.daily_wage) || 0,
    wageHistory: [],
    startDate: user.profile?.start_date || user.start_date || null,
    start_date: user.profile?.start_date || user.start_date || null,
    position: user.profile?.position || user.position || '',
  };

  // รายการเดือนที่มีข้อมูล
  const availableMonths = useMemo(() => {
    const userAttendance = attendance[username] || {};
    const months = Object.keys(userAttendance).sort().reverse();
    if (months.length === 0) months.push(currentMonth);
    if (!months.includes(currentMonth)) months.unshift(currentMonth);
    return months;
  }, [attendance, username, currentMonth]);

  // คำนวณช่วงสัปดาห์นี้ (จันทร์-อาทิตย์)
  const weekRange = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }, []);

  const stats = useMemo(() => {
    const userAttendance = attendance[username] || {};
    const dailyWage = staffInfo?.daily_wage || staffInfo?.dailyWage || 0;
    const wageHistory = staffInfo?.wageHistory?.length > 0
      ? staffInfo.wageHistory
      : [{ dailyWage, effectiveDate: staffInfo?.start_date || staffInfo?.startDate || '2025-01-01' }];
    const sortedWH = [...wageHistory].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));
    // fallback startDate จาก wageHistory ถ้าไม่ได้ตั้งค่าไว้
    const startDate = staffInfo?.start_date || staffInfo?.startDate || staffInfo?.created_at || sortedWH[0]?.effectiveDate;

    let aggregatedAttendance = { workDays: 0, lateDays: 0, absentDays: 0, leaveDays: 0 };
    let filteredAdvances = [];
    let filteredBonuses = [];
    let totalEarningsFromHistory = null;

    const userBonuses = (bonuses || []).filter(b => b.staffId === username);

    if (viewMode === 'week') {
      const startMonth = `${weekRange.start.getFullYear()}-${String(weekRange.start.getMonth() + 1).padStart(2, '0')}`;
      const endMonth = `${weekRange.end.getFullYear()}-${String(weekRange.end.getMonth() + 1).padStart(2, '0')}`;
      const monthsInRange = new Set([startMonth, endMonth]);
      monthsInRange.forEach(m => {
        const mData = userAttendance[m];
        if (mData) {
          aggregatedAttendance.workDays += mData.workDays || 0;
          aggregatedAttendance.lateDays += mData.lateDays || 0;
          aggregatedAttendance.absentDays += mData.absentDays || 0;
          aggregatedAttendance.leaveDays += mData.leaveDays || 0;
        }
      });
      filteredAdvances = advances.filter(a => {
        if (a.staffId !== username || !a.date) return false;
        const d = new Date(a.date);
        return d >= weekRange.start && d <= weekRange.end;
      });
      filteredBonuses = userBonuses.filter(b => {
        if (!b.date) return false;
        const d = new Date(b.date);
        return d >= weekRange.start && d <= weekRange.end;
      });
    } else if (viewMode === 'month') {
      const mData = userAttendance[selectedMonth] || {};
      aggregatedAttendance = {
        workDays: mData.workDays || 0,
        lateDays: mData.lateDays || 0,
        absentDays: mData.absentDays || 0,
        leaveDays: mData.leaveDays || 0
      };
      filteredAdvances = advances.filter(a => a.staffId === username && a.month === selectedMonth);
      filteredBonuses = userBonuses.filter(b => b.month === selectedMonth);
    } else if (viewMode === 'custom' && customRange.start && customRange.end) {
      const rangeStart = new Date(customRange.start);
      const rangeEnd = new Date(customRange.end);
      rangeEnd.setHours(23, 59, 59, 999);
      Object.keys(userAttendance).forEach(m => {
        const [y, mo] = m.split('-').map(Number);
        const monthStart = new Date(y, mo - 1, 1);
        const monthEnd = new Date(y, mo, 0, 23, 59, 59, 999);
        if (monthEnd >= rangeStart && monthStart <= rangeEnd) {
          const mData = userAttendance[m];
          aggregatedAttendance.workDays += mData.workDays || 0;
          aggregatedAttendance.lateDays += mData.lateDays || 0;
          aggregatedAttendance.absentDays += mData.absentDays || 0;
          aggregatedAttendance.leaveDays += mData.leaveDays || 0;
        }
      });
      filteredAdvances = advances.filter(a => {
        if (a.staffId !== username || !a.date) return false;
        const d = new Date(a.date);
        return d >= rangeStart && d <= rangeEnd;
      });
      filteredBonuses = userBonuses.filter(b => {
        if (!b.date) return false;
        const d = new Date(b.date);
        return d >= rangeStart && d <= rangeEnd;
      });
    } else if (viewMode === 'all') {
      Object.values(userAttendance).forEach(mData => {
        aggregatedAttendance.workDays += mData.workDays || 0;
        aggregatedAttendance.lateDays += mData.lateDays || 0;
        aggregatedAttendance.absentDays += mData.absentDays || 0;
        aggregatedAttendance.leaveDays += mData.leaveDays || 0;
      });
      filteredAdvances = advances.filter(a => a.staffId === username);
      filteredBonuses = userBonuses;
      const today = new Date().toISOString().split('T')[0];
      totalEarningsFromHistory = calculateEarningsFromAttendance(wageHistory, userAttendance)
        ?? calculateEarningsWithHistory(wageHistory, startDate, today);
    }

    const totalAdvance = filteredAdvances.reduce((sum, a) => sum + a.amount, 0);
    const bonusAmount = filteredBonuses.reduce((sum, b) => sum + b.amount, 0);
    const grossPay = viewMode === 'all' && totalEarningsFromHistory !== null
      ? totalEarningsFromHistory + bonusAmount
      : dailyWage * aggregatedAttendance.workDays + bonusAmount;
    const deductions = (aggregatedAttendance.lateDays * 50) + (aggregatedAttendance.absentDays * 300);
    const netSalary = grossPay - deductions - totalAdvance;
    // เบิกได้อีก: คำนวณจากเดือนปัจจุบันเสมอ (ไม่ขึ้นกับ viewMode)
    const currentMonthData = userAttendance[currentMonth] || {};
    const currentMonthWagePay = dailyWage * (currentMonthData.workDays || 0);
    const currentMonthAdvances = advances.filter(a => a.staffId === username && a.month === currentMonth);
    const currentMonthTotalAdvance = currentMonthAdvances.reduce((sum, a) => sum + a.amount, 0);
    const remainingAdvance = Math.max(0, currentMonthWagePay * 0.5 - currentMonthTotalAdvance);

    // คำนวณวันทำงานรวมจากวันเริ่มงาน
    const workingDaysFromStart = startDate
      ? Math.max(0, Math.floor((new Date() - new Date(startDate)) / 86400000) + 1)
      : 0;

    // ยอดสะสมทั้งหมด
    const allTimeAdvances = advances.filter(a => a.staffId === username);
    const totalAllAdvances = allTimeAdvances.reduce((sum, a) => sum + a.amount, 0);
    const staffAttendanceAll = attendance[username] || {};
    const totalAllDeductions = Object.values(staffAttendanceAll).reduce((sum, m) => {
      return sum + ((m.lateDays || 0) * 50) + ((m.absentDays || 0) * 300);
    }, 0);
    const totalAllBonuses = userBonuses.reduce((sum, b) => sum + b.amount, 0);
    const todayStr = new Date().toISOString().split('T')[0];
    // totalWageEarnings = เฉพาะค่าแรงตาม wageHistory (ใช้วันทำงานจริง)
    const totalWageEarnings = calculateEarningsFromAttendance(wageHistory, userAttendance)
      ?? calculateEarningsWithHistory(wageHistory, startDate, todayStr);
    // totalEarnings = ค่าแรง + เงินพิเศษสะสมทั้งหมด
    const totalEarnings = totalWageEarnings + totalAllBonuses;
    const netTotalEarnings = totalEarnings - totalAllAdvances - totalAllDeductions;

    return {
      dailyWage,
      grossPay,
      bonusAmount,
      filteredBonuses,
      attendance: aggregatedAttendance,
      advances: filteredAdvances,
      totalAdvance,
      deductions,
      netSalary,
      remainingAdvance,
      wageHistory,
      startDate,
      workingDaysFromStart,
      useWageHistory: viewMode === 'all' && totalEarningsFromHistory !== null,
      totalWageEarnings,
      totalEarnings,
      totalAllBonuses,
      totalAllAdvances,
      totalAllDeductions,
      netTotalEarnings
    };
  }, [user, attendance, advances, bonuses, staffData, viewMode, selectedMonth, customRange, weekRange, username, staffInfo, currentMonth]);

  const displayName = staffInfo?.name || user.profile?.name || user.name || user.email?.split('@')[0] || 'พนักงาน';

  // ข้อความแสดง period ที่เลือก
  const periodLabel = useMemo(() => {
    if (viewMode === 'week') {
      const s = weekRange.start;
      const e = weekRange.end;
      return `สัปดาห์ ${String(s.getDate()).padStart(2, '0')}/${String(s.getMonth() + 1).padStart(2, '0')} - ${String(e.getDate()).padStart(2, '0')}/${String(e.getMonth() + 1).padStart(2, '0')}/${e.getFullYear()}`;
    }
    if (viewMode === 'month') {
      const [y, m] = selectedMonth.split('-');
      return `เดือน ${m}/${y}`;
    }
    if (viewMode === 'custom') {
      if (customRange.start && customRange.end) {
        return `${formatDate(customRange.start)} - ${formatDate(customRange.end)}`;
      }
      return 'กำหนดเอง (เลือกช่วงวัน)';
    }
    return 'ทั้งหมดตั้งแต่เริ่มงาน';
  }, [viewMode, selectedMonth, customRange, weekRange]);

  const viewModes = [
    { key: 'week', label: 'สัปดาห์นี้' },
    { key: 'month', label: 'รายเดือน' },
    { key: 'custom', label: 'กำหนดเอง' },
    { key: 'all', label: 'ทั้งหมด' }
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-emerald-100">สวัสดี,</p>
            <h2 className="text-2xl font-bold">{displayName}</h2>
            {(positions[username] || staffInfo?.position) && (
              <span className="inline-block mt-1 bg-white/20 text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                {positions[username] || staffInfo?.position}
              </span>
            )}
            <p className="text-emerald-100 text-sm mt-1">{periodLabel}</p>
          </div>
          {staffInfo?.level > 0 && (
            <div className="flex flex-col items-center bg-gradient-to-b from-yellow-400 to-amber-500 rounded-xl px-3 py-2 shadow-md shrink-0">
              <span className="text-xs font-bold text-amber-900 leading-none">Lv.</span>
              <span className="text-3xl font-black text-amber-900 leading-tight">{staffInfo.level}</span>
            </div>
          )}
        </div>
      </div>

      {/* ยอดสะสมตั้งแต่เริ่มงาน (ตรงกับฝั่ง Admin) */}
      {stats.startDate && (
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl p-4 shadow-md">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-white/80" />
            ยอดสะสมตั้งแต่เริ่มงาน
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/60">รายได้รวม ({stats.workingDaysFromStart} วัน)</span>
              <span className="text-sm font-bold text-blue-200">{formatCurrency(stats.totalWageEarnings)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/60">เงินพิเศษสะสม</span>
              <span className="text-sm font-semibold text-yellow-300">+{formatCurrency(stats.totalAllBonuses)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/60">หักเบิกแล้ว</span>
              <span className="text-sm font-semibold text-purple-300">-{formatCurrency(stats.totalAllAdvances)}</span>
            </div>
            {stats.totalAllDeductions > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/60">หักสาย/ขาด</span>
                <span className="text-sm font-semibold text-red-300">-{formatCurrency(stats.totalAllDeductions)}</span>
              </div>
            )}
            <div className="border-t border-white/20 pt-2 flex justify-between items-center">
              <span className="text-xs font-medium text-white/70">คงเหลือสุทธิ</span>
              <span className={`text-xl font-bold ${stats.netTotalEarnings >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {formatCurrency(stats.netTotalEarnings)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Period Tabs */}
      <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100">
        <div className="flex gap-1">
          {viewModes.map(mode => (
            <button
              key={mode.key}
              onClick={() => setViewMode(mode.key)}
              className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-colors ${viewMode === mode.key
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100'
                }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Month Selector */}
        {viewMode === 'month' && (
          <div className="mt-2 px-1">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {/* Custom Date Range */}
        {viewMode === 'custom' && (
          <div className="mt-2 px-1 flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">เริ่มต้น</label>
              <input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">สิ้นสุด</label>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Salary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard
          title="ค่าแรง/วัน"
          value={formatCurrency(stats.dailyWage)}
          icon={Wallet}
          color="emerald"
        />
        <StatsCard
          title="รับจริง"
          value={formatCurrency(stats.netSalary)}
          icon={DollarSign}
          color={stats.netSalary > 0 ? 'emerald' : 'red'}
        />
        <StatsCard
          title="เบิกไปแล้ว"
          value={formatCurrency(stats.totalAdvance)}
          icon={CreditCard}
          color="purple"
        />
        <StatsCard
          title="เบิกได้อีก"
          value={formatCurrency(stats.remainingAdvance)}
          subtitle="(เดือนนี้ ≤50%)"
          icon={ArrowUpRight}
          color="indigo"
        />
      </div>

      {/* Attendance Summary */}
      <div className="bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl p-4 shadow-md">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-white/70" />
            {viewMode === 'all' ? 'สรุปการทำงานทั้งหมด' : viewMode === 'week' ? 'สรุปการทำงาน (เดือนนี้)' : viewMode === 'custom' ? 'สรุปการทำงานช่วงที่เลือก' : 'สรุปการทำงานเดือนนี้'}
          </h3>
          {viewMode === 'week' && (
            <span className="text-xs text-white/50 bg-white/10 rounded px-2 py-0.5">ข้อมูลรายเดือน</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-emerald-500/30 rounded-xl p-3 text-center">
            <CheckCircle className="w-6 h-6 text-emerald-300 mx-auto mb-1" />
            <p className="text-2xl font-bold text-emerald-300">{stats.attendance.workDays}</p>
            <p className="text-xs text-white/50">วันทำงาน</p>
          </div>
          <div className="bg-blue-500/30 rounded-xl p-3 text-center">
            <Calendar className="w-6 h-6 text-blue-300 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-300">{stats.attendance.leaveDays}</p>
            <p className="text-xs text-white/50">ลางาน</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-yellow-500/30 rounded-xl p-3 text-center">
            <Clock className="w-6 h-6 text-yellow-300 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-300">{stats.attendance.lateDays}</p>
            <p className="text-xs text-white/50">มาสาย</p>
          </div>
          <div className="bg-red-500/30 rounded-xl p-3 text-center">
            <XCircle className="w-6 h-6 text-red-300 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-300">{stats.attendance.absentDays}</p>
            <p className="text-xs text-white/50">ขาดงาน</p>
          </div>
        </div>
      </div>

      {/* Wage History (mode: all, ถ้ามีมากกว่า 1 entry) */}
      {viewMode === 'all' && stats.wageHistory && stats.wageHistory.length > 1 && (
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 shadow-md">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-white/70" />
            ประวัติค่าแรง
          </h3>
          <div className="space-y-2">
            {[...stats.wageHistory].sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate)).map((h, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-white/20 last:border-0">
                <span className="text-white/60 text-sm">ตั้งแต่ {formatDate(h.effectiveDate)}</span>
                <span className={`font-semibold ${i === 0 ? 'text-yellow-300' : 'text-white/70'}`}>{formatCurrency(h.dailyWage)}/วัน</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Salary Breakdown */}
      <div className="bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl p-4 shadow-md">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-white/70" />
          {viewMode === 'all' ? 'สรุปรายได้ทั้งหมด' : 'สรุปเงินเดือน'}
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b border-white/20">
            <span className="text-white/60 text-sm">
              {stats.useWageHistory
                ? stats.attendance.workDays > 0
                  ? `ค่าแรงรวม (${stats.attendance.workDays} วัน)`
                  : 'ค่าแรงรวม'
                : `ค่าแรง (${stats.attendance.workDays} วัน x ${formatCurrency(stats.dailyWage)})`
              }
            </span>
            <span className="font-medium text-emerald-300">
              {formatCurrency(stats.grossPay - stats.bonusAmount)}
            </span>
          </div>
          <div className="border-b border-white/20">
            <div className="flex justify-between py-2">
              <span className="text-white/60 text-sm">รวมเงินพิเศษ</span>
              <span className="font-medium text-yellow-300">+{formatCurrency(stats.bonusAmount)}</span>
            </div>
            {stats.filteredBonuses?.length > 0 && (
              <div className="pb-2 space-y-1">
                {stats.filteredBonuses.map((b, i) => (
                  <div key={i} className="flex justify-between items-center pl-3">
                    <span className="text-xs text-white/40 truncate max-w-[65%]">
                      · {b.description} <span className="text-white/30">({formatDate(b.date)})</span>
                    </span>
                    <span className="text-xs text-yellow-300">+{formatCurrency(b.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-between py-2 border-b border-white/20">
            <span className="text-white/60 text-sm">หักสาย ({stats.attendance.lateDays} วัน x 50B)</span>
            <span className="text-red-300">-{formatCurrency(stats.attendance.lateDays * 50)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/20">
            <span className="text-white/60 text-sm">หักขาด ({stats.attendance.absentDays} วัน x 300B)</span>
            <span className="text-red-300">-{formatCurrency(stats.attendance.absentDays * 300)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/20">
            <span className="text-white/60 text-sm">หักเบิกเงิน</span>
            <span className="text-red-300">-{formatCurrency(stats.totalAdvance)}</span>
          </div>
          <div className="flex justify-between py-3 bg-white/15 rounded-lg px-3 -mx-1 mt-1">
            <span className="font-semibold text-white">รวมรับจริง</span>
            <span className={`font-bold text-xl ${stats.netSalary >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{formatCurrency(stats.netSalary)}</span>
          </div>
        </div>
      </div>

      {/* Start Date Info (mode: all) */}
      {viewMode === 'all' && stats.startDate && (
        <div className="bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-white/80">
            เริ่มงานตั้งแต่: <span className="font-semibold text-white">{formatDate(stats.startDate)}</span>
          </p>
        </div>
      )}
    </div>
  );
};

// Staff Attendance History
const StaffAttendanceHistory = ({ user, attendance }) => {
  const username = user.profile?.username || user.username || user.email?.split('@')[0];
  const userAttendance = attendance[username] || {};
  const months = Object.keys(userAttendance).sort().reverse();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">ประวัติการทำงาน</h2>

      {months.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>ยังไม่มีข้อมูลการทำงาน</p>
        </div>
      ) : (
        <div className="space-y-3">
          {months.map(month => {
            const data = userAttendance[month];
            return (
              <div key={month} className="bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl p-4 shadow-md">
                <h3 className="font-semibold text-white mb-3">{month}</h3>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div className="bg-emerald-500/30 rounded-lg p-2 text-center">
                    <p className="font-bold text-emerald-300">{data.workDays}</p>
                    <p className="text-xs text-white/50">ทำงาน</p>
                  </div>
                  <div className="bg-yellow-500/30 rounded-lg p-2 text-center">
                    <p className="font-bold text-yellow-300">{data.lateDays}</p>
                    <p className="text-xs text-white/50">สาย</p>
                  </div>
                  <div className="bg-red-500/30 rounded-lg p-2 text-center">
                    <p className="font-bold text-red-300">{data.absentDays}</p>
                    <p className="text-xs text-white/50">ขาด</p>
                  </div>
                  <div className="bg-blue-500/30 rounded-lg p-2 text-center">
                    <p className="font-bold text-blue-300">{data.leaveDays}</p>
                    <p className="text-xs text-white/50">ลา</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Staff Advances History
const StaffAdvancesHistory = ({ user, advances }) => {
  const username = user.profile?.username || user.username || user.email?.split('@')[0];
  const userAdvances = advances.filter(a => a.staffId === username).sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalAdvances = userAdvances.reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">ประวัติเบิกเงิน</h2>

      {/* Summary */}
      <div className="bg-gradient-to-br from-purple-500 to-violet-700 rounded-xl p-4 shadow-md">
        <p className="text-sm text-white/60">เบิกไปแล้วทั้งหมด</p>
        <p className="text-2xl font-bold text-white">{formatCurrency(totalAdvances)}</p>
      </div>

      {/* Advances List */}
      {userAdvances.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">
          <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>ยังไม่มีประวัติการเบิกเงิน</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {userAdvances.map((adv, index) => (
            <div
              key={adv.id}
              className={`p-4 flex items-center justify-between ${index !== userAdvances.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div>
                <p className="font-medium text-gray-800">{adv.description || 'เบิกเงิน'}</p>
                <p className="text-xs text-gray-500">{formatDate(adv.date)} - เดือน {adv.month}</p>
              </div>
              <span className="text-red-500 font-semibold">-{formatCurrency(adv.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Staff Bonus History
const StaffBonusHistory = ({ user, bonuses }) => {
  const username = user.profile?.username || user.username || user.email?.split('@')[0];
  const userBonuses = (bonuses || []).filter(b => b.staffId === username).sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalBonuses = userBonuses.reduce((sum, b) => sum + b.amount, 0);

  // จัดกลุ่มตามเดือน
  const byMonth = userBonuses.reduce((acc, b) => {
    if (!acc[b.month]) acc[b.month] = [];
    acc[b.month].push(b);
    return acc;
  }, {});
  const months = Object.keys(byMonth).sort().reverse();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">เงินพิเศษ</h2>

      {/* Summary */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100">
        <p className="text-sm text-gray-500">เงินพิเศษทั้งหมด</p>
        <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalBonuses)}</p>
        <p className="text-xs text-gray-400 mt-1">{userBonuses.length} รายการ</p>
      </div>

      {/* Bonus List by Month */}
      {userBonuses.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">
          <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>ยังไม่มีรายการเงินพิเศษ</p>
        </div>
      ) : (
        <div className="space-y-4">
          {months.map(month => {
            const items = byMonth[month];
            const monthTotal = items.reduce((sum, b) => sum + b.amount, 0);
            return (
              <div key={month} className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-amber-50 rounded-t-xl">
                  <span className="font-semibold text-gray-700 text-sm">{month}</span>
                  <span className="font-bold text-amber-600">{formatCurrency(monthTotal)}</span>
                </div>
                {items.map((b, i) => (
                  <div key={b.id} className={`p-4 flex items-start justify-between ${i !== items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-medium text-gray-800 text-sm">{b.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(b.date)}</p>
                    </div>
                    <span className="font-bold text-amber-600 whitespace-nowrap">+{formatCurrency(b.amount)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ================== WELCOME POPUP ==================
const CONFETTI_PARTICLES = [
  { emoji: '🎊', x: 10, delay: 0, dur: 1.1 },
  { emoji: '🎉', x: 25, delay: 0.05, dur: 1.0 },
  { emoji: '✨', x: 40, delay: 0.1, dur: 1.2 },
  { emoji: '🌟', x: 55, delay: 0.0, dur: 1.05 },
  { emoji: '🎊', x: 70, delay: 0.08, dur: 0.95 },
  { emoji: '🎉', x: 85, delay: 0.03, dur: 1.15 },
  { emoji: '✨', x: 15, delay: 0.12, dur: 1.0 },
  { emoji: '🌟', x: 50, delay: 0.07, dur: 1.1 },
  { emoji: '🎊', x: 90, delay: 0.02, dur: 1.2 },
  { emoji: '🍾', x: 50, delay: 0, dur: 0.9, isBottle: true },
];

const WelcomePopup = ({ profile, onClose }) => {
  const [celebrating, setCelebrating] = useState(false);

  const isOwner = profile?.role === 'owner';
  const name = profile?.name || profile?.username || 'ผู้ใช้งาน';
  const colorClass = isOwner ? 'from-indigo-500 to-purple-600' : 'from-emerald-500 to-teal-600';

  const handleAcknowledge = () => {
    setCelebrating(true);
    setTimeout(onClose, 1800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50">
      {/* Celebration overlay */}
      {celebrating && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-[110]">
          {CONFETTI_PARTICLES.map((p, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                bottom: '-10%',
                fontSize: p.isBottle ? '3rem' : '1.6rem',
                animation: p.isBottle
                  ? `bottleShoot ${p.dur}s cubic-bezier(0.2,0.8,0.4,1) ${p.delay}s forwards`
                  : `confettiFly ${p.dur}s cubic-bezier(0.1,0.8,0.3,1) ${p.delay}s forwards`,
                display: 'inline-block',
              }}
            >
              {p.emoji}
            </span>
          ))}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ animation: 'congratsIn 0.3s ease 0.3s both' }}
          >
            <div className="bg-white/90 rounded-2xl px-8 py-5 text-center shadow-2xl">
              <p className="text-3xl mb-1">🍾</p>
              <p className="text-xl font-bold text-emerald-600">ยินดีด้วย!</p>
              <p className="text-gray-500 text-sm mt-1">สู้ต่อไปนะ 💪</p>
            </div>
          </div>
        </div>
      )}

      <div
        className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-sm w-full"
        style={{ animation: 'welcomeIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
      >
        <div className={`bg-gradient-to-r ${colorClass} p-6 text-center`}>
          <div className="text-4xl mb-2">{isOwner ? '🙏' : '👋'}</div>
          <h2 className="text-white text-xl font-bold">ยินดีต้อนรับ!</h2>
          <p className="text-white/90 text-sm mt-1">{name}</p>
        </div>
        <div className="p-5 text-center">
          <p className="text-gray-700 font-semibold leading-relaxed">
            ขอบคุณที่อยู่เคียงข้างพี่ๆ
          </p>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            สู้กันมาเหนื่อยทั้งเดือน 💪<br />
            ขอให้ตั้งใจทำงานนะ<br />
            <span className="text-emerald-600 font-medium">เดี๋ยวพี่พาหาค่าเบีย 🍺</span>
          </p>
          <button
            onClick={handleAcknowledge}
            disabled={celebrating}
            className={`mt-5 w-full py-2.5 rounded-xl text-white text-sm font-medium bg-gradient-to-r ${colorClass} active:opacity-80 transition disabled:opacity-60`}
          >
            กดรับทราบ!+เบียร์เย็นๆ 1 ขวด
          </button>
        </div>
      </div>
      <style>{`
        @keyframes welcomeIn {
          from { opacity: 0; transform: scale(0.7) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes bottleShoot {
          0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          50%  { transform: translateY(-85vh) rotate(-15deg) scale(1.3); opacity: 1; }
          100% { transform: translateY(-110vh) rotate(-30deg) scale(0.8); opacity: 0; }
        }
        @keyframes confettiFly {
          0%   { transform: translateY(0) rotate(0deg) scale(0.8); opacity: 0; }
          15%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(-95vh) rotate(540deg) scale(1.2); opacity: 0; }
        }
        @keyframes congratsIn {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

// ================== MAIN APP ==================
const AppContent = () => {
  // Auth State
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSupabaseReady, setIsSupabaseReady] = useState(true); // Always ready (hardcoded config)
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  // Data State
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [attendance, setAttendance] = useState(INITIAL_ATTENDANCE);
  const [advances, setAdvances] = useState(INITIAL_ADVANCES);
  const [bonuses, setBonuses] = useState(INITIAL_BONUSES);
  const [staffData, setStaffData] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [staffPositions, setStaffPositions] = useState({});

  // UI State
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [showWageModal, setShowWageModal] = useState(false);
  const [editingWageStaff, setEditingWageStaff] = useState(null);
  const [filterProject, setFilterProject] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // Supabase Data Integration
  const supabaseData = useSupabaseData();


  // Supabase is always configured (hardcoded)

  // Check session from localStorage
  useEffect(() => {
    if (!isSupabaseReady) return;

    const checkSession = async () => {
      try {
        const sessionStr = localStorage.getItem('money_tracker_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          // ตรวจสอบว่า session หมดอายุหรือยัง (8 ชั่วโมง)
          const SESSION_DURATION = 8 * 60 * 60 * 1000;
          if (Date.now() - session.loginTime < SESSION_DURATION) {
            // ดึงข้อมูล profile ล่าสุดจาก database
            const freshProfile = await getProfileByUsername(session.user.username);
            if (freshProfile) {
              setUser(freshProfile);
              setProfile(freshProfile);
            }
          } else {
            // Session หมดอายุ
            localStorage.removeItem('money_tracker_session');
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
        localStorage.removeItem('money_tracker_session');
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkSession();
  }, [isSupabaseReady]);

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      if (!user || dataLoaded) return;
      const data = await supabaseData.fetchAllData();
      if (data) {
        if (data.transactions?.length > 0) setTransactions(data.transactions);
        if (data.projects?.length > 0) setProjects(data.projects);
        if (data.attendance && Object.keys(data.attendance).length > 0) setAttendance(data.attendance);
        if (data.advances?.length > 0) setAdvances(data.advances);
        if (data.bonuses?.length > 0) setBonuses(data.bonuses);
        if (data.staff?.length > 0) {
          const wageHistoryMap = data.wageHistoryMap || {};
          const staffProfiles = data.staff.filter(p => p.role !== 'owner' && p.active !== false);
          setStaffData(staffProfiles.map(p => {
            const staffKey = p.username || p.id;
            const wageHistory = wageHistoryMap[staffKey] || [];
            const sorted = [...wageHistory].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));
            const latestWage = sorted[sorted.length - 1]?.dailyWage || parseFloat(p.daily_wage) || 0;
            const startDate = p.start_date ? p.start_date.split('T')[0] : '';
            return {
              id: p.username, username: p.username, name: p.name,
              role: p.role || 'staff', dailyWage: latestWage, daily_wage: latestWage,
              phone: p.phone || '', startDate, start_date: startDate,
              active: p.active !== false, wageHistory, position: p.position || '',
              level: p.level || 1,
            };
          }));
        }
        setDataLoaded(true);
      }
    };
    loadData();
  }, [user]);


  // Load Gemini API Key from database
  useEffect(() => {
    if (!isSupabaseReady || !user) return;
    const loadGeminiKey = async () => {
      try {
        const key = await getGeminiApiKey();
        if (key) {
          setGeminiApiKey(key);
        }
      } catch (err) {
        console.error('Error loading Gemini API Key:', err);
      }
    };
    loadGeminiKey();
  }, [isSupabaseReady, user]);

  // Handlers
  const handleLogin = async (profileData) => {
    console.log('Login profile:', profileData);
    setUser(profileData);
    setProfile(profileData);
    setIsAuthLoading(false);
    if (profileData?.role !== 'owner') {
      setShowWelcomePopup(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('money_tracker_session');
    setUser(null);
    setProfile(null);
    setCurrentPage('dashboard');
    setDataLoaded(false);
  };

  const handleSaveGeminiKey = useCallback(async (key) => {
    setGeminiApiKey(key);
    try {
      await saveGeminiApiKey(key);
    } catch (err) {
      console.error('Error saving Gemini API Key:', err);
    }
  }, []);

  const handleFetchData = useCallback(async () => {
    setDataLoaded(false);
    const data = await supabaseData.fetchAllData();
    if (!data) return;
    if (data.transactions?.length > 0) setTransactions(data.transactions);
    if (data.projects?.length > 0) setProjects(data.projects);
    if (data.attendance && Object.keys(data.attendance).length > 0) setAttendance(data.attendance);
    if (data.advances?.length > 0) setAdvances(data.advances);
    if (data.bonuses?.length > 0) setBonuses(data.bonuses);
    if (data.staff?.length > 0) {
      const wageHistoryMap = data.wageHistoryMap || {};
      const staffProfiles = data.staff.filter(p => p.role !== 'owner' && p.active !== false);
      setStaffData(staffProfiles.map(p => {
        const staffKey = p.username || p.id;
        const wageHistory = wageHistoryMap[staffKey] || [];
        const sorted = [...wageHistory].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));
        const latestWage = sorted[sorted.length - 1]?.dailyWage || parseFloat(p.daily_wage) || 0;
        const startDate = p.start_date ? p.start_date.split('T')[0] : '';
        return {
          id: p.username, username: p.username, name: p.name,
          role: p.role || 'staff', dailyWage: latestWage, daily_wage: latestWage,
          phone: p.phone || '', startDate, start_date: startDate,
          active: p.active !== false, wageHistory, position: p.position || '',
          level: p.level || 1,
        };
      }));
    }
    setDataLoaded(true);
  }, [supabaseData]);

  const handleSaveTransaction = useCallback(async (transaction) => {
    const isNew = !editingTransaction;
    if (isNew) {
      setTransactions(prev => [...prev, transaction]);
    } else {
      setTransactions(prev => prev.map(t => t.id === transaction.id ? transaction : t));
    }
    setEditingTransaction(null);
    try { await upsertTransaction(transaction); } catch (err) { console.error('handleSaveTransaction error:', err); }
  }, [editingTransaction]);

  const handleDeleteTransaction = useCallback(async (id) => {
    if (confirm('ต้องการลบรายการนี้?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      try { await deleteTransactionById(id); } catch (err) { console.error('handleDeleteTransaction error:', err); }
    }
  }, []);

  const handleSaveProject = useCallback(async (project) => {
    const isNew = !editingProject;
    if (isNew) {
      setProjects(prev => [...prev, project]);
    } else {
      setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    }
    setEditingProject(null);
    try { await upsertProject(project); } catch (err) { console.error('handleSaveProject error:', err); }
  }, [editingProject]);

  const handleSaveAdvance = useCallback(async (advance) => {
    setAdvances(prev => [...prev, advance]);
    try { await insertAdvance(advance); } catch (err) { console.error('handleSaveAdvance error:', err); }
  }, []);

  const handleDeleteAdvance = useCallback(async (id) => {
    if (confirm('ต้องการลบรายการเบิกเงินนี้?')) {
      setAdvances(prev => prev.filter(a => a.id !== id));
      try { await deleteAdvanceById(id); } catch (err) { console.error('handleDeleteAdvance error:', err); }
    }
  }, []);

  const handleSaveBonus = useCallback(async (bonus) => {
    setBonuses(prev => [...prev, bonus]);
    try { await insertBonus(bonus); } catch (err) { console.error('handleSaveBonus error:', err); }
  }, []);

  const handleSavePosition = useCallback(async (staffId, position) => {
    setStaffData(prev => prev.map(s => {
      if ((s.username || s.id) !== staffId) return s;
      return { ...s, position };
    }));
    try { await updateProfileFields(staffId, { position }); } catch (err) { console.error('handleSavePosition error:', err); }
  }, []);

  const handleSaveLevel = useCallback(async (staffId, level) => {
    const lvl = Math.max(1, Math.min(99, parseInt(level) || 1));
    setStaffData(prev => prev.map(s => {
      if ((s.username || s.id) !== staffId) return s;
      return { ...s, level: lvl };
    }));
    try { await updateProfileFields(staffId, { level: lvl }); } catch (err) { console.error('handleSaveLevel error:', err); }
  }, []);

  const handleSaveAttendance = useCallback(async (data) => {
    setAttendance(prev => ({
      ...prev,
      [data.staffId]: {
        ...prev[data.staffId],
        [data.month]: {
          workDays: data.workDays, lateDays: data.lateDays,
          absentDays: data.absentDays, leaveDays: data.leaveDays,
          bonusAmount: data.bonusAmount || 0,
        }
      }
    }));
    setEditingAttendance(null);
    try { await upsertAttendance(data); } catch (err) { console.error('handleSaveAttendance error:', err); }
  }, []);

  const handleSaveWage = useCallback(async ({ staffId, dailyWage, effectiveDate }) => {
    setStaffData(prev => prev.map(s => {
      if ((s.username || s.id) !== staffId) return s;
      const currentHistory = s.wageHistory || [];
      const filtered = currentHistory.filter(h => h.effectiveDate !== effectiveDate);
      const newHistory = [...filtered, { dailyWage, effectiveDate }];
      const sorted = [...newHistory].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));
      const latestWage = sorted[sorted.length - 1]?.dailyWage || dailyWage;
      return { ...s, dailyWage: latestWage, daily_wage: latestWage, wageHistory: newHistory };
    }));
    try {
      await upsertWageHistoryEntry(staffId, dailyWage, effectiveDate);
      await updateProfileFields(staffId, { daily_wage: dailyWage });
    } catch (err) { console.error('handleSaveWage error:', err); }
  }, []);

  const handleUpdateWageHistoryDate = useCallback(async ({ staffId, originalDate, newDate }) => {
    setStaffData(prev => prev.map(s => {
      if ((s.username || s.id) !== staffId) return s;
      const newHistory = (s.wageHistory || []).map(h =>
        h.effectiveDate === originalDate ? { ...h, effectiveDate: newDate } : h
      );
      const sorted = [...newHistory].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));
      const latestWage = sorted[sorted.length - 1]?.dailyWage || s.dailyWage;
      return { ...s, dailyWage: latestWage, daily_wage: latestWage, wageHistory: newHistory };
    }));
    try { await updateWageHistoryDate(staffId, originalDate, newDate); } catch (err) { console.error('handleUpdateWageHistoryDate error:', err); }
  }, []);

  const handleDeleteWageHistoryEntry = useCallback(async ({ staffId, effectiveDate }) => {
    setStaffData(prev => prev.map(s => {
      if ((s.username || s.id) !== staffId) return s;
      const newHistory = (s.wageHistory || []).filter(h => h.effectiveDate !== effectiveDate);
      const sorted = [...newHistory].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));
      const latestWage = sorted[sorted.length - 1]?.dailyWage || s.dailyWage;
      return { ...s, dailyWage: latestWage, daily_wage: latestWage, wageHistory: newHistory };
    }));
    try { await deleteWageHistoryEntry(staffId, effectiveDate); } catch (err) { console.error('handleDeleteWageHistoryEntry error:', err); }
  }, []);

  const handleUpdateStartDate = useCallback(async ({ staffId, startDate }) => {
    setStaffData(prev => prev.map(s => {
      if ((s.username || s.id) !== staffId) return s;
      return { ...s, startDate, start_date: startDate };
    }));
    try { await updateProfileFields(staffId, { start_date: startDate }); } catch (err) { console.error('handleUpdateStartDate error:', err); }
  }, []);

  const handleResetPassword = async (userId, newPassword) => {
    await resetUserPassword(userId, newPassword);
  };

  // Autocomplete suggestions
  const descriptionSuggestions = useMemo(() => {
    const descriptions = transactions
      .map(t => t.description)
      .filter(d => typeof d === 'string' && d.trim().length > 0);
    return [...new Set(descriptions)];
  }, [transactions]);

  // Staff list for owner
  const staffList = useMemo(() => {
    return staffData
      .filter(s => s.active !== false && s.role !== 'owner')
      .map(s => ({ id: s.username || s.id, name: s.name }));
  }, [staffData]);

  // Show loading while checking auth
  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const isOwner = profile?.role === 'owner';
  const themeColor = isOwner ? 'indigo' : 'emerald';

  // Navigation items
  const navItems = isOwner
    ? [
      { id: 'dashboard', icon: Home, label: 'หน้าหลัก' },
      { id: 'transactions', icon: Receipt, label: 'รายการ' },
      { id: 'projects', icon: Briefcase, label: 'โปรเจกต์' },
      { id: 'staff', icon: Users, label: 'พนักงาน' },
    ]
    : [
      { id: 'dashboard', icon: Home, label: 'หน้าหลัก' },
      { id: 'attendance', icon: Calendar, label: 'การทำงาน' },
      { id: 'advances', icon: CreditCard, label: 'เบิกเงิน' },
      { id: 'bonuses', icon: DollarSign, label: 'เงินพิเศษ' },
    ];

  const userWithProfile = { ...user, profile };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Welcome Popup */}
      {showWelcomePopup && (
        <WelcomePopup profile={profile} onClose={() => setShowWelcomePopup(false)} />
      )}
      {/* Header */}
      <header className={`bg-gradient-to-r ${isOwner ? 'from-indigo-600 to-purple-600' : 'from-emerald-600 to-teal-600'} text-white p-4 sticky top-0 z-40`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logoTCS.png" alt="TonComService" className="w-8 h-8 rounded bg-white/90 p-0.5" />
            <div>
              <h1 className="font-bold">TonComService</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs opacity-80">{isOwner ? 'เจ้าของกิจการ' : 'พนักงาน'}</p>
                {isOwner && (
                  supabaseData.isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Cloud className="w-3 h-3 text-emerald-300" />
                  )
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-24">
        {isOwner ? (
          <>
            {currentPage === 'dashboard' && (
              <OwnerDashboard transactions={transactions} projects={projects} staffData={staffData} attendance={attendance} advances={advances} />
            )}
            {currentPage === 'transactions' && (
              <OwnerTransactions
                transactions={transactions}
                projects={projects}
                onAdd={() => {
                  setEditingTransaction(null);
                  setShowTransactionModal(true);
                }}
                onEdit={(t) => {
                  setEditingTransaction(t);
                  setShowTransactionModal(true);
                }}
                onDelete={handleDeleteTransaction}
                filterProject={filterProject}
                setFilterProject={setFilterProject}
              />
            )}
            {currentPage === 'projects' && (
              <OwnerProjects
                projects={projects}
                transactions={transactions}
                onAdd={() => {
                  setEditingProject(null);
                  setShowProjectModal(true);
                }}
                onEdit={(p) => {
                  setEditingProject(p);
                  setShowProjectModal(true);
                }}
              />
            )}
            {currentPage === 'staff' && (
              <OwnerStaff
                staffData={staffData}
                attendance={attendance}
                advances={advances}
                bonuses={bonuses}
                onAddAdvance={() => setShowAdvanceModal(true)}
                onAddBonus={() => setShowBonusModal(true)}
                onAddAttendance={() => {
                  setEditingAttendance(null);
                  setShowAttendanceModal(true);
                }}
                onEditAttendance={(staff) => {
                  const currentMonth = getCurrentMonth();
                  const monthAttendance = attendance[staff.username]?.[currentMonth] || {};
                  setEditingAttendance({
                    staffId: staff.username,
                    month: currentMonth,
                    workDays: monthAttendance.workDays || 0,
                    lateDays: monthAttendance.lateDays || 0,
                    absentDays: monthAttendance.absentDays || 0,
                    leaveDays: monthAttendance.leaveDays || 0
                  });
                  setShowAttendanceModal(true);
                }}
                onResetPassword={handleResetPassword}
                onEditWage={(staff) => {
                  setEditingWageStaff(staff);
                  setShowWageModal(true);
                }}
                positions={staffPositions}
                onSavePosition={handleSavePosition}
                onSaveLevel={handleSaveLevel}
              />
            )}
          </>
        ) : (
          <>
            {currentPage === 'dashboard' && (
              <StaffDashboard
                user={userWithProfile}
                attendance={attendance}
                advances={advances}
                bonuses={bonuses}
                staffData={staffData}
                positions={staffPositions}
                onRefresh={handleFetchData}
                isLoading={supabaseData.isLoading}
                dataLoaded={dataLoaded}
              />
            )}
            {currentPage === 'attendance' && (
              <StaffAttendanceHistory
                user={userWithProfile}
                attendance={attendance}
              />
            )}
            {currentPage === 'advances' && (
              <StaffAdvancesHistory
                user={userWithProfile}
                advances={advances}
              />
            )}
            {currentPage === 'bonuses' && (
              <StaffBonusHistory
                user={userWithProfile}
                bonuses={bonuses}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40">
        <div className="flex justify-around">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition ${currentPage === item.id
                ? isOwner
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-emerald-600 bg-emerald-50'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Floating Action Button (Owner only) */}
      {isOwner && currentPage === 'dashboard' && (
        <button
          onClick={() => {
            setEditingTransaction(null);
            setShowTransactionModal(true);
          }}
          className="fixed right-4 bottom-20 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition z-30"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Modals */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        projects={projects}
        suggestions={descriptionSuggestions}
        geminiApiKey={geminiApiKey}
        setGeminiApiKey={handleSaveGeminiKey}
        editingTransaction={editingTransaction}
        staffList={staffList}
        onSaveAdvance={handleSaveAdvance}
      />

      <ProjectModal
        isOpen={showProjectModal}
        onClose={() => {
          setShowProjectModal(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        editingProject={editingProject}
      />

      <AdvanceModal
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        onSave={handleSaveAdvance}
        staffList={staffList}
      />

      <BonusModal
        isOpen={showBonusModal}
        onClose={() => setShowBonusModal(false)}
        onSave={handleSaveBonus}
        staffList={staffList}
      />

      <AttendanceModal
        isOpen={showAttendanceModal}
        onClose={() => {
          setShowAttendanceModal(false);
          setEditingAttendance(null);
        }}
        onSave={handleSaveAttendance}
        staffList={staffList}
        editingData={editingAttendance}
      />

      <WageEditModal
        isOpen={showWageModal}
        onClose={() => {
          setShowWageModal(false);
          setEditingWageStaff(null);
        }}
        onSave={handleSaveWage}
        onUpdateHistoryDate={handleUpdateWageHistoryDate}
        onDeleteHistoryEntry={handleDeleteWageHistoryEntry}
        onUpdateStartDate={handleUpdateStartDate}
        staff={editingWageStaff}
        staffList={staffData}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        geminiApiKey={geminiApiKey}
        onSaveGeminiKey={handleSaveGeminiKey}
        onFetchData={handleFetchData}
      />
    </div>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;
