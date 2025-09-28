import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerUser } from "../redux/slices/authSlice";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

// --- React-Bootstrap component'lerini import ediyoruz ---
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
// ----------------------------------------------------

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const resultAction = await dispatch(registerUser({ email, password }));

    if (registerUser.fulfilled.match(resultAction)) {
      toast.success("Registration successful! Please log in.");
      navigate("/login");
    } else {
      toast.error(resultAction.payload || "An unknown error occurred.");
    }
  };

  const handleLoginClick = () => {
    navigate("/login");
  };

  return (
    <Container className="mt-5" style={{ maxWidth: "500px" }}>
      <h2>Register</h2>
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="formBasicEmail">
          <Form.Label>Email address</Form.Label>
          <Form.Control
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formBasicPassword">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </Form.Group>

        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
              />
              <span className="ms-2">Registering...</span>
            </>
          ) : (
            "Register"
          )}
        </Button>

        {error && <p className="mt-3 text-danger">{error}</p>}
      </Form>

      <div className="mt-3">
        <span>Already have an account? </span>
        {/* 'variant="link"' butonu normal bir link gibi gösterir. */}
        <Button variant="link" onClick={handleLoginClick}>
          Login
        </Button>
      </div>
    </Container>
  );
}

export default Register;
