import "../css/programCreating.css";
import {
  generateWorkoutLogs,
  fetchDayPrograms,
  fetchWorkoutLogs,
  updateDayProgramAPI,
  deleteWorkoutLogsByProgram,
} from "../redux/slices/programSlice";
import DayProgram from "../components/DayProgram";
import { useSelector, useDispatch } from "react-redux";
import { addDayProgramAPI } from "../redux/slices/programSlice";
import { useEffect, useState } from "react";
function ProgramCreating() {
  const dispatch = useDispatch();

  //save butonu aktifliği için flag oluştur
  const [isSaved, setIsSaved] = useState(false);
  const [programChanged, setProgramChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  //Control state for dayprograms
  const dayPrograms = useSelector((state) => state.program.dayPrograms);

  //Sorting days
  const weekDays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  const sortedDayPrograms = [...dayPrograms].sort(
    (a, b) =>
      weekDays.indexOf(a.day.toLowerCase()) -
      weekDays.indexOf(b.day.toLowerCase())
  );

  useEffect(() => {
    dispatch(fetchDayPrograms());
  }, [dispatch]);

  //Burada yeni DayProgram oluşturuluyor ve backende ekleniyor.
  const handleAddNew = () => {
    dispatch(
      addDayProgramAPI({
        day: "",
        isLocked: false,
        exercises: [
          {
            id: 0,
            name: "",
            sets: "",
            reps: "",
            muscle: "",
          },
        ],
      })
    ).then(() => {
      setProgramChanged(true);
      setIsSaved(false);
    });
  };

  //Tüm haftanın loglarını tetiklemek için
  const handleSave = async () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to save and reset the calendar? This will delete all existing workout logs and create a new 30-day schedule. Completed exercises will be lost. "
    );

    if (!isConfirmed) {
      return;
    }

    setIsSaving(true);
    try {
      // 1. Tüm güncel programları kaydet
      for (const program of dayPrograms) {
        await dispatch(updateDayProgramAPI(program));
      }
      const today = new Date().toISOString().split("T")[0];
      for (const program of dayPrograms) {
        // Önce varsa logları sil (temiz başla)
        await dispatch(deleteWorkoutLogsByProgram(program.id));
        // Sonra yeni logları oluştur
        await dispatch(
          generateWorkoutLogs({
            program_id: program.id,
            start_date: today,
            days: 30, // veya ihtiyacın kaç günse
          })
        );
      }
      dispatch(fetchWorkoutLogs()); // Calendar'ı güncelle

      setIsSaved(true);
      setProgramChanged(false);
      // Başarı animasyonunu gösterdikten 2 saniye sonra butonu normale döndür
      setTimeout(() => {
        setIsSaved(false);
      }, 2000);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false); // <-- KAYDETME BİTTİ (başarılı ya da hatalı)
    }
  };

  const handleAnyChange = () => {
    setProgramChanged(true);
    setIsSaved(false); // Her değişiklikte Save aktifleşmeli
  };

  return (
    <div className="programCreating">
      <div>
        <h1>Create your weekly program!</h1>
      </div>
      <div className="divider"></div>
      <div className="dayList">
        {dayPrograms.length > 0 &&
          sortedDayPrograms.map((program) => (
            <DayProgram
              key={program.id}
              id={program.id}
              onAnyChange={handleAnyChange}
            ></DayProgram>
          ))}
        {/* Sonuncu kilitlendiyse, + butonu göster */}
        {dayPrograms.length === 0 && (
          <button className="btn-addDay" onClick={handleAddNew}>
            + Add Day Program
          </button>
        )}

        {dayPrograms.length > 0 &&
          dayPrograms[dayPrograms.length - 1].isLocked && (
            <button className="btn-addDay" onClick={handleAddNew}>
              + Add Day Program
            </button>
          )}
      </div>
      <div className="divider"></div>
      <div>
        {/* --- GÜNCELLENMİŞ BUTON JSX'İ --- */}
        <button
          className={`btn-save ${isSaving ? "btn-save--saving" : ""} ${
            isSaved ? "btn-save--success" : ""
          }`}
          disabled={isSaving || isSaved || !programChanged}
          onClick={handleSave}
        >
          {isSaving ? (
            <span className="btn-save__text">Saving...</span>
          ) : isSaved ? (
            <span className="btn-save__text">Saved!</span>
          ) : (
            <span className="btn-save__text">Save</span>
          )}
        </button>
      </div>
    </div>
  );
}

export default ProgramCreating;
