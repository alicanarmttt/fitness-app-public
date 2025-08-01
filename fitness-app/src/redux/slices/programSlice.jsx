import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const initialState = {
  workoutLogs: [],
  dayPrograms: [],
  workoutLogExercises: {},
  loading: false,
  error: null,
  globalLoading: false,
};

//backend'den dayprograms listesini çek.
export const fetchDayPrograms = createAsyncThunk(
  "program/fetchDayPrograms",
  async () => {
    const response = await fetch("http://localhost:5000/programs");
    const data = await response.json();
    return data;
  }
);

//backende dayprograms listesine veri gönderme
export const addDayProgramAPI = createAsyncThunk(
  "program/addDayProgramAPI",
  async (newProgram) => {
    const response = await fetch("http://localhost:5000/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProgram),
    });
    const data = await response.json();
    return data;
  }
);

//backend için güncelleme yapacağız.
export const updateDayProgramAPI = createAsyncThunk(
  "program/updateDayProgramAPI",
  async (program) => {
    const response = await fetch(
      `http://localhost:5000/programs/${program.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(program),
      }
    );
    const data = await response.json();
    return data;
  }
);

//backend için silme işlemi
export const deleteDayProgramAPI = createAsyncThunk(
  "program/deleteDayProgramAPI",
  async (id) => {
    await fetch(`http://localhost:5000/programs/${id}`, {
      method: "DELETE",
    });
    return id;
  }
);

//isCompleted bilgisi gönderme
export const toggleExerciseCompletedAPI = createAsyncThunk(
  "program/toggleExerciseCompletedAPI",
  async ({ programId, exerciseId }) => {
    const response = await fetch(
      `http://localhost:5000/programs/${programId}/exercises/${exerciseId}/completed`,
      { method: "PATCH" }
    );
    const data = await response.json();
    // {id, isCompleted}
    return { programId, exerciseId, isCompleted: data.isCompleted };
  }
);

// 30 günlük log ve egzersizleri şablondan üretir
export const generateWorkoutLogs = createAsyncThunk(
  "workout/generateWorkoutLogs",
  async ({ program_id, start_date, days }) => {
    const res = await fetch("http://localhost:5000/workoutLog/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ program_id, start_date, days }),
    });
    if (!res.ok) throw new Error("Workout logs could not be generated!");
    return await res.json();
  }
);

// SQL’den tüm workout log kayıtlarını getirir
export const fetchWorkoutLogs = createAsyncThunk(
  "workout/fetchWorkoutLogs",
  async () => {
    const res = await fetch("http://localhost:5000/workoutlog");
    if (!res.ok) throw new Error("Workout logs could not be fetched!");
    return await res.json();
  }
);

// Bir workout log gününe ait egzersizleri getirir
export const fetchWorkoutLogExercises = createAsyncThunk(
  "workout/fetchWorkoutLogExercises",
  async (logId) => {
    const res = await fetch(
      `http://localhost:5000/workoutlog/${logId}/exercises`
    );
    if (!res.ok) throw new Error("Workout log exercises could not be fetched!");
    return await res.json();
  }
);

//Logları silmek için thunk
export const deleteWorkoutLogsByProgram = createAsyncThunk(
  "workout/deleteWorkoutLogsByProgram",
  async (programId) => {
    const res = await fetch(
      `http://localhost:5000/workoutlog/by-program/${programId}`,
      {
        method: "DELETE",
      }
    );
    if (!res.ok) throw new Error("Workout logs could not be deleted!");
    return programId;
  }
);

const programSlice = createSlice({
  name: "program",
  initialState,
  reducers: {
    setGlobalLoading: (state, action) => {
      state.globalLoading = action.payload;
    },

    unlockProgram: (state, action) => {
      const id = action.payload;
      state.dayPrograms = state.dayPrograms.map((dp) =>
        dp.id === id ? { ...dp, isLocked: false } : dp
      );
    },

    //selectdeki day bilgisini güncel olarak dayProgram statetinde tut.
    setDayForProgram: (state, action) => {
      const { id, day } = action.payload;
      state.dayPrograms = state.dayPrograms.map((dp) =>
        dp.id === id ? { ...dp, day } : dp
      );
    },
    //Call this reducer every input changes
    setExerciseField: (state, action) => {
      const { dayProgramId, exerciseId, field, value } = action.payload;

      const program = state.dayPrograms.find((d) => d.id === dayProgramId);
      if (!program) return;

      const exercise = program.exercises.find((e) => e.id === exerciseId);
      if (!exercise) return;

      exercise[field] = value;
    },
    //add empty exercise
    addExerciseToProgram: (state, action) => {
      const dayProgramId = action.payload;
      const program = state.dayPrograms.find((p) => p.id === dayProgramId);
      if (!program) return;
      if (program.exercises.length < 10) {
        program.exercises.push({
          name: "",
          sets: "",
          reps: "",
          muscle: "",
        });
      }
    },
    //delete only one exercise
    deleteExerciseFromProgram: (state, action) => {
      const { dayProgramId, exerciseId } = action.payload;
      const program = state.dayPrograms.find((p) => p.id === dayProgramId);
      if (!program) return;

      program.exercises = program.exercises.filter(
        (ex) => ex.id !== exerciseId
      );
    },
  },

  extraReducers: (builder) => {
    //-----------------ŞABLON TABLE EXECUTIONS-------------------

    //PROGRAMLARI GETİR
    builder.addCase(fetchDayPrograms.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchDayPrograms.fulfilled, (state, action) => {
      state.dayPrograms = action.payload;
    });

    builder.addCase(fetchDayPrograms.rejected),
      (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      };
    // PROGRAMLARA GÜN EKLE
    builder.addCase(addDayProgramAPI.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(addDayProgramAPI.fulfilled, (state, action) => {
      state.dayPrograms.push(action.payload);
    });

    builder.addCase(addDayProgramAPI.rejected),
      (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      };
    //PROGRAMI GÜNCELLE
    builder.addCase(updateDayProgramAPI.fulfilled, (state, action) => {
      const index = state.dayPrograms.findIndex(
        (p) => p.id === action.payload.id
      );
      if (index !== -1) {
        state.dayPrograms[index] = action.payload;
      }
    });
    //PRORAMI SİL
    builder.addCase(deleteDayProgramAPI.fulfilled, (state, action) => {
      state.dayPrograms = state.dayPrograms.filter(
        (p) => p.id !== action.payload
      );
    });

    //--------------LOG TABLE EXECUTIONS-------------------

    //TÜM LOGLARI OLUŞTUR
    builder.addCase(generateWorkoutLogs.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(generateWorkoutLogs.fulfilled, (state) => {
      state.loading = false;
      // Gerekirse state.workoutLogs'a ekleme yapabilirsin
    });
    builder.addCase(generateWorkoutLogs.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message;
    });

    //TUM LOGLARI ÇEK
    builder.addCase(fetchWorkoutLogs.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchWorkoutLogs.fulfilled, (state, action) => {
      state.loading = false;
      state.workoutLogs = action.payload;
    });
    builder.addCase(fetchWorkoutLogs.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message;
    });

    //BİR DAYPROGRAM'IN EXERCİSE LOGLARINI ÇEK
    builder.addCase(fetchWorkoutLogExercises.pending, (state) => {
      state.globalLoading = true;
      console.log(state.globalLoading);
    });

    builder.addCase(fetchWorkoutLogExercises.fulfilled, (state, action) => {
      const logId = action.meta.arg; // gönderdiğin id
      state.workoutLogExercises[logId] = action.payload;
      state.globalLoading = false;
    });

    builder.addCase(fetchWorkoutLogExercises.rejected, (state) => {
      state.globalLoading = false;
    });

    //EGZERSİZ TAMAMLANDI BİLGİSİ
    builder.addCase(toggleExerciseCompletedAPI.fulfilled, (state, action) => {
      const { programId, exerciseId, isCompleted } = action.payload;
      // Doğru programı bul
      const program = state.dayPrograms.find((p) => p.id === programId);
      if (!program) return;
      //Doğru egzersizi bul ve güncelle
      const exercise = program.exercises.find((e) => e.id === exerciseId);
      if (exercise) {
        exercise.isCompleted = isCompleted;
      }
    });
  },
});

export const {
  unlockProgram,
  setDayForProgram,
  setExerciseField,
  addExerciseToProgram,
  deleteExerciseFromProgram,
  setGlobalLoading,
} = programSlice.actions;

export default programSlice.reducer;
