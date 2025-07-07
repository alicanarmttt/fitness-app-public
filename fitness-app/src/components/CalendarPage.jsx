import React from "react";
import { useState } from "react";
import Calendar from "react-calendar";
import "../css/calendarPage.css"; // Varsayılan stil (gerekli!)
import "react-calendar/dist/Calendar.css";
import { useSelector } from "react-redux";
import DayProgram from "../components/DayProgram";
function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dayPrograms = useSelector((state) => state.program.dayPrograms);

  const programDayNames = dayPrograms.map((p) => p.day.toLowerCase());
  // ["monday", "wednesday", ...]

  function getDayName(date) {
    // Pazartesi: "monday", Salı: "tuesday", ...
    return date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  }

  //seçili günü al ve programlar içinde bul
  const selectedDayName = getDayName(selectedDate);
  const selectedProgram = dayPrograms.find((p) => p.day === selectedDayName);

  return (
    <>
      {" "}
      <div className="calendar-layout">
        <div className="calendar">
          <Calendar
            value={selectedDate}
            onClickDay={setSelectedDate}
            tileClassName={({ date, view }) => {
              const dayName = getDayName(date); // "monday"
              return programDayNames.includes(dayName) ? "has-program" : null;
            }}
          ></Calendar>
        </div>

        <div className="day-program">
          <h3>Program Detayı</h3>
          <p>
            {" "}
            Seçilen gün<b>{/* tarih*/}</b>
          </p>
          {selectedProgram ? (
            <DayProgram id={selectedProgram.id} isCalendarView />
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
