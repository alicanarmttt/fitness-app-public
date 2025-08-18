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
  toggleWorkoutLogExerciseCompletedAPI,
  fetchAnalysis,
} from "../redux/slices/programSlice";
import Loader from "./Loader";
function DayProgram({
  id,
  isCalendarView = false,
  onAnyChange,
  exercises = [],
  loading = false,
}) {
  const dispatch = useDispatch();

  //slice dan programın day ve lock durumunu aldık.
  const program = useSelector((state) =>
    state.program.dayPrograms.find((p) => p.id === id)
  );
  const dayPrograms = useSelector((state) => state.program.dayPrograms);
  const day = program?.day || "";
  const isLocked = program?.isLocked || false;

  //exercises statei ile gerekli egzersiz objesi kontrol edilerek çekilir.
  const exercisesState =
    useSelector(
      (state) => state.program.dayPrograms.find((p) => p.id === id)?.exercises
    ) || [];

  // LOGDAN GELEN exercise_name i exercise inputuna düzgün oturmak için.
  const exercisesToShow = isCalendarView
    ? exercises.map((ex) => ({
        ...ex,
        name: ex.exercise_name || ex.name, // name alanı garanti!
        id: ex.id, // id de garanti olsun
      }))
    : program?.exercises || [];
  if (isCalendarView) {
    // ... devamı
  }

  // Eğer calendar view'da ise sadece props'tan egzersizleri al, hiçbir redux'a bakma
  if (isCalendarView) {
    if (loading) {
      return <Loader />;
    }
    return (
      <div className="day-frame">
        <div className="exercises-frame">
          {exercises && exercises.length > 0 ? (
            exercisesToShow.map((exercise, index) => {
              return (
                <Exercise
                  key={exercise.id ?? index}
                  data={exercise}
                  index={index}
                  isLocked={true}
                  isCalendarView={true}
                  onToggleCompleted={async (logExerciseId) => {
                    try {
                      await dispatch(
                        toggleWorkoutLogExerciseCompletedAPI({
                          workoutLogExerciseId: logExerciseId,
                        })
                      ).unwrap(); // <-- unwrap dispatch'in sonucunda
                      dispatch(fetchAnalysis()); // başarıyla bittiyse analizi tazele
                    } catch (e) {
                      console.error("toggle error:", e);
                    }
                  }}
                />
              );
            })
          ) : (
            <div>Bu gün için egzersiz bulunamadı.</div>
          )}
        </div>
      </div>
    );
  }

  // --- Normal DayProgram (ekleme/düzenleme) ---

  //reducer a egzersiz bilgilerini göndererek dayProgram stateini güncelle.
  const handleChange = (exerciseId, field, value) => {
    dispatch(setExerciseField({ dayProgramId: id, exerciseId, field, value }));
  };

  const addExercise = () => {
    dispatch(addExerciseToProgram(id));
  };

  const handleClick = () => {
    if (exercisesState.length === 0) {
      toast.warn("Egzersiz ekleyiniz.");
      return;
    }
    for (let i = 0; i < exercisesState.length; i++) {
      const ex = exercisesState[i];

      if (!day) {
        toast.warn("Bir gün seçiniz");
        return;
      }
      if (!ex.name || !ex.muscle) {
        toast.warn(`Exercise ${i + 1}: Name and Muscle group must be selected`);
        return;
      }

      if (ex.sets < 1 || ex.sets > 10 || ex.reps < 1 || ex.reps > 30) {
        toast.warn(`Exercise ${i + 1}: Sets must be 1-10, Reps must be 1-30`);
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

    dispatch(
      updateDayProgramAPI({
        id,
        day,
        exercises: exercisesState,
        isLocked: true,
      })
    ).then(() => {
      onAnyChange && onAnyChange();
    });
  };

  const handleToggleCompleted = (exerciseId) => {
    dispatch(
      toggleWorkoutLogExerciseCompletedAPI({ programId: id, exerciseId })
    );
  };

  const handleDelete = () => {
    dispatch(deleteDayProgramAPI(id)).then(() => {
      onAnyChange && onAnyChange();
    });
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
      <div style={{ paddingTop: "10px" }}>
        {day.charAt(0).toUpperCase() + day.slice(1)}
      </div>
      <br />
      <div className="exercises-frame">
        <div>
          {exercisesState.map((exercise, index) => (
            <Exercise
              key={exercise.id ?? index}
              data={exercise}
              index={index}
              onChange={handleChange}
              isLocked={isLocked}
              id={id}
              isCalendarView={false}
              onToggleCompleted={
                !isLocked
                  ? (exerciseId) => handleToggleCompleted(exerciseId)
                  : undefined
              }
            />
          ))}
        </div>
        {!isLocked && (
          <button className="exercise-add" onClick={addExercise}>
            +
          </button>
        )}
        {/*Kaydet ve sil butonlar*/}
        {!isLocked ? (
          <>
            <button onClick={handleClick}>Save</button>
            <button
              className="btn btn-danger  px-3 py-1"
              onClick={handleDelete}
            >
              🗑
            </button>
          </>
        ) : (
          <>
            <button onClick={() => dispatch(unlockProgram(id))}>Edit</button>
            <button className="btn btn-danger px-3 py-1" onClick={handleDelete}>
              🗑
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default DayProgram;

DayProgram.propTypes = {
  id: PropTypes.number.isRequired,
  isCalendarView: PropTypes.bool,
  exercises: PropTypes.array,
  onAnyChange: PropTypes.func,
  loading: PropTypes.bool,
};
