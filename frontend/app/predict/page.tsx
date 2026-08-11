"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  Activity,
  Target,
  Percent,
  CheckCircle2,
  XCircle,
  Clock,
  Brain,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import {
  predictAPI,
  type Prediction,
  type ComparisonItem,
  type PredictionStats,
  type ModelInfo,
} from "@/lib/api";
import toast from "react-hot-toast";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Stat Card ──
function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  suffix,
  delay = 0,
}: {
  label: string;
  value: string | number | null;
  icon: React.ElementType;
  accent: string;
  suffix?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition hover:border-border"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-0 transition group-hover:opacity-100`} />
      <div className="relative z-10">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon size={20} />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">
          {value ?? "—"}
          {suffix && <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span>}
        </p>
      </div>
    </motion.div>
  );
}

// ── Direction Badge ──
function DirectionBadge({ direction, size = "sm" }: { direction: string; size?: "sm" | "lg" }) {
  const isUp = direction === "UP";
  const sizeClass = size === "lg" ? "px-3 py-1.5 text-sm gap-1.5" : "px-2 py-0.5 text-xs gap-1";
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sizeClass} ${
        isUp
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-red-500/15 text-red-600 dark:text-red-400"
      }`}
    >
      {isUp ? <ArrowUpRight size={size === "lg" ? 16 : 12} /> : <ArrowDownRight size={size === "lg" ? 16 : 12} />}
      {isUp ? "Yükseliş" : "Düşüş"}
    </span>
  );
}

// ── Mini Bar Chart for error visualization ──
function ErrorBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 10);
  const color = pct < 1 ? "bg-emerald-500" : pct < 3 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${(clamped / 10) * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground">%{pct.toFixed(2)}</span>
    </div>
  );
}

export default function PredictPage() {
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [history, setHistory] = useState<Prediction[]>([]);
  const [comparisons, setComparisons] = useState<ComparisonItem[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningPrediction, setRunningPrediction] = useState(false);
  const [updatingActuals, setUpdatingActuals] = useState(false);
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "compare">("history");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, h, c] = await Promise.all([
        predictAPI.stats(),
        predictAPI.history(20),
        predictAPI.compare(20),
      ]);
      setStats(s);
      setHistory(h);
      setComparisons(c);
    } catch {
      toast.error("Veriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunPrediction = async () => {
    setRunningPrediction(true);
    try {
      const result = await predictAPI.run();
      toast.success(`Tahmin: ${formatPrice(result.predicted_close)} ₺ (${formatDate(result.target_date)})`);
      fetchData();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Tahmin çalıştırılamadı");
    } finally {
      setRunningPrediction(false);
    }
  };

  const handleUpdateActuals = async () => {
    setUpdatingActuals(true);
    try {
      const result = await predictAPI.updateActuals();
      toast.success(result.message);
      fetchData();
    } catch {
      toast.error("Güncelleme başarısız");
    } finally {
      setUpdatingActuals(false);
    }
  };

  const handleLoadModelInfo = async () => {
    if (modelInfo) {
      setShowModelInfo(!showModelInfo);
      return;
    }
    try {
      const info = await predictAPI.info();
      setModelInfo(info);
      setShowModelInfo(true);
    } catch {
      toast.error("Model bilgileri alınamadı");
    }
  };

  const latestPrediction = history[0] ?? null;
  const latestDirection = latestPrediction
    ? latestPrediction.predicted_close > latestPrediction.last_close
      ? "UP"
      : "DOWN"
    : null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 rounded-full border border-border/60 bg-card/90 px-6 py-3 shadow-lg backdrop-blur"
        >
          <Loader2 className="animate-spin text-primary" size={20} />
          <span className="text-muted-foreground">Yükleniyor...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="py-10">
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              Hisse Tahmin
              <span className="ml-2 text-primary">AI</span>
            </h1>
            <p className="mt-1 text-muted-foreground">
              GARAN.IS — LSTM derin öğrenme modeli ile günlük kapanış tahmini
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <motion.button
              onClick={handleRunPrediction}
              disabled={runningPrediction}
              className="btn-primary gap-2 rounded-full disabled:opacity-60"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {runningPrediction ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Brain size={16} />
              )}
              {runningPrediction ? "Tahmin ediliyor..." : "Tahmin Çalıştır"}
            </motion.button>
            <motion.button
              onClick={handleUpdateActuals}
              disabled={updatingActuals}
              className="btn-outline gap-2 rounded-full disabled:opacity-60"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {updatingActuals ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Gerçek Veri Güncelle
            </motion.button>
          </div>
        </motion.div>

        {/* ── Latest Prediction Hero ── */}
        {latestPrediction && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-60" />
            <div className="relative z-10">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={14} />
                <span>Son tahmin — Hedef: {formatDate(latestPrediction.target_date)}</span>
              </div>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tahmini Kapanış</p>
                  <p className="text-5xl font-bold text-foreground">
                    {formatPrice(latestPrediction.predicted_close)}
                    <span className="ml-2 text-2xl font-normal text-muted-foreground">₺</span>
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    {latestDirection && <DirectionBadge direction={latestDirection} size="lg" />}
                    <span className="text-sm text-muted-foreground">
                      Son kapanış: {formatPrice(latestPrediction.last_close)} ₺
                    </span>
                  </div>
                </div>
                {latestPrediction.actual_close != null && (
                  <div className="rounded-2xl border border-border/60 bg-card/80 p-4 backdrop-blur">
                    <p className="text-xs text-muted-foreground">Gerçek Kapanış</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatPrice(latestPrediction.actual_close)} ₺
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      {latestPrediction.is_direction_correct ? (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      ) : (
                        <XCircle size={14} className="text-red-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        Hata: %{latestPrediction.error_pct?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {/* ── Stats ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Toplam Tahmin"
            value={stats?.total_predictions ?? 0}
            icon={BarChart3}
            accent="from-primary/10 via-primary/5 to-transparent"
            delay={0.1}
          />
          <StatCard
            label="Karşılaştırılan"
            value={stats?.predictions_with_actual ?? 0}
            icon={Target}
            accent="from-secondary/10 via-secondary/5 to-transparent"
            delay={0.15}
          />
          <StatCard
            label="Ort. Hata"
            value={stats?.avg_error_pct != null ? `%${stats.avg_error_pct.toFixed(2)}` : null}
            icon={Percent}
            accent="from-amber-400/10 via-amber-200/5 to-transparent"
            delay={0.2}
          />
          <StatCard
            label="Yön Doğruluğu"
            value={stats?.direction_accuracy_pct != null ? `%${stats.direction_accuracy_pct.toFixed(1)}` : null}
            icon={Activity}
            accent="from-emerald-400/10 via-emerald-200/5 to-transparent"
            delay={0.25}
          />
        </div>

        {/* ── Tabs ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl border border-border/50 bg-card p-6 shadow-sm sm:p-8"
        >
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 rounded-2xl bg-muted/60 p-1">
              {(["history", "compare"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-xl px-5 py-2 text-sm font-medium transition ${
                    activeTab === tab
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "history" ? "Tahmin Geçmişi" : "Karşılaştırma"}
                </button>
              ))}
            </div>
            <button
              onClick={handleLoadModelInfo}
              className="flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Info size={14} />
              Model Bilgisi
              {showModelInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* ── Model Info Panel ── */}
          <AnimatePresence>
            {showModelInfo && modelInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-5">
                  <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Ticker</p>
                      <p className="font-semibold text-foreground">{modelInfo.ticker}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pencere Boyutu</p>
                      <p className="font-semibold text-foreground">{modelInfo.backcandles} gün</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Toplam Feature</p>
                      <p className="font-semibold text-foreground">{modelInfo.n_features}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Hisse / Makro</p>
                      <p className="font-semibold text-foreground">
                        {modelInfo.n_stock_features} / {modelInfo.n_macro_features}
                      </p>
                    </div>
                  </div>
                  {modelInfo.scaler_columns && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs text-muted-foreground">Scaler Sütunları</p>
                      <div className="flex flex-wrap gap-1.5">
                        {modelInfo.scaler_columns.map((col) => (
                          <span
                            key={col}
                            className="rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── History Tab ── */}
          {activeTab === "history" && (
            <div className="overflow-x-auto">
              {history.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Brain size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Henüz tahmin yapılmamış</p>
                  <p className="text-sm">Yukarıdaki &quot;Tahmin Çalıştır&quot; butonuna tıklayın</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                      <th className="pb-3 pr-4">Hedef Tarih</th>
                      <th className="pb-3 pr-4">Son Kapanış</th>
                      <th className="pb-3 pr-4">Tahmin</th>
                      <th className="pb-3 pr-4">Yön</th>
                      <th className="pb-3 pr-4">Gerçek</th>
                      <th className="pb-3 pr-4">Hata</th>
                      <th className="pb-3">Sonuç</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {history.map((p, i) => {
                        const dir = p.predicted_close > p.last_close ? "UP" : "DOWN";
                        return (
                          <motion.tr
                            key={p.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-border/20 transition hover:bg-muted/20"
                          >
                            <td className="py-3 pr-4 font-medium">{formatDate(p.target_date)}</td>
                            <td className="py-3 pr-4">{formatPrice(p.last_close)} ₺</td>
                            <td className="py-3 pr-4 font-semibold">{formatPrice(p.predicted_close)} ₺</td>
                            <td className="py-3 pr-4">
                              <DirectionBadge direction={dir} />
                            </td>
                            <td className="py-3 pr-4">
                              {p.actual_close != null ? `${formatPrice(p.actual_close)} ₺` : (
                                <span className="text-xs text-muted-foreground">Bekleniyor</span>
                              )}
                            </td>
                            <td className="py-3 pr-4">
                              {p.error_pct != null ? <ErrorBar pct={p.error_pct} /> : "—"}
                            </td>
                            <td className="py-3">
                              {p.is_direction_correct != null ? (
                                p.is_direction_correct ? (
                                  <CheckCircle2 size={18} className="text-emerald-500" />
                                ) : (
                                  <XCircle size={18} className="text-red-500" />
                                )
                              ) : (
                                <Clock size={16} className="text-muted-foreground/50" />
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Compare Tab ── */}
          {activeTab === "compare" && (
            <div>
              {comparisons.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Target size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Karşılaştırma verisi yok</p>
                  <p className="text-sm">Gerçek kapanış verileri geldikten sonra burada görünecek</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comparisons.map((c, i) => {
                    const diff = c.predicted_close - c.actual_close;
                    const maxBar = Math.max(...comparisons.map((x) => Math.max(x.predicted_close, x.actual_close)));

                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="rounded-2xl border border-border/40 bg-card/50 p-4 transition hover:border-border/70"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-foreground">
                              {formatDate(c.target_date)}
                            </span>
                            {c.is_direction_correct ? (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={10} /> Doğru
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
                                <XCircle size={10} /> Yanlış
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Hata: %{c.error_pct.toFixed(2)}</span>
                            <span>({diff > 0 ? "+" : ""}{formatPrice(diff)} ₺)</span>
                          </div>
                        </div>

                        {/* Visual bar comparison */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="w-16 text-right text-xs text-muted-foreground">Tahmin</span>
                            <div className="relative h-6 flex-1 overflow-hidden rounded-lg bg-muted/40">
                              <motion.div
                                className="absolute inset-y-0 left-0 rounded-lg bg-primary/70"
                                initial={{ width: 0 }}
                                animate={{ width: `${(c.predicted_close / maxBar) * 100}%` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.04 }}
                              />
                              <span className="absolute inset-y-0 flex items-center pl-2 text-[11px] font-semibold text-primary-foreground mix-blend-difference">
                                {formatPrice(c.predicted_close)} ₺
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="w-16 text-right text-xs text-muted-foreground">Gerçek</span>
                            <div className="relative h-6 flex-1 overflow-hidden rounded-lg bg-muted/40">
                              <motion.div
                                className="absolute inset-y-0 left-0 rounded-lg bg-emerald-500/70"
                                initial={{ width: 0 }}
                                animate={{ width: `${(c.actual_close / maxBar) * 100}%` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.04 + 0.1 }}
                              />
                              <span className="absolute inset-y-0 flex items-center pl-2 text-[11px] font-semibold text-primary-foreground mix-blend-difference">
                                {formatPrice(c.actual_close)} ₺
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {c.direction_predicted === "UP" ? (
                              <TrendingUp size={12} className="text-emerald-500" />
                            ) : (
                              <TrendingDown size={12} className="text-red-500" />
                            )}
                            Tahmin: {c.direction_predicted === "UP" ? "Yükseliş" : "Düşüş"}
                          </span>
                          <span className="flex items-center gap-1">
                            {c.direction_actual === "UP" ? (
                              <TrendingUp size={12} className="text-emerald-500" />
                            ) : (
                              <TrendingDown size={12} className="text-red-500" />
                            )}
                            Gerçek: {c.direction_actual === "UP" ? "Yükseliş" : "Düşüş"}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
