import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAnalysis, setAnalysisLevel } from "../redux/slices/programSlice";

/* -------------------- küçük yardımcılar -------------------- */
function pct(n) {
  return Math.round((n || 0) * 100);
}
function cls(...arr) {
  return arr.filter(Boolean).join(" ");
}

/** Haftalık trend için min-max normalize edilmiş basit sparkline (SVG) */
function TrendSparkline({ values = [] }) {
  if (!values.length) return null;
  const w = 160;
  const h = 40;
  const pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const norm = (v) => {
    if (max === min) return h / 2;
    // 0 üstte görünsün diye ters çeviriyoruz
    return pad + (h - pad * 2) * (1 - (v - min) / (max - min));
  };
  const step = (w - pad * 2) / (values.length - 1 || 1);
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${pad + i * step} ${norm(v)}`)
    .join(" ");

  return (
    <svg width={w} height={h}>
      {/* zemin çizgisi */}
      <line
        x1={pad}
        y1={h - pad}
        x2={w - pad}
        y2={h - pad}
        stroke="rgba(0,0,0,.1)"
        strokeWidth="1"
      />
      {/* trend çizgisi */}
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** Etiket rengi: within/over/under */
function suffClass(status) {
  if (status === "within") return "text-success";
  if (status === "over") return "text-warning";
  return "text-danger";
}

/* -------------------- ortak Card -------------------- */
function Card({ title, right, children, className, headerClass }) {
  return (
    <div
      className={cls("card shadow-sm h-100", className)}
      style={{ borderRadius: 14 }}
    >
      <div
        className={cls(
          "card-header bg-white d-flex justify-content-between align-items-center",
          headerClass
        )}
        style={{ borderTopLeftRadius: 14, borderTopRightRadius: 14 }}
      >
        <h6 className="mb-0">{title}</h6>
        {right}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

/* -------------------- özel kartlar -------------------- */
function QualityCard({ program7 }) {
  return (
    <Card
      title="Programın Kalitesi (7 gün)"
      right={<span className="text-muted small">hedef aralığa göre</span>}
    >
      <div className="d-flex align-items-baseline gap-2">
        <div className="display-6 fw-bold">{pct(program7?.sufficiency)}%</div>
      </div>

      <div className="mt-3">
        {(program7?.byMuscle || []).map((m) => (
          <div
            key={m.muscle}
            className="d-flex justify-content-between small py-1 border-bottom"
          >
            <span className="text-capitalize">
              {m.muscle} • {m.plannedSets} set ({m.range[0]}–{m.range[1]})
            </span>
            <span className={suffClass(m.status)}>
              {pct(m.sufficiency)}% {m.status}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CompletionCard({ program30 }) {
  const trendText = (program30?.weeklyTrend || [])
    .map((v) => `${pct(v)}%`)
    .join(" • ");
  return (
    <Card
      title="30 Günlük Tamamlanma"
      right={<span className="text-muted small">set bazlı</span>}
    >
      <div className="d-flex align-items-center justify-content-between">
        <div className="display-6 fw-bold">{pct(program30?.completion)}%</div>
        <div className="text-primary">
          <TrendSparkline values={program30?.weeklyTrend || []} />
        </div>
      </div>
      <div className="small text-muted mt-2">Trend (haftalık): {trendText}</div>
      <div
        className="progress mt-3"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct(program30?.completion)}
      >
        <div
          className="progress-bar"
          style={{ width: `${pct(program30?.completion)}%` }}
        />
      </div>
    </Card>
  );
}

function ExtremesCard({ top, bottom }) {
  return (
    <Card title="En Çok / En Az Çalışan (7 gün)">
      <div className="d-flex justify-content-between">
        <div className="pe-3">
          <div className="small text-muted">En Çok</div>
          <div className="fw-semibold text-capitalize">
            {top?.muscle || "-"} • {top?.doneSets || 0} set
          </div>
        </div>
        <div className="text-end ps-3">
          <div className="small text-muted">En Az</div>
          <div className="fw-semibold text-capitalize">
            {bottom?.muscle || "-"} • {bottom?.doneSets || 0} set
          </div>
        </div>
      </div>
    </Card>
  );
}

function UndertrainedCard({ under }) {
  return (
    <Card title="Eksik Kalan Kas (7 gün)">
      {under ? (
        <>
          <div className="fw-semibold text-capitalize mb-1">
            {under.muscle} • {pct(under.sufficiency)}%
          </div>
          <div className="small text-muted">Eksik: {under.gapSets} set</div>
          <div className="mt-2">
            <div
              className="progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct(under.sufficiency)}
            >
              <div
                className="progress-bar bg-danger"
                style={{ width: `${pct(under.sufficiency)}%` }}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="text-success">Eksik kalan kas yok 🎯</div>
      )}
    </Card>
  );
}

function StreakCard({ streak }) {
  // alevli görünüm + hafif animasyon
  const flame = "🔥";
  const current = streak?.current ?? streak?.days ?? 0;
  const best = streak?.best ?? streak?.days ?? 0;

  return (
    <Card title="Streak" headerClass="border-0" className="text-white">
      <div
        className="p-3"
        style={{
          borderRadius: 12,
          background: "linear-gradient(135deg, #ff7a18 0%, #ff3f81 100%)",
          boxShadow: "0 8px 24px rgba(255, 63, 129, .35)",
        }}
      >
        <div className="d-flex align-items-center justify-content-between">
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: 0.5 }}>
            {current} <span className="ms-1">gün</span>
          </div>
          <div
            className="display-6"
            style={{
              animation: "pulse 1.6s infinite",
              transformOrigin: "center",
            }}
          >
            {flame}
          </div>
        </div>
        <div className="small mt-1">
          En iyi seri: <b>{best}</b>
        </div>
      </div>

      {/* küçük css animasyonu (inline <style>) */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>
    </Card>
  );
}

function CalendarCompletionCard({ calendar30 }) {
  return (
    <Card title="Takvim Tamamlama (30 gün)">
      <div className="d-flex flex-column gap-2">
        <div className="d-flex justify-content-between">
          <span>Tam gün:</span>
          <b>{pct(calendar30?.fullCompletionDayRate)}%</b>
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct(calendar30?.fullCompletionDayRate)}
        >
          <div
            className="progress-bar bg-success"
            style={{ width: `${pct(calendar30?.fullCompletionDayRate)}%` }}
          />
        </div>
        <div className="d-flex justify-content-between mt-2">
          <span>En az 1 egzersiz:</span>
          <b>{pct(calendar30?.anyCompletionDayRate)}%</b>
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct(calendar30?.anyCompletionDayRate)}
        >
          <div
            className="progress-bar"
            style={{ width: `${pct(calendar30?.anyCompletionDayRate)}%` }}
          />
        </div>
      </div>
    </Card>
  );
}

/* -------------------- sayfa -------------------- */
export default function Analysis() {
  const dispatch = useDispatch();
  const { data, loading, error, level } = useSelector(
    (s) => s.program.analysis
  );

  useEffect(() => {
    dispatch(fetchAnalysis());
  }, [dispatch, level]);

  const handleLevelChange = (e) => dispatch(setAnalysisLevel(e.target.value));

  const memo = useMemo(() => {
    if (!data) return {};
    const {
      program7,
      program30,
      topMuscle7,
      bottomMuscle7,
      undertrained7,
      streak,
      calendar30,
    } = data;
    return {
      program7,
      program30,
      topMuscle7,
      bottomMuscle7,
      undertrained7,
      streak,
      calendar30,
    };
  }, [data]);

  if (loading) return <div className="p-3">Loading…</div>;
  if (error) return <div className="p-3 text-danger">Error: {error}</div>;
  if (!data) return <div className="p-3">No data</div>;

  return (
    <div className="container py-3">
      {/* üst bar */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="mb-0">Analysis</h5>
        <div className="d-flex align-items-center gap-2">
          <label className="mb-0 small text-muted">Seviye</label>
          <select
            className="form-select form-select-sm"
            style={{ width: 260 }}
            value={level}
            onChange={handleLevelChange}
          >
            <option value="beginner">Beginner (Yeni Başlayan)</option>
            <option value="intermediate">Intermediate (Orta)</option>
            <option value="advanced">Advanced (İleri)</option>
          </select>
        </div>
      </div>

      {/* grid */}
      <div className="row g-3">
        <div className="col-12 col-xl-4">
          <QualityCard program7={memo.program7} />
        </div>
        <div className="col-12 col-xl-4">
          <CompletionCard program30={memo.program30} />
        </div>
        <div className="col-12 col-xl-4">
          <ExtremesCard top={memo.topMuscle7} bottom={memo.bottomMuscle7} />
        </div>

        <div className="col-12 col-xl-4">
          <UndertrainedCard under={memo.undertrained7} />
        </div>
        <div className="col-12 col-xl-4">
          <StreakCard streak={memo.streak} />
        </div>
        <div className="col-12 col-xl-4">
          <CalendarCompletionCard calendar30={memo.calendar30} />
        </div>
      </div>
    </div>
  );
}
