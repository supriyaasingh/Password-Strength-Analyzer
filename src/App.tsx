/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Sparkles, 
  RefreshCw, 
  Database, 
  AlertTriangle, 
  Moon, 
  Sun, 
  Info, 
  Lock, 
  HelpCircle, 
  CheckCircle2, 
  XCircle,
  Clock,
  KeyRound,
  FileCode,
  CheckCircle,
  Trash2
} from "lucide-react";

interface PasswordAnalysisResponse {
  strength: "Very Weak" | "Weak" | "Medium" | "Strong" | "Very Strong";
  score: number;
  entropy: number;
  suggestions: string[];
  reuseStatus: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
    notCommon: boolean;
    noSequential: boolean;
    noRepeated: boolean;
  };
}

export default function App() {
  // --- STATE DECLARATIONS ---
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<PasswordAnalysisResponse | null>(null);
  const [loadingCheck, setLoadingCheck] = useState<boolean>(false);
  const [loadingGenerate, setLoadingGenerate] = useState<boolean>(false);
  const [loadingSave, setLoadingSave] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [toasts, setToasts] = useState<{ id: string; type: "success" | "error" | "info"; message: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"analyzer" | "education">("analyzer");

  // Timer reference to debounce API requests and prevent network flooding
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // --- DARK MODE SYNC ---
  useEffect(() => {
    // Check local storage or system preference on load
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    if (darkMode) {
      setDarkMode(false);
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
      addToast("Theme updated to Light Mode", "info");
    } else {
      setDarkMode(true);
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.add("dark");
      addToast("Theme updated to Dark Mode", "info");
    }
  };

  // --- TOAST NOTIFICATIONS ---
  const addToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- PASSWORD CHANGE HANDLER ---
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Security Best Practice: Max input limit protection
    if (val.length > 128) return;
    
    setPassword(val);

    // Reset local analysis instantly if input is empty
    if (!val) {
      setAnalysis(null);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      return;
    }

    // Debounce the API analysis to ensure snappy typing without overloading server
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(() => {
      fetchPasswordAnalysis(val);
    }, 150);
  };

  // --- API CALL: ANALYZE PASSWORD ---
  const fetchPasswordAnalysis = async (pwdToAnalyze: string) => {
    if (!pwdToAnalyze) return;
    setLoadingCheck(true);
    try {
      const response = await fetch("/api/password/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwdToAnalyze }),
      });

      const data = await response.json();
      if (response.ok) {
        setAnalysis(data);
      } else {
        addToast(data.error || "Failed to analyze password", "error");
      }
    } catch (error) {
      console.error("Analysis network error:", error);
      addToast("Failed to connect to security analysis backend", "error");
    } finally {
      setLoadingCheck(false);
    }
  };

  // --- API CALL: SECURELY GENERATE PASSWORD ---
  const handleGeneratePassword = async () => {
    setLoadingGenerate(true);
    try {
      const response = await fetch("/api/password/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (response.ok && data.password) {
        setPassword(data.password);
        setShowPassword(true); // reveal it so they can see the magnificent generated password
        addToast("Secure 16-character password generated!", "success");
        // Immediately fetch analysis for the newly generated password
        fetchPasswordAnalysis(data.password);
      } else {
        addToast("Failed to generate password from secure source", "error");
      }
    } catch (error) {
      console.error("Generator network error:", error);
      addToast("Failed to reach cryptographical server generator", "error");
    } finally {
      setLoadingGenerate(false);
    }
  };

  // --- API CALL: HASH & SAVE PASSWORD TO HISTORY ---
  const handleSavePassword = async () => {
    if (!password) {
      addToast("Enter a password first to save.", "error");
      return;
    }
    setLoadingSave(true);
    try {
      const response = await fetch("/api/password/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      if (response.ok) {
        addToast(data.message || "Password hash successfully stored in DB!", "success");
        // Re-analyze immediately to trigger the "Used" status in checklist
        fetchPasswordAnalysis(password);
      } else {
        // Handle rejection elegantly (e.g. reused passwords)
        addToast(data.error || "Password rejected", "error");
      }
    } catch (error) {
      console.error("Storage network error:", error);
      addToast("Could not connect to database save handler", "error");
    } finally {
      setLoadingSave(false);
    }
  };

  // --- COPY TO CLIPBOARD HANDLER ---
  const handleCopyToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      addToast("Copied to clipboard successfully!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      addToast("Browser clipboard API failed", "error");
    }
  };

  // --- DYNAMIC THEMING HELPERS ---
  const getStrengthMeta = () => {
    if (!password) {
      return {
        colorClass: "bg-slate-200 dark:bg-slate-800",
        textWeightColor: "text-slate-400 dark:text-slate-600",
        borderClass: "border-slate-200 dark:border-slate-800",
        bgLight: "bg-slate-50 dark:bg-slate-900/40",
        badgeColor: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
        percentage: 0,
        label: "Awaiting Input"
      };
    }
    const score = analysis?.score ?? 0;
    const strength = analysis?.strength ?? "Very Weak";

    switch (strength) {
      case "Very Weak":
        return {
          colorClass: "bg-rose-600",
          textWeightColor: "text-rose-600 dark:text-rose-400",
          borderClass: "border-rose-300 dark:border-rose-900",
          bgLight: "bg-rose-50 dark:bg-rose-950/20",
          badgeColor: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
          percentage: score,
          label: "Very Weak"
        };
      case "Weak":
        return {
          colorClass: "bg-red-500",
          textWeightColor: "text-red-500 dark:text-red-400",
          borderClass: "border-red-200 dark:border-red-900/50",
          bgLight: "bg-red-50/50 dark:bg-red-950/10",
          badgeColor: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
          percentage: score,
          label: "Weak"
        };
      case "Medium":
        return {
          colorClass: "bg-amber-500",
          textWeightColor: "text-amber-600 dark:text-amber-400",
          borderClass: "border-amber-200 dark:border-amber-900/50",
          bgLight: "bg-amber-50/50 dark:bg-amber-950/10",
          badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
          percentage: score,
          label: "Medium"
        };
      case "Strong":
        return {
          colorClass: "bg-blue-600",
          textWeightColor: "text-blue-600 dark:text-blue-400",
          borderClass: "border-blue-200 dark:border-blue-900/50",
          bgLight: "bg-blue-50/50 dark:bg-blue-950/10",
          badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400",
          percentage: score,
          label: "Strong"
        };
      case "Very Strong":
        return {
          colorClass: "bg-emerald-500",
          textWeightColor: "text-emerald-600 dark:text-emerald-400",
          borderClass: "border-emerald-200 dark:border-emerald-900/50",
          bgLight: "bg-emerald-50/50 dark:bg-emerald-950/10",
          badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
          percentage: score,
          label: "Very Strong"
        };
      default:
        return {
          colorClass: "bg-slate-200 dark:bg-slate-800",
          textWeightColor: "text-slate-400 dark:text-slate-600",
          borderClass: "border-slate-200 dark:border-slate-800",
          bgLight: "bg-slate-50 dark:bg-slate-900/40",
          badgeColor: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
          percentage: 0,
          label: "Unknown"
        };
    }
  };

  const meta = getStrengthMeta();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      
      {/* HEADER NAVIGATION (SentryVault Style) */}
      <header id="app-header" className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 dark:bg-slate-900 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white font-display">
            Sentry<span className="text-blue-600 dark:text-blue-400">Vault</span>
          </span>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6">
          <nav className="flex gap-4 sm:gap-6 text-sm font-medium">
            <button 
              onClick={() => setActiveTab("analyzer")} 
              className={`py-5 border-b-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-150 ${
                activeTab === "analyzer" 
                  ? "text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400" 
                  : "text-slate-500 border-transparent hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Analyzer
            </button>
            <button 
              onClick={() => setActiveTab("education")} 
              className={`py-5 border-b-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-150 ${
                activeTab === "education" 
                  ? "text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400" 
                  : "text-slate-500 border-transparent hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Handbook
            </button>
          </nav>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-850"></div>
          
          <button
            id="theme-toggle-btn"
            onClick={toggleDarkMode}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? (
              <Sun className="h-5 w-5 text-amber-400" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* TOAST SYSTEM */}
      <div className="fixed bottom-12 right-5 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-xl flex items-start justify-between border transition-all duration-300 transform translate-y-0 scale-100 ${
              toast.type === "success" 
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900"
                : toast.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900"
                : "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {toast.type === "success" && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
              {toast.type === "error" && <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />}
              {toast.type === "info" && <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />}
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button onClick={() => removeToast(toast.id)} className="ml-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none">
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto flex flex-col justify-center">
        
        {activeTab === "analyzer" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
            
            {/* LEFT COLUMN (7 COLS): Input + Primary Feedback Dashboard */}
            <div className="col-span-1 lg:col-span-7 flex flex-col gap-6">
              
              {/* MAIN INPUT CARD */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm dark:bg-slate-900 dark:border-slate-800/80 transition-all duration-300 flex-1 flex flex-col justify-between">
                <div>
                  {/* Card Header */}
                  <div className="mb-6 flex justify-between items-end">
                    <div>
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 font-mono">
                        Password Analysis
                      </h2>
                      <p className="text-2xl font-bold text-slate-800 dark:text-white font-display">
                        Validate Strength
                      </p>
                    </div>
                    
                    {/* Database status pill */}
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-200 dark:bg-slate-950 dark:border-slate-850">
                      {password ? (
                        analysis?.reuseStatus === "Password already used before" ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Reused/Compromised</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Unique Password</span>
                          </>
                        )
                      ) : (
                        <>
                          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Awaiting Input</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Password entry field */}
                  <div className="relative mb-8" id="password-input-group">
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                      Enter your password
                    </label>
                    <div className="relative">
                      <input
                        id="password-input"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={handlePasswordChange}
                        placeholder="Type a security token..."
                        className={`w-full h-14 pl-5 pr-32 bg-slate-50 border-2 rounded-xl text-xl font-mono focus:ring-0 outline-none transition-all duration-200 dark:bg-slate-950 dark:text-white ${
                          password ? (meta.borderClass + " border-2") : "border-blue-100 dark:border-slate-800"
                        } focus:border-blue-500`}
                      />
                      <div className="absolute right-2 top-2 bottom-2 flex gap-1 items-center">
                        {password && (
                          <button
                            onClick={() => { setPassword(""); setAnalysis(null); }}
                            className="px-2.5 h-full hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-500 transition-colors"
                            title="Clear input"
                          >
                            Clear
                          </button>
                        )}
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="px-3 h-full hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                          title={showPassword ? "Hide password text" : "Show password text"}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                        <button
                          onClick={handleCopyToClipboard}
                          disabled={!password}
                          className="px-4 h-full bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                        >
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Strength Dashboard Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-4">
                    {/* Score badge left box */}
                    <div className="flex flex-col justify-center items-center p-6 bg-slate-50 rounded-xl dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                      <span className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest font-mono">
                        Security Score
                      </span>
                      <span className={`text-6xl font-black transition-colors duration-300 ${
                        password ? meta.textWeightColor : "text-slate-300 dark:text-slate-700"
                      }`}>
                        {password ? analysis?.score ?? 0 : 0}
                        <span className="text-xl font-bold">%</span>
                      </span>
                      <span className={`mt-2 px-4 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                        password ? meta.badgeColor : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
                      }`}>
                        {password ? meta.label : "Empty"}
                      </span>
                    </div>

                    {/* Complexity & Entropy sliders right box */}
                    <div className="flex flex-col justify-center gap-5">
                      {/* Complexity meter bar */}
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1.5 uppercase text-slate-400 tracking-wider font-mono">
                          <span>Complexity Meter</span>
                          <span className={password ? meta.textWeightColor : ""}>
                            {password ? analysis?.score ?? 0 : 0}/100
                          </span>
                        </div>
                        <div className="h-3 w-full bg-slate-200 dark:bg-slate-850 rounded-full overflow-hidden flex">
                          <div
                            className={`h-full transition-all duration-500 ease-out ${
                              password ? meta.colorClass : "bg-slate-300 dark:bg-slate-700"
                            }`}
                            style={{ width: `${password ? analysis?.score ?? 0 : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Estimated Shannon Entropy */}
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">
                          Estimated Entropy
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-mono">
                            {password ? analysis?.entropy ?? 0 : 0}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 font-mono">bits</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">
                          {password && (analysis?.entropy ?? 0) >= 70 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Exceeds standard threshold (70 bits)</span>
                          ) : password ? (
                            <span className="text-amber-600 dark:text-amber-500">Below secure standard (70 bits)</span>
                          ) : (
                            <span>Standard NIST threshold: 70 bits</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {password && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850/60 text-center">
                    <p className="text-slate-400 text-[10px] italic">
                      Committed passwords are salted & hashed using 12 rounds of bcrypt. Plaintext is never stored.
                    </p>
                  </div>
                )}
              </div>

              {/* QUICK ACTIONS GRID */}
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={handleGeneratePassword}
                  disabled={loadingGenerate}
                  className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 transition-colors group dark:bg-slate-900 dark:border-slate-800"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200 dark:bg-blue-950 dark:text-blue-400">
                    {loadingGenerate ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <Sparkles className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Generate</span>
                </button>

                <button
                  onClick={handleSavePassword}
                  disabled={!password || loadingSave}
                  className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-400 transition-colors group disabled:opacity-40 disabled:hover:border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200 dark:bg-emerald-950 dark:text-emerald-400">
                    {loadingSave ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <Database className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Save Hash</span>
                </button>

                <button
                  onClick={() => { setPassword(""); setAnalysis(null); }}
                  disabled={!password}
                  className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-red-400 transition-colors group disabled:opacity-40 disabled:hover:border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                >
                  <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-2 group-hover:bg-rose-600 group-hover:text-white transition-all duration-200 dark:bg-rose-950 dark:text-rose-400">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Clear Field</span>
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN (5 COLS): Requirements checklist + Suggestions */}
            <div className="col-span-1 lg:col-span-5 flex flex-col gap-6">
              
              {/* SECURITY CHECKLIST CARD */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col dark:bg-slate-900 dark:border-slate-800">
                <div className="p-6 border-b border-slate-100 dark:border-slate-850">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 font-display">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                      <polyline points="9 11 12 14 22 4"></polyline>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    Requirements Checklist
                  </h3>
                </div>
                
                {/* List items with conditional states matching Mockup colors */}
                <div className="p-6 flex flex-col gap-3 overflow-y-auto">
                  {/* Item 1: length */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg text-sm transition-all duration-200 ${
                    password 
                      ? analysis?.checks.length 
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300" 
                        : "bg-rose-50/50 text-rose-800 dark:bg-rose-950/10 dark:text-rose-400"
                      : "bg-slate-50 text-slate-500 dark:bg-slate-950/50 dark:text-slate-400"
                  }`}>
                    {password ? (
                      analysis?.checks.length ? (
                        <div className="bg-emerald-500 rounded-full p-0.5 text-white shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      ) : (
                        <div className="bg-rose-500 rounded-full p-0.5 text-white shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                      )
                    ) : (
                      <div className="bg-slate-300 dark:bg-slate-700 rounded-full p-0.5 text-white shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </div>
                    )}
                    <span className="flex-1">At least 8 characters long</span>
                    <span className="text-xs font-bold font-mono">
                      {password ? `${password.length}/8` : "None"}
                    </span>
                  </div>

                  {/* Item 2: Casing */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg text-sm transition-all duration-200 ${
                    password 
                      ? (analysis?.checks.uppercase && analysis?.checks.lowercase)
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300" 
                        : "bg-rose-50/50 text-rose-800 dark:bg-rose-950/10 dark:text-rose-400"
                      : "bg-slate-50 text-slate-500 dark:bg-slate-950/50 dark:text-slate-400"
                  }`}>
                    {password ? (
                      (analysis?.checks.uppercase && analysis?.checks.lowercase) ? (
                        <div className="bg-emerald-500 rounded-full p-0.5 text-white shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      ) : (
                        <div className="bg-rose-500 rounded-full p-0.5 text-white shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                      )
                    ) : (
                      <div className="bg-slate-300 dark:bg-slate-700 rounded-full p-0.5 text-white shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </div>
                    )}
                    <span className="flex-1">Mixed casing (Upper/Lower)</span>
                    <span className="text-xs font-bold font-mono">ABC/abc</span>
                  </div>

                  {/* Item 3: Numbers */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg text-sm transition-all duration-200 ${
                    password 
                      ? analysis?.checks.number 
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300" 
                        : "bg-rose-50/50 text-rose-800 dark:bg-rose-950/10 dark:text-rose-400"
                      : "bg-slate-50 text-slate-500 dark:bg-slate-950/50 dark:text-slate-400"
                  }`}>
                    {password ? (
                      analysis?.checks.number ? (
                        <div className="bg-emerald-500 rounded-full p-0.5 text-white shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      ) : (
                        <div className="bg-rose-500 rounded-full p-0.5 text-white shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                      )
                    ) : (
                      <div className="bg-slate-300 dark:bg-slate-700 rounded-full p-0.5 text-white shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </div>
                    )}
                    <span className="flex-1">Includes numeric digits</span>
                    <span className="text-xs font-bold font-mono">0-9</span>
                  </div>

                  {/* Item 4: Symbols */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg text-sm transition-all duration-200 ${
                    password 
                      ? analysis?.checks.special 
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300" 
                        : "bg-rose-50/50 text-rose-800 dark:bg-rose-950/10 dark:text-rose-400"
                      : "bg-slate-50 text-slate-500 dark:bg-slate-950/50 dark:text-slate-400"
                  }`}>
                    {password ? (
                      analysis?.checks.special ? (
                        <div className="bg-emerald-500 rounded-full p-0.5 text-white shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      ) : (
                        <div className="bg-rose-500 rounded-full p-0.5 text-white shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                      )
                    ) : (
                      <div className="bg-slate-300 dark:bg-slate-700 rounded-full p-0.5 text-white shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </div>
                    )}
                    <span className="flex-1">Special characters enabled</span>
                    <span className="text-xs font-bold font-mono">!@#$</span>
                  </div>

                  {/* Item 5: Sequential Patterns */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg text-sm transition-all duration-200 ${
                    password 
                      ? analysis?.checks.noSequential 
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300" 
                        : "bg-rose-50/50 text-rose-800 dark:bg-rose-950/10 dark:text-rose-400"
                      : "bg-slate-50 text-slate-500 dark:bg-slate-950/50 dark:text-slate-400"
                  }`}>
                    {password ? (
                      analysis?.checks.noSequential ? (
                        <div className="bg-emerald-500 rounded-full p-0.5 text-white shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      ) : (
                        <div className="bg-rose-500 rounded-full p-0.5 text-white shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                      )
                    ) : (
                      <div className="bg-slate-300 dark:bg-slate-700 rounded-full p-0.5 text-white shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </div>
                    )}
                    <span className="flex-1">No sequential patterns</span>
                    <span className="text-xs font-bold font-mono">None</span>
                  </div>

                  {/* Item 6: Common list matches */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg text-sm transition-all duration-200 ${
                    password 
                      ? analysis?.checks.notCommon 
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300" 
                        : "bg-rose-50/50 text-rose-800 dark:bg-rose-950/10 dark:text-rose-400"
                      : "bg-slate-50 text-slate-500 dark:bg-slate-950/50 dark:text-slate-400"
                  }`}>
                    {password ? (
                      analysis?.checks.notCommon ? (
                        <div className="bg-emerald-500 rounded-full p-0.5 text-white shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      ) : (
                        <div className="bg-rose-500 rounded-full p-0.5 text-white shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                      )
                    ) : (
                      <div className="bg-slate-300 dark:bg-slate-700 rounded-full p-0.5 text-white shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </div>
                    )}
                    <span className="flex-1">Common dictionary match</span>
                    <span className="text-xs font-bold font-mono">Secure</span>
                  </div>
                </div>
              </div>

              {/* SUGGESTIONS CARD (Slate-900 beautiful dark wrapper) */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white shrink-0 dark:bg-slate-900/60 dark:border dark:border-slate-800">
                <h4 className="text-xs font-black uppercase text-blue-400 mb-4 tracking-widest font-mono">
                  Smart Suggestions
                </h4>
                {password && analysis && analysis.suggestions.length > 0 ? (
                  <ul className="space-y-3">
                    {analysis.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="text-blue-400 font-bold">+</span>
                        <span className="opacity-80">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-3">
                    <li className="flex gap-3 text-sm">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span className="opacity-80">This password is exceptionally robust! No suggestions found.</span>
                    </li>
                    <li className="flex gap-3 text-sm">
                      <span className="text-blue-400 font-bold">+</span>
                      <span className="opacity-80">Store this hash safely in SentryVault DB history.</span>
                    </li>
                  </ul>
                )}
                
                <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold opacity-40 font-mono">
                    Last check: Just now
                  </span>
                  <span className="text-[10px] py-1 px-2 bg-white/10 rounded uppercase font-bold font-mono text-blue-300">
                    SENTRY API v1.2
                  </span>
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* HANDBOOK TAB */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8 max-w-4xl mx-auto transition-all duration-300">
            <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-5">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center space-x-2 font-display">
                <KeyRound className="h-6 w-6 text-blue-500" />
                <span>SentryVault Security &amp; Cryptography Handbook</span>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Explore the mathematical and cryptographic underpinnings of the SentryVault suite.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Box 1: Bcrypt */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                    <FileCode className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 font-display">Bcrypt Hashing Mechanism</h3>
                </div>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Plaintext passwords must never be stored directly in a database. SentryVault relies on the <b>bcrypt</b> hashing algorithm to derive cryptographically secure salted hashes.
                </p>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Bcrypt employs an adaptive work factor (salt rounds). Our standard is set to <b>saltRounds = 12</b>, inducing key derivation delay that prevents rapid brute forcing by custom silicon/ASIC units.
                </p>
              </div>

              {/* Box 2: Reuse */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Database className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 font-display">Safe Reuse Detection Loop</h3>
                </div>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Because bcrypt inserts high-entropy randomized salts into each generated string, identical inputs result in different hashes.
                </p>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  To trace history securely without saving plaintext, SentryVault extracts previous hashes on-demand and matches using <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px]">bcrypt.compare()</code>, keeping hashes secure on the server side.
                </p>
              </div>

              {/* Box 3: Entropy */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Clock className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 font-display">Shannon Entropy Evaluation</h3>
                </div>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Entropy measures password randomized bits, derived as $H = L \times \log_2(R)$ where $L$ is the token length and $R$ is the size of the character range pool.
                </p>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  NIST guidelines mandate greater than 70 bits of entropy for mission-critical enterprise systems to successfully negate dictionary matching schemes.
                </p>
              </div>

              {/* Box 4: Secure Generation */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 font-display">Secure Generation Logic</h3>
                </div>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  To keep generator outputs truly unpredictable, SentryVault bypasses standard <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">Math.random()</code>.
                </p>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Instead, our backend uses <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">crypto.randomBytes()</code>, deriving indices from hardware-sourced entropy pools, with a cryptographically secure Fisher-Yates array shuffle.
                </p>
              </div>

            </div>

            <div className="flex justify-end pt-5 border-t border-slate-150 dark:border-slate-800">
              <button
                onClick={() => setActiveTab("analyzer")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-lg uppercase tracking-wider transition-all duration-150"
              >
                Back to Security Analyzer
              </button>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER BAR (SentryVault Style) */}
      <footer className="h-10 bg-white border-t border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0 dark:bg-slate-900 dark:border-slate-800/80">
        <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 uppercase tracking-widest font-mono">
          © 2026 SentryVault Encryption Labs • HIPAA &amp; GDPR Compliant
        </p>
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            DATABASE ENCRYPTED
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest font-mono hidden sm:inline">
            BCRYPT ROUNDS: 12
          </span>
        </div>
      </footer>
    </div>
  );
}
