const express = require("express");
const router = express.Router();
const passport = require("passport");
const { listMovements } = require("../queries/movement.queries");

router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const movements = await listMovements();
      res.json(movements);
    } catch (error) {
      console.log("GET /movements ERROR", error);
      res.status(500).json({ error: "Failed to fetch movements." });
    }
  }
);

module.exports = router;
