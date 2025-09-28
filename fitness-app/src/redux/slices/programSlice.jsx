import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const initialState = {
  workoutLogs: [],
  dayPrograms: [],
  workoutLogExercises: {},
  loading: false,
  error: null,
  globalLoading: false,

  analysis: {
    data: null,
    loading: false,
    error: null,
    level: "intermediate", // dropdown ile değiştiririz
  },
};
const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
//backend'den dayprograms listesini çek.
export const fetchDayPrograms = createAsyncThunk(
  "program/fetchDayPrograms",
  async (_, { getState }) => {
    const token = getState().auth.token;
    const response = await fetch(`${API_URL}/programs`, {
      // YENİ: İstek başlığına Authorization header'ını ekliyoruz.
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // Eğer cevap 401 ise, bu genellikle token'ın süresinin dolduğu anlamına gelir.
    if (response.status === 401) {
      // TODO: Kullanıcıyı otomatik olarak logout yapıp login sayfasına yönlendirebiliriz.
    }
    const data = await response.json();
    return data;
  }
);
//backende dayprograms listesine veri gönderme
export const addDayProgramAPI = createAsyncThunk(
  "program/addDayProgramAPI",
  async (newProgram, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      const response = await fetch(`${API_URL}/programs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newProgram),
      });

      const data = await response.json();

      // Eğer backend bir hata dönerse (örn: 400), bu hatayı yakalayıp Redux'a bildir.
      if (!response.ok) {
        return rejectWithValue(data.error || "Could not add program.");
      }

      return data;
    } catch (error) {
      // Ağ hatası gibi beklenmedik bir sorun olursa bunu yakala.
      return rejectWithValue(error.message);
    }
  }
);

//backend için güncelleme yapacağız.
export const updateDayProgramAPI = createAsyncThunk(
  "program/updateDayProgramAPI",
  async (program, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    const response = await fetch(`${API_URL}/programs/${program.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(program),
    });
    // Eğer backend bir hata dönerse (örn: 400), bu hatayı yakalayıp Redux'a bildir.

    const data = await response.json();
    if (!response.ok) {
      return rejectWithValue(data.error || "Could not add program.");
    }
    return data;
  }
);

//backend için silme işlemi
export const deleteDayProgramAPI = createAsyncThunk(
  "program/deleteDayProgramAPI",
  async (id, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const response = await fetch(`${API_URL}/programs/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();

        return rejectWithValue(errorData.error || "Could not add program.");
      }
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// WorkoutLogExercise tamamlandı bilgisini güncelle
export const toggleWorkoutLogExerciseCompletedAPI = createAsyncThunk(
  "workout/toggleWorkoutLogExerciseCompletedAPI",
  async ({ workoutLogExerciseId }, { getState, rejectWithValue }) => {
    const token = getState().auth.token;
    try {
      const response = await fetch(
        ` ${API_URL}/workoutlog-exercise/${workoutLogExerciseId}/completed`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || "Could not add program.");
      }

      // {id, isCompleted}
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

//-----------------------------LOG TABLES--------------------------------------------

// 30 günlük log ve egzersizleri şablondan üretir
export const generateWorkoutLogs = createAsyncThunk(
  "workout/generateWorkoutLogs",
  async ({ program_id, start_date, days }, { getState, rejectWithValue }) => {
    const token = getState().auth.token;

    try {
      const res = await fetch(`${API_URL}/workoutLog/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ program_id, start_date, days }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error("Workout logs could not be generated!");

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// SQL’den tüm workout log kayıtlarını getirir
export const fetchWorkoutLogs = createAsyncThunk(
  "workout/fetchWorkoutLogs",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const res = await fetch(`${API_URL}/workoutlog`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Workout logs could not be fetched!");
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Bir workout log gününe ait egzersizleri getirir
export const fetchWorkoutLogExercises = createAsyncThunk(
  "workout/fetchWorkoutLogExercises",
  async (logId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const res = await fetch(` ${API_URL}/workoutlog/${logId}/exercises`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error("Workout log exercises could not be fetched!");
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

//Logları silmek için thunk
export const deleteWorkoutLogsByProgram = createAsyncThunk(
  "workout/deleteWorkoutLogsByProgram",
  async (programId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const res = await fetch(
        ` ${API_URL}/workoutlog/by-program/${programId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        return rejectWithValue(
          errorData.error || "Workout logs could not be deleted!"
        );
      }

      return programId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

//-----------------------------ANALYSIS EXECUTIONS--------------------------------------------

export const fetchAnalysis = createAsyncThunk(
  "program/fetchAnalysis",
  async (_, { getState, rejectWithValue }) => {
    try {
      const level = getState().program.analysis.level;
      const token = getState().auth.token;
      const res = await fetch(` ${API_URL}/analysis?level=${level}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        return rejectWithValue(data.error || "Analysis could not be fetched.");
      }
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
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
          id: Date.now() + Math.random(), //Localde kullanılacak.
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
    setAnalysisLevel: (state, action) => {
      state.analysis.level = action.payload; // "beginner" | "intermediate" | "advanced"
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
    builder.addCase(
      toggleWorkoutLogExerciseCompletedAPI.fulfilled,
      (state, action) => {
        const { id, isCompleted } = action.payload;
        // Bütün log günlerinde ilgili egzersizi bul ve güncelle
        Object.values(state.workoutLogExercises).forEach((exerciseList) => {
          const exercise = exerciseList.find((ex) => ex.id === id);
          if (exercise) {
            exercise.isCompleted = isCompleted;
          }
        });
      }
    );
    //--------------ANALIYSIS EXECUTIONS-------------------
    builder

      .addCase(fetchAnalysis.pending, (state) => {
        state.analysis.loading = true;
        state.analysis.error = null;
      })
      .addCase(fetchAnalysis.fulfilled, (state, action) => {
        state.analysis.loading = false;
        state.analysis.data = action.payload;
      })
      .addCase(fetchAnalysis.rejected, (state, action) => {
        state.analysis.loading = false;
        state.analysis.error = action.error.message;
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
  setAnalysisLevel,
} = programSlice.actions;

export default programSlice.reducer;
