const express = require("express");
const router = express.Router();
const passport = require("passport");
const { getAnalysis } = require("../queries/analysis.queries");

// Rota: GET /analysis
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { level, debug } = req.query;

      res.set({
        // Tarayıcıya bu veriyi asla önbelleğe almamasını söyler
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        // Ayrıca Express'in otomatik ETag oluşturmasını devre dışı bırakır
        etag: false,
      });
      const out = await getAnalysis({ level, debug, userId: req.user.id });
      res.json(out);
    } catch (err) {
      console.error("GET /analysis ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
