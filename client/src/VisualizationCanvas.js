import React, { useEffect, useRef } from "react";
import embed from "vega-embed";

function VisualizationCanvas({ visualization }) {
  const visRef = useRef(null);

useEffect(() => {
  if (!visRef.current || !visualization) return;

  const raw = visualization;

  const spec = {
    ...raw,
    $schema: raw.$schema ?? "https://vega.github.io/schema/vega-lite/v5.json",
    config: {
      mark: {},           
      ...(raw.config ?? {})
    }
  };

  embed(visRef.current, spec, { actions: false, mode: "vega-lite", renderer: "canvas" })
    .catch((err) => {
      console.error("Vega embed error:", err);
      console.log("Spec used for embed:", spec);
    });
}, [visualization]);



  return <div ref={visRef} style={{ width: "100%", height: "400px" }} />;
}

export default VisualizationCanvas;
