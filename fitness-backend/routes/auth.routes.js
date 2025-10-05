const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { findUserByEmail, createUser } = require("../queries/user.queries");

// Rota: POST /auth/register
// 1. Kullanıcı Kayıt (Register) Endpoint'i
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "Email is already in use." });
    }
    const newUser = await createUser(email, password);
    res.status(201).json({
      message: "User created succesfully!",
      user: { id: newUser.id, email: newUser.email },
    });
  } catch (error) {
    console.log("REGISTER ERROR:", error);
    res.status(500).json({ error: "Server error during registration." });
  }
});

// Rota: POST /auth/login
// 2. Kullanıcı Giriş (Login) Endpoint'i
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }
    // Şifre doğruysa, kullanıcıya bir JWT (giriş kartı) oluşturup veriyoruz.
    const payload = { sub: user.id, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d", // Token 1 gün geçerli
    });
    res.json({
      message: "Logged in succesfully!",
      token: token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ error: "Server error during login." });
  }
});

module.exports = router;
