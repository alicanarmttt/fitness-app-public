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
  //state for each day program
  // const savedPrograms = useSelector((state) => state.program.savedPrograms);
  //Control state for dayprograms
  const dayPrograms = useSelector((state) => state.program.dayPrograms);

  //save butonu aktifliği için flag oluştur
  const [isSaved, setIsSaved] = useState(false);
  const [programChanged, setProgramChanged] = useState(false);

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
          dayPrograms.map((program) => (
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
        <button disabled={isSaved || !programChanged} onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
}

export default ProgramCreating;
