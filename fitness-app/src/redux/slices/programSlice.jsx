import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const initialState = {
  dayPrograms: [],
  loading: false,
  error: null,
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
const programSlice = createSlice({
  name: "program",
  initialState,
  reducers: {
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
    //boş egzersiz eklemek için
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
} = programSlice.actions;

export default programSlice.reducer;
