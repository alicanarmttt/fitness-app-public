import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { loginUser } from "../redux/slices/authSlice";

// --- React-Bootstrap component'lerini import ediyoruz ---
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Container from "react-bootstrap/Container";
import Spinner from "react-bootstrap/Spinner";
// ----------------------------------------------------

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const resultAction = await dispatch(loginUser({ email, password }));

    if (loginUser.fulfilled.match(resultAction)) {
      toast.success("Login successful!");
      navigate("/create-program");
    } else {
      toast.error(resultAction.payload || "An unknown error occurred.");
    }
  };

  return (
    // <Container> component'i içeriği ortalar ve düzenli bir görünüm sağlar.
    <Container className="mt-5" style={{ maxWidth: "500px" }}>
      <h2>Login</h2>
      {/* <Form> component'i tüm formu sarar. */}
      <Form onSubmit={handleSubmit}>
        {/* <Form.Group> her bir label-input ikilisini gruplar. */}
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

        {/* <Button> component'i şık ve stilize bir buton oluşturur. */}
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? (
            <>
              {/* Yükleme durumunda dönen bir animasyon ekledik. */}
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
              />
              <span className="ms-2">Logging in...</span>
            </>
          ) : (
            "Login"
          )}
        </Button>

        {/* Hata mesajını Bootstrap'in text-danger sınıfıyla kırmızı gösteriyoruz. */}
        {error && <p className="mt-3 text-danger">{error}</p>}
      </Form>
    </Container>
  );
}

export default Login;
