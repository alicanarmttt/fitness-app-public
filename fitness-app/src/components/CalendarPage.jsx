import React from "react";
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useState } from "react";
import Calendar from "react-calendar";
import "../css/calendarPage.css"; // Varsayılan stil (gerekli!)
import "react-calendar/dist/Calendar.css";
import {
  fetchWorkoutLogs,
  fetchWorkoutLogExercises,
} from "../redux/slices/programSlice";

import DayProgram from "../components/DayProgram";
function CalendarPage() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchWorkoutLogs());
  }, [dispatch]);

  //GÜN KAYMASI İÇİN
  function toLocalIsoString(date) {
    // yyyy-mm-dd formatında
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  }

  //tüm workout logu getir.
  const workoutLogs = useSelector((state) => state.program.workoutLogs);
  console.log("workoutLogs", workoutLogs);

  //Tıklanan günü al.
  const [selectedDate, setSelectedDate] = useState(new Date());
  console.log(selectedDate);

  //Bir Gün Seçildiğinde O Günü formatını ayarla ve Log'unu Bul
  const selectedISODate = toLocalIsoString(selectedDate);

  console.log("selectedISODate", selectedISODate);
  const selectedLog = workoutLogs.find(
    (log) => toLocalIsoString(new Date(log.date)) === selectedISODate
  );
  console.log(selectedLog);

  //Günün Egzersizlerini (Log Exercises) Redux’tan veya Fetch’ten Al
  const workoutLogExercises = useSelector(
    (state) => state.program.workoutLogExercises[selectedLog?.id]
  );
  console.log(
    "workoutLogExercisesten gelen workoutLogExercises: ",
    workoutLogExercises
  );

  //Alırken eğer egzersiz yoksa memoize yapman ve render sayısını azaltmak için
  // Kullanmadan önce sıfırla:
  const safeExercises = workoutLogExercises || [];
  console.log("CalendarPage'den gelen safeExercises", safeExercises);

  // Tüm işaretli günler (log'ların tarihleri)
  const markedDates = workoutLogs.map((log) => log.date);

  useEffect(() => {
    if (selectedLog?.id) {
      dispatch(fetchWorkoutLogExercises(selectedLog.id));
    }
  }, [dispatch, selectedLog?.id]);

  return (
    <>
      {" "}
      <div className="calendar-layout">
        <div className="calendar">
          <Calendar
            value={selectedDate}
            onClickDay={setSelectedDate}
            tileClassName={({ date, view }) => {
              // date: Date objesi, view: "month" | "year" vs.
              const isoDate = date.toISOString().split("T")[0];
              return markedDates.includes(isoDate) ? "has-program" : null;
            }}
          ></Calendar>
        </div>

        <div className="day-program">
          <h3>Program Detayı</h3>
          <p>
            Seçilen gün: <b>{selectedISODate}</b>
          </p>
          {selectedLog ? (
            <DayProgram
              id={selectedLog.id}
              isCalendarView
              exercises={safeExercises}
            />
          ) : (
            <p>Bu gün için bir program yok.</p>
          )}
          {/* Burada ileride seçili günün programı görünecek */}
        </div>
      </div>
    </>
  );
}

export default CalendarPage;
