import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from '../api/api.js'
import { createChart } from "lightweight-charts";
import {
  ChevronLeft,
  Settings,
  Maximize2,
  BarChart2,
  Search,
  ChevronDown,
  X,
  TrendingUp,
  TrendingDown,
  Moon,
  Sun,
  Star,
  Trash2,
  Eye,
  ChevronRight
} from "lucide-react";
import { io } from "socket.io-client";
import { SOCKET_URL, API_BASE_URL } from "../config";

const HistoryDashboard = () => {
  const navigate = useNavigate();

  
  const AVAILABLE_INDICATORS = [
    
    ...[3, 5, 7, 8, 9, 10, 12, 14, 17, 19, 20, 26, 50, 65, 100, 150, 200, 252, 504, 1260].map(p => ({ label: `SMA (${p})`, key: `sma_price_${p}`, color: "#2962FF", type: 'Line' })),
    
    ...[3, 5, 7, 8, 9, 10, 12, 14, 17, 19, 20, 26, 50, 65, 100, 150, 200, 252, 504, 1260].map(p => ({ label: `EMA (${p})`, key: `ema_${p}`, color: "#F50057", type: 'Line' })),
    
    ...[5, 7, 12, 14, 21, 65, 252].map(p => ({ label: `RSI (${p})`, key: `rsi_${p}`, color: "#9C27B0", type: 'Line', priceScaleId: 'left' })),
    
    ...[5, 7, 12, 14, 21, 65, 252].map(p => ({ label: `ADX (${p})`, key: `adx_${p}`, color: "#FF9100", type: 'Line', priceScaleId: 'left' })),
    
    ...[5, 7, 12, 14, 21, 65, 252].map(p => ({ label: `ATR (${p})`, key: `atr_${p}`, color: "#795548", type: 'Line', priceScaleId: 'left' })),
    
    ...[5, 10, 20, 50, 65, 100, 150, 200, 252].map(p => ({ label: `BB Upper (${p}, 2)`, key: `bollinger_upper_${p}_2`, color: "#3D5AFE", type: 'Line' })),
    
    ...[5, 10, 20, 50, 65, 100, 150, 200, 252].map(p => ({ label: `BB Lower (${p}, 2)`, key: `bollinger_lower_${p}_2`, color: "#3D5AFE", type: 'Line' })),
    
    ...[5, 10, 20, 50, 65, 100, 150, 200, 252].map(p => ({ label: `BB Middle (${p}, 2)`, key: `bollinger_middle_${p}_2`, color: "#3D5AFE", type: 'Line', lineStyle: 2 })), 

    
    { label: "MACD Line (12,26)", key: "macd_line_26", color: "#00E676", type: 'Line', priceScaleId: 'left' },
    { label: "MACD Signal (9)", key: "macd_signal_26", color: "#FF1744", type: 'Line', priceScaleId: 'left' },
    { label: "MACD Hist (12,26,9)", key: "macd_histogram_26", color: "#00E676", type: 'Histogram', priceScaleId: 'left' },

    
    { label: "MACD Fast Line (8,17)", key: "macd_line_17", color: "#00E676", type: 'Line', priceScaleId: 'left' },
    { label: "MACD Fast Signal (9)", key: "macd_signal_17", color: "#FF1744", type: 'Line', priceScaleId: 'left' },

    
    ...[5, 14, 65, 252].map(p => ({ label: `MFI (${p})`, key: `mfi_${p}`, color: "#651FFF", type: 'Line', priceScaleId: 'left' })),

    
    ...[5, 7, 14, 21, 65, 252].map(p => ({ label: `Stoch %K (${p})`, key: `stoch_k_${p}`, color: "#2979FF", type: 'Line', priceScaleId: 'left' })),
    ...[5, 7, 14, 21, 65, 252].map(p => ({ label: `Stoch %D (${p})`, key: `stoch_d_${p}`, color: "#FF9100", type: 'Line', priceScaleId: 'left' })),

    
    { label: "Ichimoku Tenkan", key: "ichimoku_tenkan", color: "#00B0FF", type: 'Line' },
    { label: "Ichimoku Kijun", key: "ichimoku_kijun", color: "#D50000", type: 'Line' },
    { label: "Ichimoku Senkou A", key: "ichimoku_senkou_a", color: "#00C853", type: 'Line' },
    { label: "Ichimoku Senkou B", key: "ichimoku_senkou_b", color: "#FFAB00", type: 'Line' },

    
    { label: "VWAP", key: "vwap", color: "#FFAB00", type: 'Line' },
    { label: "OBV", key: "obv", color: "#607D8B", type: 'Line', priceScaleId: 'left' },
  ];
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const indicatorSeriesRef = useRef({}); 
  const calendarVisibleRangeRef = useRef(false); 
  const volumeSeriesRef = useRef(null);

  const [symbol, setSymbol] = useState(() => {
    return localStorage.getItem("selectedSymbol") || "MARICO";
  });

  
  const symbolRef = useRef(symbol);
  useEffect(() => {
    localStorage.setItem("selectedSymbol", symbol);
    symbolRef.current = symbol;
  }, [symbol]);
  const [historyData, setHistoryData] = useState([]);
  const [dateRange, setDateRange] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false); 
  const [chartType, setChartType] = useState("Candle"); 

  
  
  const [selectedInterval, setSelectedInterval] = useState("D");
  const [selectedRange, setSelectedRange] = useState("ALL");

  
  const [activeIndicators, setActiveIndicators] = useState([]); 
  const [isIndicatorSearchOpen, setIsIndicatorSearchOpen] = useState(false);
  const [indicatorQuery, setIndicatorQuery] = useState("");

  const [legend, setLegend] = useState(null);
  const [livePrices, setLivePrices] = useState({}); 
  const socketRef = useRef(null);

  const [availableInstruments, setAvailableInstruments] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [instrumentFocusedIndex, setInstrumentFocusedIndex] = useState(-1);
  const [indicatorFocusedIndex, setIndicatorFocusedIndex] = useState(-1);
  const dashboardRef = useRef(null); 
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("isDarkMode") === "true";
  });

  const [watchlist, setWatchlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("watchlist") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  const toggleWatchlist = (sym) => {
    setWatchlist(prev => {
      if (prev.includes(sym)) {
        return prev.filter(s => s !== sym);
      } else {
        return [...prev, sym];
      }
    });
  };

  const isInWatchlist = (sym) => watchlist.includes(sym);


  
  useEffect(() => {
    localStorage.setItem("isDarkMode", isDarkMode);
  }, [isDarkMode]);

  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(true);

  
  const filteredInstruments = availableInstruments.filter(inst =>
    inst.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredIndicators = AVAILABLE_INDICATORS.filter(ind =>
    ind.label.toLowerCase().includes(indicatorQuery.toLowerCase())
  );

  
  useEffect(() => {
    setInstrumentFocusedIndex(-1);
  }, [searchQuery, filteredInstruments.length]);

  useEffect(() => {
    setIndicatorFocusedIndex(-1);
  }, [indicatorQuery, filteredIndicators.length]);

  const handleInstrumentKeyDown = (e) => {
    if (filteredInstruments.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setInstrumentFocusedIndex((prev) => (prev + 1) % filteredInstruments.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setInstrumentFocusedIndex((prev) => (prev - 1 + filteredInstruments.length) % filteredInstruments.length);
    } else if (e.key === "Enter") {
      if (instrumentFocusedIndex >= 0 && instrumentFocusedIndex < filteredInstruments.length) {
        const inst = filteredInstruments[instrumentFocusedIndex];
        setSymbol(inst);
        setIsSearchOpen(false);
        setSearchQuery("");
      }
    } else if (e.key === "Escape") {
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleIndicatorKeyDown = (e) => {
    if (filteredIndicators.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndicatorFocusedIndex((prev) => (prev + 1) % filteredIndicators.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndicatorFocusedIndex((prev) => (prev - 1 + filteredIndicators.length) % filteredIndicators.length);
    } else if (e.key === "Enter") {
      if (indicatorFocusedIndex >= 0 && indicatorFocusedIndex < filteredIndicators.length) {
        const ind = filteredIndicators[indicatorFocusedIndex];
        const isActive = activeIndicators.some(i => i.key === ind.key);
        if (!isActive) {
          setActiveIndicators(prev => [...prev, ind]);
          setIsIndicatorSearchOpen(false);
          setIndicatorQuery("");
        }
      }
    } else if (e.key === "Escape") {
      setIsIndicatorSearchOpen(false);
      setIndicatorQuery("");
    }
  };

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const response = await api.get("/historical/list/symbols");
        if (response.data.success) {
          setAvailableInstruments(response.data.symbols);
        }
      } catch (err) {
        console.error("Failed to fetch symbols:", err);
      }
    };
    fetchSymbols();
  }, []);

  
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

    socketRef.current.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    socketRef.current.on("price-update", (data) => {
      
      
      
      
      
      

      if (data.symbol && data.ltp) {
        setLivePrices(prev => {
          const prevClose = data.ohlc?.close || data.ltp; 
          const change = data.ltp - prevClose;
          const changePercent = (change / prevClose) * 100;

          return {
            ...prev,
            [data.symbol]: {
              ltp: data.ltp,
              change: change,
              changePercent: changePercent,
              isUp: change >= 0
            }
          };
        });
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  
  useEffect(() => {
    const live = livePrices[symbol];
    if (live) {
      const sign = live.change >= 0 ? "+" : "";
      document.title = `${symbol}: ${live.ltp.toFixed(2)} (${sign}${live.changePercent.toFixed(2)}%)`;
    } else {
      document.title = `${symbol} - Trading View`;
    }
  }, [livePrices, symbol]);



  const toggleFullScreen = () => {
    if (!dashboardRef.current) return;

    if (!document.fullscreenElement) {
      dashboardRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleRangeSelection = (range) => {
    setSelectedRange(range);

    if (historyData.length === 0 || !chartRef.current) return;

    
    const lastDataPoint = historyData[historyData.length - 1];
    const toDate = new Date(lastDataPoint.date);

    
    let fromDate = new Date(toDate);

    switch (range) {
      case '1D':
        
        fromDate.setDate(toDate.getDate() - 1);
        break;
      case '5D':
        fromDate.setDate(toDate.getDate() - 5);
        break;
      case '1M':
        fromDate.setMonth(toDate.getMonth() - 1);
        break;
      case '3M':
        fromDate.setMonth(toDate.getMonth() - 3);
        break;
      case '6M':
        fromDate.setMonth(toDate.getMonth() - 6);
        break;
      case '1Y':
        fromDate.setFullYear(toDate.getFullYear() - 1);
        break;
      case '3Y':
        fromDate.setFullYear(toDate.getFullYear() - 3);
        break;
      case '5Y':
        fromDate.setFullYear(toDate.getFullYear() - 5);
        break;
      case 'ALL':
        
        
        fromDate = null;
        break;
      default:
        break;
    }

    if (range === 'ALL') {
      fetchHistory(null, true); 
      setDateRange(null);
      return;
    }

    
    const fromStr = fromDate.toISOString().split("T")[0];
    const toStr = lastDataPoint.date.split("T")[0];

    
    chartRef.current.timeScale().setVisibleRange({
      from: fromStr,
      to: toStr
    });

    
    setDateRange({ start: fromDate, end: toDate });
  };

  
  const formatNumber = (num) => {
    if (num === null || num === undefined) return "n/a";
    return "₹" + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVolume = (num) => {
    if (!num) return "n/a";
    if (num >= 10000000) return (num / 10000000).toFixed(2) + "Cr";
    if (num >= 100000) return (num / 100000).toFixed(2) + "L";
    if (num >= 1000) return (num / 1000).toFixed(2) + "K";
    return num.toString();
  };

  
  const earliestDateRef = useRef(null);
  const isLoadingRef = useRef(false);

  
  const fetchHistory = async (toDate = null, fetchAll = false) => {
    
    const currentSymbol = symbolRef.current;
    if (!currentSymbol) return;

    
    const requestKey = `${currentSymbol}-${toDate || 'initial'}-${fetchAll}`;
    if (isLoadingRef.current === requestKey) return;

    isLoadingRef.current = requestKey;
    setLoading(true);

    try {
      const encodedSymbol = encodeURIComponent(currentSymbol);
      let url = `${API_BASE_URL}/api/historical/${encodedSymbol}?interval=day`;

      if (fetchAll) {
        url += `&limit=10000`;
      } else {
        url += `&limit=100`;
        if (toDate) url += `&to=${toDate}`;
      }

      const response = await api.get(url);

      
      if (symbolRef.current !== currentSymbol) {
        console.log(`Discarding data for stale symbol: expected ${symbolRef.current}, got ${currentSymbol}`);
        return;
      }

      const newData = response.data || [];

      setHistoryData(prev => {
        
        if (symbolRef.current !== currentSymbol) return prev;

        let combined = toDate ? [...newData, ...prev] : newData;
        if (fetchAll) combined = newData;

        const seenDates = new Set();
        const uniqueData = [];
        const sortedCombined = combined.sort((a, b) => new Date(a.date) - new Date(b.date));

        for (const item of sortedCombined) {
          const dateStr = new Date(item.date).toISOString().split('T')[0];
          if (!seenDates.has(dateStr)) {
            seenDates.add(dateStr);
            uniqueData.push(item);
          }
        }

        if (uniqueData.length > 0) {
          earliestDateRef.current = uniqueData[0].date;
        }

        if (fetchAll || newData.length < 100) {
          setAllLoaded(true);
        }

        return uniqueData;
      });

    } catch (err) {
      if (symbolRef.current !== currentSymbol) return;
      console.error("Fetch error:", err.message);
      if (toDate && err.response?.status === 404 && !fetchAll) {
        setAllLoaded(true);
      } else if (!toDate) {
        setHistoryData([]);
      }
    } finally {
      
      if (isLoadingRef.current === requestKey) {
        isLoadingRef.current = false;
        setLoading(false);
      }
    }
  };

  
  useEffect(() => {
    symbolRef.current = symbol; 
    setHistoryData([]);
    setAllLoaded(false);
    setDateRange(null);
    earliestDateRef.current = null;
    fetchHistory(null);
  }, [symbol]);

  
  useEffect(() => {
    if (!chartContainerRef.current) return;

    
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: isDarkMode ? "#171717" : "#ffffff" },
        textColor: isDarkMode ? "#d4d4d4" : "#333333",
      },
      grid: {
        vertLines: { color: isDarkMode ? "#262626" : "#f0f0f0" },
        horzLines: { color: isDarkMode ? "#262626" : "#f0f0f0" },
      },
      rightPriceScale: {
        borderColor: isDarkMode ? "#404040" : "#e5e7eb",
        visible: true,
      },
      timeScale: {
        borderColor: isDarkMode ? "#404040" : "#e5e7eb",
        visible: true,
        fixLeftEdge: false, 
        fixRightEdge: true,
        rightOffset: 20,
        barSpacing: 6,
        minBarSpacing: 0.5,
        shiftVisibleRangeOnNewBar: true,
        rightBarStaysOnScroll: true,
        lockVisibleTimeRangeOnResize: true,
      },
      leftPriceScale: {
        visible: true,
        borderColor: isDarkMode ? "#404040" : "#e5e7eb",
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#C3BCDB44',
          style: 0,
          labelBackgroundColor: '#9B7DFF',
        },
        horzLine: {
          color: '#9B7DFF',
          labelBackgroundColor: '#9B7DFF',
        },
      },
    });

    chartRef.current = chart;

    
    const timeScale = chart.timeScale();
    timeScale.subscribeVisibleLogicalRangeChange((newRange) => {
      if (!newRange) return;

      
      if (newRange.from < 0 && !isLoadingRef.current && !allLoaded) {
        const firstDate = earliestDateRef.current;
        if (firstDate) {
          console.log(`Lazy loading older data for ${symbolRef.current}...`);
          fetchHistory(firstDate);
        }
      }
    });

    
    if (chartType === "Candle") {
      candleSeriesRef.current = chart.addCandlestickSeries({
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderVisible: true,
        borderUpColor: "#26a69a",
        borderDownColor: "#ef5350",
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350",
      });
    } else if (chartType === "Line") {
      candleSeriesRef.current = chart.addLineSeries({
        color: "#2962FF",
        lineWidth: 2,
      });
    } else if (chartType === "Area") {
      candleSeriesRef.current = chart.addAreaSeries({
        topColor: "rgba(41, 98, 255, 0.4)",
        bottomColor: "rgba(41, 98, 255, 0.0)",
        lineColor: "#2962FF",
        lineWidth: 2,
      });
    } else if (chartType === "Bar") {
      candleSeriesRef.current = chart.addBarSeries({
        upColor: "#26a69a",
        downColor: "#ef5350",
      });
    } else if (chartType === "Baseline") {
      candleSeriesRef.current = chart.addBaselineSeries({
        baseValue: { type: 'price', price: historyData[0]?.close || 0 }, 
        topLineColor: 'rgba( 38, 166, 154, 1)',
        topFillColor1: 'rgba( 38, 166, 154, 0.28)',
        topFillColor2: 'rgba( 38, 166, 154, 0.05)',
        bottomLineColor: 'rgba( 239, 83, 80, 1)',
        bottomFillColor1: 'rgba( 239, 83, 80, 0.05)',
        bottomFillColor2: 'rgba( 239, 83, 80, 0.28)',
      });
    } else if (chartType === "Histogram") {
      candleSeriesRef.current = chart.addHistogramSeries({
        color: '#26a69a',
      });
    }

    volumeSeriesRef.current = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "", 
      scaleMargins: {
        top: 0.8, 
        bottom: 0,
      },
    });
    volumeSeriesRef.current.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, 
        bottom: 0,
      },
    });

    
    
    indicatorSeriesRef.current = {};

    

    
    chart.subscribeCrosshairMove((param) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.seriesData.size === 0
      ) {
        setLegend(null);
        return;
      }

      const candleData = param.seriesData.get(candleSeriesRef.current);
      const volumeData = param.seriesData.get(volumeSeriesRef.current);

      if (candleData) {
        setLegend({
          open: candleData.open ?? candleData.value, 
          high: candleData.high ?? candleData.value,
          low: candleData.low ?? candleData.value,
          close: candleData.close ?? candleData.value,
          volume: volumeData ? volumeData.value : null,
          changePercent: candleData.changePercent || 0,
          color: (candleData.close >= candleData.open) ? "#8B0000" : "#006400"
        });
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [chartType, isDarkMode]); 

  
  useEffect(() => {
    if (!historyData.length || !candleSeriesRef.current) return;

    const formattedDataMap = new Map();
    historyData.forEach((d, i) => {
      const utcDate = new Date(d.date);
      const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
      const dateStr = istDate.toISOString().split("T")[0];

      const prevClose = i > 0 ? Number(historyData[i - 1].close) : Number(d.open);
      const close = Number(d.close);
      const change = close - prevClose;
      const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

      const base = { time: dateStr, changePercent };
      let finalItem;

      if (chartType === "Candle" || chartType === "Bar") {
        finalItem = {
          ...base,
          open: Number(d.open),
          high: Number(d.high),
          low: Number(d.low),
          close: Number(d.close),
        };
      } else {
        finalItem = {
          ...base,
          value: Number(d.close),
        };
      }

      
      formattedDataMap.set(dateStr, finalItem);
    });

    const formattedData = Array.from(formattedDataMap.values())
      .sort((a, b) => a.time.localeCompare(b.time));

    candleSeriesRef.current.setData(formattedData);

    if (volumeSeriesRef.current) {
      const volumeDataMap = new Map();
      historyData.forEach((d) => {
        const utcDate = new Date(d.date);
        const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
        const dateStr = istDate.toISOString().split("T")[0];

        volumeDataMap.set(dateStr, {
          time: dateStr,
          value: Number(d.volume),
          color: Number(d.close) >= Number(d.open) ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
        });
      });

      const volumeData = Array.from(volumeDataMap.values())
        .sort((a, b) => a.time.localeCompare(b.time));

      volumeSeriesRef.current.setData(volumeData);
    }

    
    
    

    
    
    if (historyData.length <= 100 && !calendarVisibleRangeRef.current) {
      chartRef.current.timeScale().fitContent();
    }

    calendarVisibleRangeRef.current = true; 

  }, [historyData, chartType, isDarkMode]);

  
  useEffect(() => {
    if (!chartRef.current || !historyData.length) return;

    
    Object.keys(indicatorSeriesRef.current).forEach(key => {
      const isActive = activeIndicators.some(ind => ind.key === key);
      if (!isActive) {
        try {
          chartRef.current.removeSeries(indicatorSeriesRef.current[key]);
        } catch (e) {
          console.warn("Series already removed or invalid", e);
        }
        delete indicatorSeriesRef.current[key];
      }
    });

    
    activeIndicators.forEach(ind => {
      if (!indicatorSeriesRef.current[ind.key]) {
        
        const series = chartRef.current.addLineSeries({
          color: ind.color,
          lineWidth: 2,
          title: ind.label,
          priceScaleId: ind.priceScaleId || 'right', 
          
          
        });
        indicatorSeriesRef.current[ind.key] = series;
      }

      
      const series = indicatorSeriesRef.current[ind.key];
      const indicatorDataMap = new Map();

      historyData
        .filter(d => d[ind.key] !== null && d[ind.key] !== undefined)
        .forEach(d => {
          const utcDate = new Date(d.date);
          const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
          const dateStr = istDate.toISOString().split("T")[0];

          indicatorDataMap.set(dateStr, {
            time: dateStr,
            value: Number(d[ind.key])
          });
        });

      const data = Array.from(indicatorDataMap.values())
        .sort((a, b) => a.time.localeCompare(b.time));

      series.setData(data);
    });
  }, [activeIndicators, historyData, chartType, isDarkMode]);

  
  const stats = useMemo(() => {
    if (!historyData.length) return null;

    
    let filteredData = historyData;
    if (dateRange) {
      const startTime = dateRange.start.getTime();
      const endTime = dateRange.end.getTime();
      filteredData = historyData.filter(d => {
        const t = new Date(d.date).getTime();
        return t >= startTime && t <= endTime;
      });
      
      if (filteredData.length === 0) filteredData = historyData;
    }

    
    const latest = filteredData[filteredData.length - 1]; 
    const realLatest = historyData[historyData.length - 1]; 

    const highs = filteredData.map(d => Number(d.high));
    const lows = filteredData.map(d => Number(d.low));
    const volumes = filteredData.map(d => Number(d.volume));

    const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;

    
    const prevClose = historyData.length > 1 ? Number(historyData[historyData.length - 2].close) : Number(latest.open);
    const change = Number(realLatest.close) - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    
    const latestCandle = chartType === "Candle" ? {
      open: Number(realLatest.open),
      high: Number(realLatest.high),
      low: Number(realLatest.low),
      close: Number(realLatest.close),
      volume: Number(realLatest.volume),
      changePercent: changePercent,
      color: Number(realLatest.close) >= Number(realLatest.open) ? "#8B0000" : "#006400"
    } : {
      open: Number(realLatest.close),
      high: Number(realLatest.close),
      low: Number(realLatest.close),
      close: Number(realLatest.close),
      volume: Number(realLatest.volume),
      changePercent: changePercent,
      color: "#2962FF"
    };

    return {
      currentClose: Number(realLatest.close),
      change,
      changePercent,
      
      open: Number(latest.open),
      
      
      
      
      
      

      
      
      
      
      
      

      
      
      
      
      

      openn: Number(filteredData[0].open),
      high: Math.max(...highs),
      low: Math.min(...lows),
      avgVolume: avgVol,
      rangeStart: filteredData[0].date,
      rangeEnd: latest.date,
      latestCandle
    };
  }, [historyData, chartType, dateRange]);

  
  const activeLegend = legend || (stats ? stats.latestCandle : null);

  return (
    <div ref={dashboardRef} className={`flex h-screen w-full font-sans overflow-hidden relative transition-colors ${isDarkMode ? "bg-neutral-900 text-gray-100" : "bg-gray-50 text-slate-900"}`}>

      {}
      {isSearchOpen && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20">
          <div className="bg-white rounded-lg shadow-xl w-96 max-h-[500px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b flex items-center gap-2">
              <Search className="text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search symbols..."
                className="flex-1 outline-none text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleInstrumentKeyDown}
                autoFocus
              />
              <button onClick={() => setIsSearchOpen(false)} className="hover:bg-gray-100 p-1 rounded">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {filteredInstruments.length > 0 ? (
                filteredInstruments.map((inst, index) => {
                  const live = livePrices[inst];
                  const isFocused = index === instrumentFocusedIndex;
                  return (
                    <button
                      key={inst}
                      onClick={() => {
                        setSymbol(inst);
                        setIsSearchOpen(false);
                        setSearchQuery("");
                      }}
                      onMouseEnter={() => setInstrumentFocusedIndex(index)}
                      className={`w-full text-left px-4 py-3 text-sm rounded transition-colors flex items-center justify-between ${symbol === inst ? "bg-blue-50" : ""} ${isFocused ? "bg-gray-100" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-medium ${symbol === inst ? "text-blue-600" : "text-gray-700"}`}>{inst}</span>
                      </div>

                      {live && (
                        <div className="text-right">
                          <div className={`font-mono font-medium ${live.isUp ? "text-green-600" : "text-red-600"}`}>
                            {live.ltp.toFixed(2)}
                          </div>
                          <div className={`text-[10px] flex items-center justify-end gap-1 ${live.isUp ? "text-green-600" : "text-red-600"}`}>
                            {live.isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {Math.abs(live.change).toFixed(2)} ({Math.abs(live.changePercent).toFixed(2)}%)
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-gray-400 text-sm">No symbols found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      <div className={`border-r flex flex-col shrink-0 z-10 transition-all duration-300 ease-in-out ${isSidebarVisible ? "w-[280px]" : "w-0 overflow-hidden opacity-0"} ${isDarkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-gray-200"}`}>
        {}
        <div
          className={`h-14 border-b flex items-center justify-between px-4 cursor-pointer transition-colors group ${isDarkMode ? "border-neutral-800 text-gray-400 hover:text-gray-200" : "border-gray-100 text-gray-500 hover:text-gray-900"}`}
        >
          <div onClick={() => navigate("/")} className="flex items-center gap-2">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium text-sm">Back of Home</span>
          </div>
          <button onClick={() => setIsSidebarVisible(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors" title="Hide Sidebar">
            <ChevronLeft size={16} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar no-scrollbar">
          {}
          <div>
            <label className={`text-xs font-bold tracking-wider mb-2 block uppercase ${isDarkMode ? "text-neutral-500" : "text-gray-500"}`}>Instrument</label>
            <div className="relative">
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className={`w-full appearance-none border rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-shadow ${isDarkMode ? "bg-neutral-800 border-neutral-700 text-gray-200 hover:border-blue-500" : "bg-white border-gray-300 text-gray-700 hover:border-blue-400"}`}
              >
                {availableInstruments.map((inst) => {
                  const live = livePrices[inst];
                  const label = live
                    ? `${inst}   ₹${live.ltp.toFixed(2)}   (${live.changePercent > 0 ? '+' : ''}${live.changePercent.toFixed(2)}%)`
                    : inst;
                  return <option key={inst} value={inst}>{label}</option>;
                })}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          {}
          <div>
            <label className={`text-xs font-bold tracking-wider mb-2 block uppercase flex justify-between items-center ${isDarkMode ? "text-neutral-500" : "text-gray-500"}`}>
              <span>Watchlist</span>
              {watchlist.length > 0 && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 rounded-full">{watchlist.length}</span>}
            </label>

            {watchlist.length === 0 ? (
              <div className={`p-3 text-center text-xs border border-dashed rounded ${isDarkMode ? "border-neutral-700 text-gray-600" : "border-gray-200 text-gray-400"}`}>
                Your watchlist is empty
              </div>
            ) : (
              <div className="space-y-1">
                {watchlist.map(wSymbol => (
                  <div
                    key={wSymbol}
                    className={`group flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${symbol === wSymbol
                      ? "bg-blue-50 border border-blue-100"
                      : isDarkMode ? "bg-neutral-800 hover:bg-neutral-700" : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    onClick={() => setSymbol(wSymbol)}
                  >
                    <span className={`text-xs font-medium ${symbol === wSymbol ? "text-blue-700" : isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                      {wSymbol}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(wSymbol);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 text-gray-400 transition-opacity p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {}
          <div>
            <label className={`text-xs font-bold tracking-wider mb-2 block uppercase ${isDarkMode ? "text-neutral-500" : "text-gray-500"}`}>Interval</label>
            <div className="grid grid-cols-4 gap-2">
              {['1m', '5m', '15m', '1h', '4h', 'D', 'W', 'M'].map((int) => (
                <button
                  key={int}
                  onClick={() => setSelectedInterval(int)}
                  className={`py-1.5 text-xs font-medium rounded border transition-all ${selectedInterval === int
                    ? "bg-blue-600 border-blue-600 text-white shadow-md active:scale-95 transform"
                    : isDarkMode
                      ? "bg-neutral-800 border-neutral-700 text-gray-400 hover:bg-neutral-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                >
                  {int}
                </button>
              ))}
            </div>
          </div>

          {}
          <div>
            <label className={`text-xs font-bold tracking-wider mb-2 block uppercase ${isDarkMode ? "text-neutral-500" : "text-gray-500"}`}>Date Range</label>
            <div className="grid grid-cols-5 gap-2">
              {['1D', '5D', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'].map((range) => (
                <button
                  key={range}
                  onClick={() => handleRangeSelection(range)}
                  className={`py-1.5 text-xs font-medium rounded border transition-all ${selectedRange === range
                    ? "bg-green-600 border-green-600 text-white shadow-md active:scale-95 transform"
                    : isDarkMode
                      ? "bg-neutral-800 border-neutral-700 text-gray-400 hover:bg-neutral-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {}
          <div>
            <label className={`text-xs font-bold tracking-wider mb-2 block uppercase ${isDarkMode ? "text-neutral-500" : "text-gray-500"}`}>Chart Type</label>
            <div className={`grid grid-cols-3 gap-1 rounded p-1 ${isDarkMode ? "bg-neutral-800" : "bg-gray-100"}`}>
              {['Candle', 'Line', 'Area', 'Bar', 'Baseline', 'Histogram'].map(type => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`py-1 text-xs font-medium rounded transition-all ${chartType === type
                    ? isDarkMode ? "bg-neutral-700 text-blue-400 shadow-sm" : "bg-white text-blue-600 shadow-sm"
                    : isDarkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-bold tracking-wider uppercase ${isDarkMode ? "text-neutral-500" : "text-gray-500"}`}>Indicators</label>
              <button
                onClick={() => setIsIndicatorSearchOpen(true)}
                className="text-blue-600 hover:text-blue-700 text-xs font-medium"
              >
                + Add
              </button>
            </div>

            <div className="space-y-1">
              {activeIndicators.map((ind) => (
                <div key={ind.key} className={`flex items-center justify-between px-2 py-1.5 rounded border group hover:border-blue-200 ${isDarkMode ? "bg-neutral-800 border-neutral-700" : "bg-gray-50 border-gray-100"}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }}></div>
                    <span className={`text-xs font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{ind.label}</span>
                  </div>
                  <button
                    onClick={() => setActiveIndicators(prev => prev.filter(i => i.key !== ind.key))}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {activeIndicators.length === 0 && (
                <div className={`text-xs text-center p-2 italic rounded border border-dashed ${isDarkMode ? "text-gray-600 bg-neutral-900 border-neutral-700" : "text-gray-400 bg-gray-50 border-gray-200"}`}>
                  No indicators
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {}
      {
        isIndicatorSearchOpen && (
          <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20">
            <div className="bg-white rounded-lg shadow-xl w-80 max-h-[400px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-3 border-b flex items-center gap-2">
                <Search className="text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search indicators..."
                  className="flex-1 outline-none text-xs font-medium"
                  value={indicatorQuery}
                  onChange={(e) => setIndicatorQuery(e.target.value)}
                  onKeyDown={handleIndicatorKeyDown}
                  autoFocus
                />
                <button onClick={() => setIsIndicatorSearchOpen(false)} className="hover:bg-gray-100 p-1 rounded">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-1">
                {filteredIndicators.length > 0 ? (
                  filteredIndicators.map((ind, index) => {
                    
                    const isActive = activeIndicators.some(i => i.key === ind.key);
                    const isFocused = index === indicatorFocusedIndex;
                    return (
                      <button
                        key={ind.key}
                        onClick={() => {
                          if (!isActive) setActiveIndicators(prev => [...prev, ind]);
                          setIsIndicatorSearchOpen(false);
                          setIndicatorQuery("");
                        }}
                        onMouseEnter={() => setIndicatorFocusedIndex(index)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between rounded transition-colors ${isActive ? "opacity-50 cursor-not-allowed" : ""} ${isFocused ? "bg-gray-100" : "hover:bg-gray-50"}`}
                        disabled={isActive}
                      >
                        <span className="font-medium text-gray-700">{ind.label}</span>
                        {isActive && <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Active</span>}
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-gray-400 text-xs">No indicators found</div>
                )}
              </div>
            </div>
          </div>
        )
      }
      {}
      <div className={`flex-1 flex flex-col min-w-0 relative ${isDarkMode ? "bg-neutral-900" : "bg-white"}`}>
        {}
        <div className={`h-14 border-b flex items-center justify-between px-6 shrink-0 z-20 shadow-sm ${isDarkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-gray-200"}`}>
          <div className="flex items-center gap-3">
            {!isSidebarVisible && (
              <button
                onClick={() => setIsSidebarVisible(true)}
                className={`p-1.5 rounded-md border mr-2 transition-all hover:scale-105 active:scale-95 ${isDarkMode ? "bg-neutral-800 border-neutral-700 text-gray-300" : "bg-white border-gray-200 text-gray-600 shadow-sm"}`}
                title="Show Sidebar"
              >
                <ChevronRight size={18} />
              </button>
            )}
            {}
            <div>
              <h1 className={`text-sm font-bold leading-tight flex items-center gap-2 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
                <span className="text-xl">{symbol}</span>
                <button
                  onClick={() => toggleWatchlist(symbol)}
                  className={`transition-colors ${isInWatchlist(symbol) ? "text-yellow-400 hover:text-yellow-500" : "text-gray-300 hover:text-yellow-400"}`}
                  title={isInWatchlist(symbol) ? "Remove from Watchlist" : "Add to Watchlist"}
                >
                  <Star size={18} fill={isInWatchlist(symbol) ? "currentColor" : "none"} />
                </button>
              </h1>
              <p className="text-[10px] text-gray-500 leading-tight">Real-time chart data & indicators</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full transition-colors ${isDarkMode ? "hover:bg-neutral-800 text-yellow-500" : "hover:bg-gray-100 text-gray-500"}`}
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`p-2 rounded-full transition-colors ${isDarkMode ? "hover:bg-neutral-800" : "hover:bg-gray-100/80"}`}
              title="Search Symbol"
            >
              <Search size={18} />
            </button>
            <button className={`p-2 rounded-full transition-colors ${isDarkMode ? "hover:bg-neutral-800" : "hover:bg-gray-100/80"}`}><Settings size={18} /></button>
            <button
              onClick={toggleFullScreen}
              className={`p-2 rounded-full transition-colors ${isDarkMode ? "hover:bg-neutral-800" : "hover:bg-gray-100/80"}`}
              title="Toggle Fullscreen"
            >
              <Maximize2 size={18} />
            </button>
            {!isRightSidebarVisible && (
              <button
                onClick={() => setIsRightSidebarVisible(true)}
                className={`p-1.5 ml-2 rounded-md border transition-all hover:scale-105 active:scale-95 ${isDarkMode ? "bg-neutral-800 border-neutral-700 text-gray-300" : "bg-white border-gray-200 text-gray-600 shadow-sm"}`}
                title="Show Statistics"
              >
                <ChevronLeft size={18} />
              </button>
            )}
          </div>
        </div>


        {}
        <div className={`flex-1 relative w-full h-full ${isDarkMode ? "bg-neutral-900" : "bg-white"}`}>
          {loading && historyData.length === 0 && (
            <div className={`absolute inset-0 z-50 backdrop-blur-sm flex items-center justify-center ${isDarkMode ? "bg-neutral-900/80" : "bg-white/80"}`}>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="mt-2 text-sm font-medium text-gray-600 animate-pulse">Loading Data...</span>
              </div>
            </div>
          )}

          {!loading && historyData.length === 0 && (
            <div className="absolute inset-0 z-40 flex items-center justify-center text-gray-400">
              No Data Available
            </div>
          )}

          {}
          {activeLegend && (
            <div className={`absolute top-4 left-4 z-20 pointer-events-none text-xs font-mono backdrop-blur-[2px] p-2 rounded border shadow-sm ${isDarkMode ? "bg-neutral-900/80 border-neutral-800 text-gray-200" : "bg-white/80 border-gray-100/50 text-gray-800"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-lg font-bold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>{symbol}</span>
                <span className="text-gray-400 text-[10px]">{selectedInterval}</span>
                <span className="text-green-600">({activeIndicators.length} indicators)</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500">
                <span className="">O <span className={activeLegend.close >= activeLegend.open ? "text-green-600" : "text-red-500"}>{formatNumber(activeLegend.open)}</span></span>
                <span className="">H <span className={activeLegend.close >= activeLegend.open ? "text-green-600" : "text-red-500"}>{formatNumber(activeLegend.high)}</span></span>
                <span className="">L <span className={activeLegend.close >= activeLegend.open ? "text-green-600" : "text-red-500"}>{formatNumber(activeLegend.low)}</span></span>
                <span className="">C <span className={activeLegend.close >= activeLegend.open ? "text-green-600" : "text-red-500"}>{formatNumber(activeLegend.close)}</span></span>
                <span className="">V <span className="text-purple-600">{formatVolume(activeLegend.volume)}</span></span>
              </div>
            </div>
          )}

          <div ref={chartContainerRef} className="w-full h-full relative" id="tv-chart-container">
            <style>{`
               #tv-chart-container a[href^="https://www.tradingview.com/"] {
                 display: none !important;
               }
             `}</style>
          </div>
        </div>
      </div>

      {}
      <div className={`border-l flex flex-col shrink-0 z-10 transition-all duration-300 ease-in-out ${isRightSidebarVisible ? "w-[300px]" : "w-0 overflow-hidden opacity-0"} ${isDarkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-gray-200"}`}>
        <div className={`h-14 border-b flex items-center justify-between px-4 shrink-0 ${isDarkMode ? "border-neutral-800" : "border-gray-100"}`}>
          <span className={`font-bold text-sm ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>Chart Statistics</span>
          <div className="flex items-center gap-2">
            <BarChart2 className="text-blue-600/50" size={18} />
            <button onClick={() => setIsRightSidebarVisible(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors" title="Hide Statistics">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {stats ? (
          <div className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">

            {}
            <div className={`border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow ${isDarkMode ? "bg-blue-900/10 border-blue-900/30" : "bg-blue-50/50 border-blue-100"}`}>
              <span className="text-xs font-bold text-blue-600/70 block mb-1 uppercase tracking-wider">Avg Close</span>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-blue-600">{formatNumber(stats.currentClose)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {}
              <div className={`border rounded-lg p-3 transition-colors ${isDarkMode ? "bg-green-900/10 border-green-900/30 hover:bg-green-900/20" : "bg-green-50/50 border-green-100 hover:bg-green-50"}`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-green-600/70 block uppercase tracking-wider">Open</span>
                  <span className="text-lg font-bold text-green-700">{formatNumber(stats.openn)}</span>
                </div>
              </div>

              {}
              <div className={`border rounded-lg p-3 transition-colors ${isDarkMode ? "bg-red-900/10 border-red-900/30 hover:bg-red-900/20" : "bg-red-50/50 border-red-100 hover:bg-red-50"}`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-red-600/70 block uppercase tracking-wider">Highest</span>
                  <span className="text-lg font-bold text-red-700">{formatNumber(stats.high)}</span>
                </div>
              </div>

              {}
              <div className={`border rounded-lg p-3 transition-colors ${isDarkMode ? "bg-orange-900/10 border-orange-900/30 hover:bg-orange-900/20" : "bg-orange-50/50 border-orange-100 hover:bg-orange-50"}`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-orange-600/70 block uppercase tracking-wider">Lowest</span>
                  <span className="text-lg font-bold text-orange-700">{formatNumber(stats.low)}</span>
                </div>
              </div>

              {}
              <div className={`border rounded-lg p-3 transition-colors ${isDarkMode ? "bg-purple-900/10 border-purple-900/30 hover:bg-purple-900/20" : "bg-purple-50/50 border-purple-100 hover:bg-purple-50"}`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-purple-600/70 block uppercase tracking-wider">Avg Volume</span>
                  <span className="text-lg font-bold text-purple-700">{formatVolume(stats.avgVolume)}</span>
                </div>
              </div>
            </div>

            {}
            <div className={`mt-4 text-xs bg-gray-50/50 p-4 rounded-xl border ${isDarkMode ? "bg-neutral-800 border-neutral-700 text-gray-400" : "bg-gray-50/50 border-gray-100 text-gray-500"}`}>
              <div className={`font-bold mb-3 uppercase tracking-wide text-[10px] ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Data Summary</div>
              <div className={`flex justify-between py-1 border-b border-dashed ${isDarkMode ? "border-neutral-700" : "border-gray-200"}`}>
                <span>Total Candles</span>
                <span className={`font-mono ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{historyData.length}</span>
              </div>
              <div className="flex justify-between py-1 mt-1">
                <span>Start Date</span>
                <span className={`font-mono ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{new Date(stats.rangeStart).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>End Date</span>
                <span className={`font-mono ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{new Date(stats.rangeEnd).toLocaleDateString()}</span>
              </div>
            </div>

          </div>
        ) : (
          <div className="p-6 text-center text-gray-400 text-sm flex flex-col items-center justify-center h-full">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${isDarkMode ? "bg-neutral-800" : "bg-gray-50"}`}>
              <BarChart2 className={isDarkMode ? "text-neutral-600" : "text-gray-300"} />
            </div>
            No data available
          </div>
        )}
      </div>

    </div >
  );
};

export default HistoryDashboard;