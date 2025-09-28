import "./App.css";
import { Routes, Route } from "react-router-dom";
import Loader from "./components/Loader";
import Analysis from "./components/Analysis";
import Home from "./pages/Home";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SideBar from "./components/SideBar";
import CalendarPage from "./components/CalendarPage";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import ProgramCreating from "./components/ProgramCreating";
function App() {
  return (
    <>
      <div className="app-container">
        <SideBar> </SideBar>
        <div className="main-content">
          <ToastContainer />
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            ></Route>
            <Route
              path="/create-program"
              element={
                <ProtectedRoute>
                  <ProgramCreating />
                </ProtectedRoute>
              }
            ></Route>
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <CalendarPage />
                </ProtectedRoute>
              }
            ></Route>
            <Route
              path="/analysis"
              element={
                <ProtectedRoute>
                  <Analysis />
                </ProtectedRoute>
              }
            ></Route>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </div>
      </div>
    </>
  );
}

export default App;
