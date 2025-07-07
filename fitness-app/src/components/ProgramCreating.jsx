import React from "react";

import { fetchDayPrograms } from "../redux/slices/programSlice";

import "../css/programCreating.css";
import DayProgram from "./DayProgram";
import { useSelector, useDispatch } from "react-redux";
import { addDayProgramAPI } from "../redux/slices/programSlice";
import { useEffect } from "react";
function ProgramCreating() {
  const dispatch = useDispatch();
  //state for each day program
  // const savedPrograms = useSelector((state) => state.program.savedPrograms);
  //Control state for dayprograms
  const dayPrograms = useSelector((state) => state.program.dayPrograms);

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
    );
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
            <DayProgram key={program.id} id={program.id}></DayProgram>
          ))}
        {/* Sonuncu kilitlendiyse, + butonu göster */}
        {dayPrograms.length > 0 &&
          dayPrograms[dayPrograms.length - 1].isLocked && (
            <button className="btn-addDay" onClick={handleAddNew}>
              + Add Day Program
            </button>
          )}
      </div>
      <div className="divider"></div>
      <div>
        <button>Save</button>
      </div>
    </div>
  );
}

export default ProgramCreating;
