import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAnalysis, setAnalysisLevel } from "../redux/slices/programSlice";

function Card({ title, children }) {
  return (
    <div className="card p-3 shadow-sm" style={{ borderRadius: 12 }}>
      <h5 className="mb-2">{title}</h5>
      <div>{children}</div>
    </div>
  );
}

export default function Analysis() {
  const dispatch = useDispatch();
  const { data, loading, error, level } = useSelector(
    (s) => s.program.analysis
  );

  useEffect(() => {
    dispatch(fetchAnalysis());
  }, [dispatch, level]);

  const handleLevelChange = (e) => {
    dispatch(setAnalysisLevel(e.target.value));
  };

  if (loading) return <div className="p-3">Loading...</div>;
  if (error) return <div className="p-3 text-danger">Error: {error}</div>;
  if (!data) return <div className="p-3">No data</div>;

  const {
    program7,
    program30,
    topMuscle7,
    bottomMuscle7,
    undertrained7,
    streak,
    calendar30,
  } = data;

  return (
    <div className="container py-3">
      {/* Seviye seçimi */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <label className="mb-0">Seviye:</label>
        <select
          className="form-select"
          style={{ width: 220 }}
          value={level}
          onChange={handleLevelChange}
        >
          <option value="beginner">Beginner (Yeni Başlayan)</option>
          <option value="intermediate">Intermediate (Orta)</option>
          <option value="advanced">Advanced (İleri)</option>
        </select>
      </div>

      {/* Grid */}
      <div className="row g-3">
        {/* Programın Kalitesi (7 gün) */}
        <div className="col-12 col-md-4">
          <Card title="Programın Kalitesi (7 gün)">
            <div className="fs-4 fw-bold">
              {Math.round((program7?.sufficiency || 0) * 100)}%
            </div>
            <div className="mt-2">
              {/* Kas detayı (kısa liste) */}
              {(program7?.byMuscle || []).slice(0, 4).map((m) => (
                <div
                  key={m.muscle}
                  className="d-flex justify-content-between small"
                >
                  <span>
                    {m.muscle} • {m.plannedSets} set ({m.range[0]}–{m.range[1]})
                  </span>
                  <span
                    className={
                      m.status === "within"
                        ? "text-success"
                        : m.status === "over"
                        ? "text-warning"
                        : "text-danger"
                    }
                  >
                    {Math.round(m.sufficiency * 100)}% {m.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 30 Günlük Tamamlanma */}
        <div className="col-12 col-md-4">
          <Card title="30 Günlük Tamamlanma">
            <div className="fs-4 fw-bold">
              {Math.round((program30?.completion || 0) * 100)}%
            </div>
            <div className="small mt-2">
              Trend (haftalık):{" "}
              {(program30?.weeklyTrend || [])
                .map((v) => `${Math.round(v * 100)}%`)
                .join(" • ")}
            </div>
          </Card>
        </div>

        {/* En Çok / En Az Çalışan Kas */}
        <div className="col-12 col-md-4">
          <Card title="En Çok / En Az Çalışan (7 gün)">
            <div className="d-flex justify-content-between">
              <div>
                <div className="small text-muted">En Çok</div>
                <div className="fw-semibold">
                  {topMuscle7?.muscle || "-"} • {topMuscle7?.doneSets || 0} set
                </div>
              </div>
              <div className="text-end">
                <div className="small text-muted">En Az</div>
                <div className="fw-semibold">
                  {bottomMuscle7?.muscle || "-"} •{" "}
                  {bottomMuscle7?.doneSets || 0} set
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Eksik Kalan Kas */}
        <div className="col-12 col-md-4">
          <Card title="Eksik Kalan Kas (7 gün)">
            {undertrained7 ? (
              <>
                <div className="fw-semibold">
                  {undertrained7.muscle} •{" "}
                  {Math.round(undertrained7.sufficiency * 100)}%
                </div>
                <div className="small text-muted">
                  Eksik: {undertrained7.gapSets} set
                </div>
              </>
            ) : (
              <div>Eksik kalan kas yok</div>
            )}
          </Card>
        </div>

        {/* Streak */}
        <div className="col-12 col-md-4">
          <Card title="Streak">
            <div className="fs-4 fw-bold">{streak?.days || 0} gün</div>
          </Card>
        </div>

        {/* Takvim Tamamlama (30 gün) */}
        <div className="col-12 col-md-4">
          <Card title="Takvim Tamamlama (30 gün)">
            <div>
              Tam gün:{" "}
              <b>
                {Math.round((calendar30?.fullCompletionDayRate || 0) * 100)}%
              </b>
            </div>
            <div>
              En az 1 egzersiz:{" "}
              <b>
                {Math.round((calendar30?.anyCompletionDayRate || 0) * 100)}%
              </b>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
