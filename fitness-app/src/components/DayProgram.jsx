import React from "react";
import Exercise from "./Exercise";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  updateDayProgramAPI,
  deleteDayProgramAPI,
  setDayForProgram,
  unlockProgram,
  setExerciseField,
  addExerciseToProgram,
  toggleExerciseCompletedAPI,
} from "../redux/slices/programSlice";

function DayProgram({ id, isCalendarView = false }) {
  const dispatch = useDispatch();

  //slice dan programın day ve lock durumunu aldık.
  const program = useSelector((state) =>
    state.program.dayPrograms.find((p) => p.id === id)
  );

  const dayPrograms = useSelector((state) => state.program.dayPrograms);

  const day = program?.day || "";
  const isLocked = program?.isLocked || false;

  //exercises statei ile gerekli egzersiz objesi kontrol edilerek çekilir.
  const exercises = useSelector(
    (state) =>
      state.program.dayPrograms.find((p) => p.id === id)?.exercises || []
  );

  //reducer a egzersiz bilgilerini göndererek dayProgram stateini güncelle.
  const handleChange = (exerciseId, field, value) => {
    dispatch(setExerciseField({ dayProgramId: id, exerciseId, field, value }));
  };

  //add exercises state new exercise
  const addExercise = () => {
    dispatch(addExerciseToProgram(id));
  };

  //input requirements check before calling saveProgram func.
  const handleClick = () => {
    if (exercises.length === 0) {
      toast.warn("Egzersiz ekleyiniz.");
      return;
    }
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];

      if (!day) {
        toast.warn("Bir gün seçiniz");
        return;
      }
      if (!ex.name || !ex.muscle) {
        toast.warn(`Exercise ${i + 1}: Name and Muscle group must be selected`);
        return;
      }

      if (ex.sets < 1 || ex.sets > 10 || ex.reps < 1 || ex.reps > 30) {
        toast.warn(`Exercise ${i + 1}: Sets must be 1-10, Reps must me 1-30`);
        return;
      }
    }

    // TEKRAR GÜN KONTROLÜ EKLE:
    const isDuplicate = dayPrograms.some((p) => p.day === day && p.id !== id);
    if (isDuplicate) {
      toast.warn(
        `${day.charAt(0).toUpperCase() + day.slice(1)} günü zaten kaydedilmiş`
      );

      return;
    }
    // dispatch(saveProgram({ day, exercises, id })); // eski reducer GİDİYOR!
    dispatch(
      updateDayProgramAPI({
        id,
        day,
        exercises,
        isLocked: true,
      })
    );
  };

  //TAMAMLANDI BİLGİSİ İÇİN STORE DAN ALDIĞIMIZ FONKSİYON
  const handleToggleCompleted = (exerciseId) => {
    // programId (id), exerciseId
    dispatch(toggleExerciseCompletedAPI({ programId: id, exerciseId }));
    // test için:
    console.log("Toggle çağrıldı", exerciseId);
  };

  return (
    <div className="day-frame">
      {!isLocked && (
        <select
          value={day}
          onChange={(e) =>
            dispatch(setDayForProgram({ id, day: e.target.value }))
          }
        >
          <option value="">Select day</option>
          <option value="monday">Monday</option>
          <option value="tuesday">Tuesday</option>
          <option value="wednesday">Wednesday</option>
          <option value="thursday">Thursday</option>
          <option value="friday">Friday</option>
          <option value="saturday">Saturday</option>
          <option value="sunday">Sunday</option>
        </select>
      )}
      <div>{day.charAt(0).toUpperCase() + day.slice(1)}</div>
      <br />
      <div className="exercises-frame">
        <div>
          {exercises.map((exercise, index) => (
            <Exercise
              key={exercise.id}
              data={exercise}
              index={index}
              onChange={handleChange}
              isLocked={isLocked}
              id={id}
              isCalendarView={isCalendarView} // Yeni ekledik!
              onToggleCompleted={
                isCalendarView
                  ? (exerciseId) => handleToggleCompleted(exerciseId)
                  : undefined
              }
            ></Exercise>
          ))}
        </div>
        {/*Ekleme butonu*/}
        {!isLocked && !isCalendarView && (
          <button className="exercise-add" onClick={addExercise}>
            +
          </button>
        )}
        {/*Kaydet ve sil butonlar*/}
        {!isCalendarView &&
          (!isLocked ? (
            <>
              <button onClick={handleClick}>Kaydet</button>
              <button
                className="btn btn-danger  px-3 py-1"
                onClick={() => dispatch(deleteDayProgramAPI(id))}
              >
                🗑
              </button>
            </>
          ) : (
            <>
              <button onClick={() => dispatch(unlockProgram(id))}>
                Düzenle
              </button>
              <button
                className="btn btn-danger px-3 py-1"
                onClick={() => dispatch(deleteDayProgramAPI(id))}
              >
                🗑
              </button>
            </>
          ))}
      </div>
    </div>
  );
}

export default DayProgram;

DayProgram.propTypes = {
  id: PropTypes.number.isRequired,
  isCalendarView: PropTypes.bool,
};
