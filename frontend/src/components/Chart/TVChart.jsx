import React, { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

const TVChart = ({ data }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: "#131722" },
        textColor: "#d1d4dc",
      },
      grid: {
        vertLines: { color: "#2a2e39" },
        horzLines: { color: "#2a2e39" },
      },

      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "#ccc",
      },
      timeScale: {
        borderColor: "#ccc",
      },
    });

    chartRef.current = chart;

    
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    
    const formattedDataMap = new Map();
    const volumeDataMap = new Map();

    data.forEach((d) => {
      const dateStr = d.date.split("T")[0]; 

      formattedDataMap.set(dateStr, {
        time: dateStr,
        open: Number(d.open),
        high: Number(d.high),
        low: Number(d.low),
        close: Number(d.close),
      });

      volumeDataMap.set(dateStr, {
        time: dateStr,
        value: Number(d.volume),
        color:
          Number(d.close) >= Number(d.open)
            ? "rgba(38,166,154,0.5)"
            : "rgba(239,83,80,0.5)",
      });
    });

    const formattedData = Array.from(formattedDataMap.values())
      .sort((a, b) => a.time.localeCompare(b.time));

    const volumeData = Array.from(volumeDataMap.values())
      .sort((a, b) => a.time.localeCompare(b.time));

    candleSeries.setData(formattedData);
    volumeSeries.setData(volumeData);

    chart.timeScale().fitContent();

    
    const handleResize = () => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data]);

  return (
    <div ref={chartContainerRef} style={{ width: "100%", height: "500px" }} />
  );
};

export default TVChart;
