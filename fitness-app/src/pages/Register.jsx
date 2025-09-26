import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerUser } from "../redux/slices/authSlice";
import { toast } from "react-toastify";
import { Navigate, useNavigate } from "react-router-dom";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // dispatch ile registerUser aksiyonunu, email ve password ile tetikliyoruz.
    const resultAction = await dispatch(registerUser({ email, password }));

    // createAsyncThunk, işlemin sonucunu bir payload olarak döner.
    if (registerUser.fulfilled.match(resultAction)) {
      toast.success("Registration succesful! Please log in.");
      navigate("./Login.jsx");
    } else {
      toast.error(resultAction.payload || "An unkown error occured.");
    }
    console.log("Registering with:", { email, password });
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>
    </div>
  );
}

export default Register;
