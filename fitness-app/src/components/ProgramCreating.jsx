import "../css/programCreating.css";
import {
  generateWorkoutLogs,
  fetchDayPrograms,
  fetchWorkoutLogs,
  updateDayProgramAPI,
  deleteWorkoutLogsByProgram,
  fetchMovements,
  resetDayPrograms,
} from "../redux/slices/programSlice";
import DayProgram from "../components/DayProgram";
import { useSelector, useDispatch } from "react-redux";
import { addDayProgramAPI } from "../redux/slices/programSlice";
import { useEffect, useState, useRef } from "react";

function ProgramCreating() {
  const dispatch = useDispatch();

  //save butonu aktifliği için flag oluştur
  const [isSaved, setIsSaved] = useState(false);
  const [programChanged, setProgramChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  //Control state for dayprograms
  const dayPrograms = useSelector((state) => state.program.dayPrograms);
  const movements = useSelector((state) => state.program.movements);

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

  // Component yüklendiğinde ÖNCE programları, SONRA hareket listesini çek
  useEffect(() => {
    // İstekleri sıralı hale getiriyoruz.
    const fetchData = async () => {
      // Önce programları çek ve bitmesini bekle.
      await dispatch(fetchDayPrograms());
      // Programlar geldikten sonra hareketleri çek.
      dispatch(fetchMovements());
    };

    fetchData();
    // -------------------------
  }, [dispatch]);

  // 1. daylist div'ine bağlamak için bir ref oluşturun
  const dayListRef = useRef(null);
  useEffect(() => {
    // 3. Elementi ref üzerinden alın
    const dayListElement = dayListRef.current;

    if (dayListElement) {
      const handleWheelScroll = (event) => {
        // Sadece yatayda kaydırma alanı varsa bu işlemi yap
        if (dayListElement.scrollWidth > dayListElement.clientWidth) {
          // 4. Varsayılan dikey kaydırmayı engelle
          event.preventDefault();

          // 5. GÜNCELLENDİ: Tekerleğin dikey hareketini (deltaY) kullanarak
          //    yatayda 'smooth' (yumuşak) bir kaydırma yap
          dayListElement.scrollTo({
            left: dayListElement.scrollLeft + event.deltaY,
            behavior: "smooth",
          });
        }
      };

      // 6. Event listener'ı ekle
      dayListElement.addEventListener("wheel", handleWheelScroll);

      // 7. Bileşen kaldırıldığında (unmount) listener'ı temizle
      return () => {
        dayListElement.removeEventListener("wheel", handleWheelScroll);
      };
    }
  }, []);
  // Component ekrandan ayrılırken state'i temizle
  useEffect(() => {
    return () => {
      dispatch(resetDayPrograms());
    };
  }, [dispatch]);

  // --- HATA AYIKLAMA (DEBUG) İÇİN KONTROL ---
  // Bu useEffect, hareket listesi state'e yüklendiğinde konsola yazdırır.
  // Tarayıcınızın konsolunda (F12) "Hareket listesi başarıyla yüklendi" mesajını görmelisiniz.
  useEffect(() => {
    if (movements.length > 0) {
      console.log("Hareket listesi başarıyla yüklendi:", movements);
    }
  }, [movements]);
  // ------------------------------------------

  //Burada yeni DayProgram oluşturuluyor ve backende ekleniyor.
  const handleAddNew = () => {
    dispatch(
      addDayProgramAPI({
        day: "",
        isLocked: false,
        exercises: [],
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
      // // --- GEÇİCİ DEĞİŞİKLİK ---
      // const thirtyDaysAgo = new Date();
      // thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      // const startDate = thirtyDaysAgo.toISOString().split("T")[0];
      // // -------------------------
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
      <div className="dayList" ref={dayListRef}>
        {dayPrograms.length > 0 &&
          sortedDayPrograms.map((program) => (
            <DayProgram
              key={program.id}
              id={program.id}
              onAnyChange={handleAnyChange}
              movements={movements}
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
