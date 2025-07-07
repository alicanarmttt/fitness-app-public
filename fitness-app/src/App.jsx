import "./App.css";
import { Routes, Route } from "react-router-dom";

import Analysis from "./components/Analysis";
import Home from "./pages/Home";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SideBar from "./components/SideBar";
import CalendarPage from "./components/CalendarPage";
function App() {
  return (
    <>
      <div className="app-container">
        <SideBar> </SideBar>
        <div className="main-content">
          <ToastContainer />
          <Routes>
            <Route path="/" element={<Home></Home>}></Route>
            <Route
              path="/calendar"
              element={<CalendarPage></CalendarPage>}
            ></Route>
            <Route path="/analysis" element={<Analysis></Analysis>}></Route>
          </Routes>
        </div>
      </div>
    </>
  );
}

export default App;
