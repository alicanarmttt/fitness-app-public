import React, { useState, useMemo, useEffect } from "react";
import "../css/exercise.css";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { deleteExerciseFromProgram } from "../redux/slices/programSlice";
import Select from "react-select";

function Exercise({
  data,
  id, //DayProgram'ın ID
  onChange,
  isLocked,
  isCalendarView,
  onToggleCompleted,
  movements = [],
}) {
  const dispatch = useDispatch();

  // 'react-select'in anlayacağı formata (value/label) veriyi dönüştür.
  // Bu işlemi sadece bir kez yapmak için useMemo kullanıyoruz.
  const movementOptions = useMemo(
    () =>
      movements.map((m) => ({
        value: m.id,
        label: m.name,
        muscle: m.primary_muscle_group,
      })),
    [movements]
  );

  // Tüm hareket listesinden benzersiz kas gruplarının bir listesini oluşturuyoruz.
  const muscleGroupOptions = useMemo(
    () =>
      [...new Set(movements.map((m) => m.primary_muscle_group))]
        .sort()
        .map((muscle) => ({ value: muscle, label: muscle })),
    [movements]
  );

  // Redux'tan gelen `movement_id`'ye göre mevcut hareketi bulalım.
  const currentMovementValue = useMemo(
    () => movementOptions.find((opt) => opt.value === data.movement_id),
    [data.movement_id, movementOptions]
  );

  const [selectedMuscle, setSelectedMuscle] = useState(null);

  // Bu useEffect, Redux'tan gelen veri değiştiğinde (örn: sayfa ilk yüklendiğinde)
  // local state'i senkronize eder.
  useEffect(() => {
    if (currentMovementValue) {
      setSelectedMuscle({
        value: currentMovementValue.muscle,
        label: currentMovementValue.muscle,
      });
    } else {
      setSelectedMuscle(null);
    }
  }, [currentMovementValue]);

  // Mantık güncellendi: Eğer bir kas grubu seçilmemişse, artık boş dizi yerine TÜM hareketleri gösterir.
  const filteredMovementOptions = useMemo(
    () =>
      selectedMuscle
        ? movementOptions.filter((opt) => opt.muscle === selectedMuscle.value)
        : movementOptions,
    [selectedMuscle, movementOptions]
  );

  const handleMuscleChange = (selectedOption) => {
    setSelectedMuscle(selectedOption);

    // YORUM: Eğer kullanıcı yeni bir kas grubu filtresi seçerse
    // ve mevcut seçili hareket bu yeni filtrede yer almıyorsa,
    // hareket seçimini temizleyerek tutarlılığı sağlıyoruz.
    const currentIsStillInList = selectedOption
      ? currentMovementValue?.muscle === selectedOption.value
      : true; // Filtre temizlendiğinde her zaman listededir.

    if (!currentIsStillInList) {
      onChange(data.id, "movement_id", "");
    }
  };

  // YENİ FONKSİYON: Kullanıcı bir HAREKET seçtiğinde çalışır.
  const handleMovementChange = (selectedOption) => {
    // 1. Redux state'ini (üst bileşeni) güncelle
    const newMovementId = selectedOption ? selectedOption.value : "";
    onChange(data.id, "movement_id", newMovementId);

    // 2. Kas grubu seçim kutusunu otomatik olarak güncelle (tersine bağlama).
    if (selectedOption) {
      setSelectedMuscle({
        value: selectedOption.muscle,
        label: selectedOption.muscle,
      });
    } else {
      // Eğer kullanıcı "Select exercise" seçeneğini seçerse (seçimi temizlerse),
      // kas grubu filtresini de temizliyoruz.
      setSelectedMuscle(null);
    }
  };

  return (
    <div>
      <div className="input right">
        <div className="input-exercise">
          {/* 3. ADIM: KAS GRUBU SEÇİM KUTUSU */}
          <div className="input-muscle-group">
            <Select
              classNamePrefix="react-select"
              options={muscleGroupOptions}
              value={selectedMuscle}
              onChange={handleMuscleChange}
              isDisabled={isLocked}
              isClearable
            />
          </div>
          {/* 4. ADIM: FİLTRELENMİŞ HAREKET SEÇİM KUTUSU */}
          <div className="input-exerciseName">
            <Select
              classNamePrefix="react-select"
              options={filteredMovementOptions}
              value={currentMovementValue}
              onChange={handleMovementChange}
              isDisabled={isLocked}
              isClearable
            />
          </div>
        </div>

        <div className="input-left">
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
    </div>
  );
}

export default Exercise;

Exercise.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    movement_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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
