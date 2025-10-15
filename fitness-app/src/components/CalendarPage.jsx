import React from "react";
import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useState } from "react";
import Calendar from "react-calendar";
import Loader from "../components/Loader";
import "../css/calendarPage.css"; // Varsayılan stil (gerekli!)
import "react-calendar/dist/Calendar.css";
import {
  fetchWorkoutLogs,
  fetchWorkoutLogExercises,
} from "../redux/slices/programSlice";

import DayProgram from "../components/DayProgram";
function CalendarPage() {
  const dispatch = useDispatch();

  //Loading state'i al
  const calendarLoading = useSelector((state) => state.program.globalLoading);
  const movements = useSelector((state) => state.program.movements);

  useEffect(() => {
    dispatch(fetchWorkoutLogs());
  }, [dispatch]);

  //GÜN KAYMASI İÇİN
  function toLocalIsoString(date) {
    // Eğer string geldiyse Date objesine çevir
    if (typeof date === "string") {
      date = new Date(date);
    }

    // yyyy-mm-dd formatında
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  }

  //tüm workout logu getir.
  const workoutLogs = useSelector((state) => state.program.workoutLogs);

  //Tıklanan günü al.
  const [selectedDate, setSelectedDate] = useState(new Date());

  //Bir Gün Seçildiğinde O Günü formatını ayarla ve Log'unu Bul
  const selectedISODate = toLocalIsoString(selectedDate);

  const selectedLog = workoutLogs.find(
    (log) => toLocalIsoString(new Date(log.date)) === selectedISODate
  );

  //Günün Egzersizlerini (Log Exercises) Redux’tan veya Fetch’ten Al
  const workoutLogExercises = useSelector(
    (state) => state.program.workoutLogExercises[selectedLog?.id]
  );

  //Alırken eğer egzersiz yoksa memoize yapman ve render sayısını azaltmak için
  // Kullanmadan önce sıfırla:
  const safeExercises = workoutLogExercises || [];

  // Tüm işaretli günler (log'ların tarihleri)
  const markedDates = workoutLogs.map((log) =>
    toLocalIsoString(new Date(log.date))
  );

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
              if (view === "month") {
                // Loglar YYYY-MM-DD formatında
                const isoDate = toLocalIsoString(date);
                if (markedDates.includes(isoDate)) {
                  return "has-program";
                }
              }
              return null;
            }}
          ></Calendar>
        </div>

        <div className="day-program">
          <h3>Program Detail</h3>
          <p>
            Selected day: <b>{selectedISODate}</b>
          </p>
          {calendarLoading && <Loader />}
          {selectedLog ? (
            <DayProgram
              id={selectedLog.id}
              isCalendarView
              movements={movements}
              exercises={safeExercises}
              loading={calendarLoading}
            />
          ) : (
            <p>There is no program for today.</p>
          )}
          {/* Burada ileride seçili günün programı görünecek */}
        </div>
      </div>
    </>
  );
}

export default CalendarPage;
