import React from "react";
import "../css/exercise.css";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { deleteExerciseFromProgram } from "../redux/slices/programSlice";
function Exercise({
  data,
  id,
  onChange,
  isLocked,
  isCalendarView,
  onToggleCompleted,
}) {
  const dispatch = useDispatch();
  return (
    <div>
      {" "}
      <div className="input-exercise">
        <div className="input-exerciseName">
          <input
            type="text"
            placeholder=" Exercise name"
            value={data.name || ""}
            onChange={(e) => onChange(data.id, "name", e.target.value)}
            disabled={isLocked}
          />
        </div>
        <div className="input-sets">
          <input
            type="number"
            min={1}
            max={10}
            placeholder={"sets"}
            value={data.sets || ""}
            onChange={(e) => onChange(data.id, "sets", e.target.value)}
            disabled={isLocked}
          />
        </div>
        x
        <div className="input-reps">
          <input
            type="number"
            min={1}
            max={30}
            placeholder={"reps"}
            value={data.reps || ""}
            onChange={(e) => onChange(data.id, "reps", e.target.value)}
            disabled={isLocked}
          />
        </div>
        <div>
          <select
            name="input-bodyPart"
            id="bodyPart"
            value={data.muscle || ""}
            onChange={(e) => onChange(data.id, "muscle", e.target.value)}
            disabled={isLocked}
          >
            <option value="">muscle</option>
            <option value="chest">Chest</option>
            <option value="back">Back</option>
            <option value="triceps">Triceps</option>
            <option value="biceps">Biceps</option>
            <option value="quads">Quads</option>
            <option value="hamstring">Hamstring</option>
            <option value="shoulder">Shoulder</option>
          </select>
        </div>
        <div>
          {isCalendarView ? (
            <button
              className={`btn btn-success rounded-circle px-2 py-1 ${
                data.isCompleted ? "checked" : ""
              }`}
              onClick={() => onToggleCompleted(data.id)}
              style={{ marginLeft: 8 }}
            >
              {data.isCompleted ? "✔" : ""}
            </button>
          ) : (
            !isLocked && (
              <button
                className="btn btn-danger rounded-circle px-2 py-1"
                onClick={() =>
                  dispatch(
                    deleteExerciseFromProgram({
                      dayProgramId: id,
                      exerciseId: data.id,
                    })
                  )
                }
              >
                🗑
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default Exercise;

Exercise.propTypes = {
  data: PropTypes.shape({
    name: PropTypes.string,
    sets: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    reps: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    muscle: PropTypes.string,
  }),

  onChange: PropTypes.func.isRequired,
  isLocked: PropTypes.bool.isRequired,
  id: PropTypes.number.isRequired,
  isCalendarView: PropTypes.bool,
  onToggleCompleted: PropTypes.func,
};
