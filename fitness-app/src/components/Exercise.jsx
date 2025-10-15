import React, { useState, useMemo } from "react";
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
  movements = [],
}) {
  const dispatch = useDispatch();
  // Seçilen kas grubunu ve arama metnini tutmak için local state kullanıyoruz.
  // Başlangıç değerini, mevcut veriden (data.movement_id) alıyoruz.
  const initialMovement = useMemo(
    () => movements.find((m) => m.id === data.movement_id),
    [data.movement_id, movements]
  );
  const [selectedMuscle, setSelectedMuscle] = useState(
    initialMovement ? initialMovement.primary_muscle_group : ""
  );

  // Tüm hareket listesinden benzersiz kas gruplarının bir listesini oluşturuyoruz.
  const muscleGroups = useMemo(
    () => [...new Set(movements.map((m) => m.primary_muscle_group))].sort(),
    [movements]
  );

  // Seçilen kas grubuna göre hareket listesini filtreliyoruz.
  const filteredMovements = useMemo(
    () =>
      selectedMuscle
        ? movements.filter((m) => m.primary_muscle_group === selectedMuscle)
        : [],
    [selectedMuscle, movements]
  );

  const handleMuscleChange = (e) => {
    setSelectedMuscle(e.target.value);
    // Kas grubu değiştiğinde, seçili hareketi sıfırla ki kullanıcı yeni bir seçim yapsın.
    onChange(data.id, "movement_id", "");
  };

  return (
    <div>
      {" "}
      <div className="input-exercise">
        {/* 3. ADIM: KAS GRUBU SEÇİM KUTUSU */}
        <div className="input-muscle-group">
          <select
            value={selectedMuscle}
            onChange={handleMuscleChange}
            disabled={isLocked}
          >
            <option value="">Select muscle</option>
            {muscleGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>
        {/* 4. ADIM: FİLTRELENMİŞ HAREKET SEÇİM KUTUSU */}
        <div className="input-exerciseName">
          <select
            value={data.movement_id || ""}
            onChange={(e) =>
              onChange(data.id, "movement_id", parseInt(e.target.value, 10))
            }
            disabled={isLocked || !selectedMuscle} // Kas grubu seçilmeden pasif
          >
            <option value="">Select exercise</option>
            {filteredMovements.map((movement) => (
              <option key={movement.id} value={movement.id}>
                {movement.name}
              </option>
            ))}
          </select>
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
          {isCalendarView ? (
            <button
              className={`btn btn-success rounded-circle ${
                data.isCompleted ? "checked" : ""
              }`}
              onClick={() => onToggleCompleted(data.id)}
              style={{ marginLeft: 8 }}
            >
              {data.isCompleted ? "✔" : "O"}
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
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    movement_id: PropTypes.number,
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
  movements: PropTypes.array,
};
