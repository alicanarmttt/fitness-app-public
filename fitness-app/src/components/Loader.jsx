import React from "react";

// src/components/Loader.jsx
import { ClipLoader } from "react-spinners";

const Loader = ({ size = 40, color = "#3f51b5" }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: 80,
    }}
  >
    <ClipLoader size={size} color={color} />
  </div>
);

export default Loader;
