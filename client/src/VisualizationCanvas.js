import React, { useEffect, useRef } from "react";
import embed from "vega-embed";

function VisualizationCanvas({ visualization }) {
  const visRef = useRef(null);

  useEffect(() => {
    if (visualization && visRef.current) {
      embed(visRef.current, visualization, { actions: false })
        .catch((err) => console.error("Vega embed error:", err));
    }
  }, [visualization]);

  return <div ref={visRef} style={{ width: "100%", height: "400px" }} />;
}

export default VisualizationCanvas;
