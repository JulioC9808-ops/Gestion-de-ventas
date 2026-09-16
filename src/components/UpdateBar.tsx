import React from "react";
import "./UpdateBar.css";

interface Props {
  percent: number;
}

export default function UpdateBar({ percent }: Props) {
  return (
    <div className="update-bar-container">
      <div className="update-bar-title">
        Actualizando… {percent.toFixed(0)}%
      </div>

      <div className="update-bar-progress">
        <div
          className="update-bar-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
