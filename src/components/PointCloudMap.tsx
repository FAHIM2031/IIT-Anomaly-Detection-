import React, { useEffect, useRef, useState } from "react";
import { Room } from "../types";
import { RotateCw, Move3d, Compass, ZoomIn, ZoomOut, Flame, Info } from "lucide-react";

interface PointCloudMapProps {
  rooms: Room[];
  onTriggerFlame: (roomId: string) => Promise<void>;
  onClearFlame: (roomId: string) => Promise<void>;
}

interface Point3D {
  x: number; // -100 to 100
  y: number; // -50 to 50
  z: number; // -100 to 100
  type: "floor" | "wall" | "window" | "door" | "desk" | "sensor";
  sensorId?: string;
}

export default function PointCloudMap({ rooms, onTriggerFlame, onClearFlame }: PointCloudMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 3D camera refs to avoid React state triggers on animation frames
  const yawRef = useRef<number>(0.5); // Rotation around Y-axis
  const pitchRef = useRef<number>(0.3); // Rotation around X-axis
  const zoomRef = useRef<number>(1.3);
  const autoRotateRef = useRef<boolean>(true);
  const isDraggingRef = useRef<boolean>(false);
  const hoveredSensorRef = useRef<Room | null>(null);

  // React states only for interactive UI control toggles & hovers
  const [zoom, setZoom] = useState<number>(1.3);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hoveredSensor, setHoveredSensor] = useState<Room | null>(null);

  const dragStart = useRef({ x: 0, y: 0 });

  // Keep latest sensor values in ref for the animation loop
  const roomsRef = useRef<Room[]>(rooms);
  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  // Sync state variables to their respective refs for fast lookup in animation loops
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    hoveredSensorRef.current = hoveredSensor;
  }, [hoveredSensor]);

  // Generate 3D point cloud once
  const [points, setPoints] = useState<Point3D[]>([]);

  useEffect(() => {
    const tempPoints: Point3D[] = [];

    // 1. Generate Floor Points (Y = -35)
    // Grid pattern with some desks
    for (let x = -90; x <= 90; x += 3) {
      for (let z = -90; z <= 90; z += 3) {
        tempPoints.push({ x, y: -35, z, type: "floor" });
        
        // Add student desk shapes on top of floor
        if (Math.abs(x) < 70 && z > -50 && z < 70) {
          if (x % 30 === 0 && z % 30 === 0) {
            // Desk legs
            tempPoints.push({ x: x - 4, y: -25, z: z - 4, type: "desk" });
            tempPoints.push({ x: x + 4, y: -25, z: z - 4, type: "desk" });
            tempPoints.push({ x: x - 4, y: -25, z: z + 4, type: "desk" });
            tempPoints.push({ x: x + 4, y: -25, z: z + 4, type: "desk" });
            // Desk top surface (more densely packed)
            for (let dx = -6; dx <= 6; dx += 1.2) {
              for (let dz = -6; dz <= 6; dz += 1.2) {
                tempPoints.push({ x: x + dx, y: -15, z: z + dz, type: "desk" });
              }
            }
          }
        }
      }
    }

    // 2. Generate Back Wall Points (Z = -95)
    for (let x = -95; x <= 95; x += 3) {
      for (let y = -35; y <= 35; y += 3) {
        tempPoints.push({ x, y, z: -95, type: "wall" });
      }
    }

    // 3. Generate Front Wall Points (Z = 95)
    for (let x = -95; x <= 95; x += 3) {
      for (let y = -35; y <= 35; y += 3) {
        // Leave a gap for the door on the bottom left
        if (!(x < -50 && y < 15)) {
          tempPoints.push({ x, y, z: 95, type: "wall" });
        }
      }
    }

    // 4. Generate Left Wall Points (X = -95)
    for (let z = -95; z <= 95; z += 3) {
      for (let y = -35; y <= 35; y += 3) {
        tempPoints.push({ x: -95, y, z, type: "wall" });
      }
    }

    // 5. Generate Right Wall Points (X = 95, with Window gap)
    for (let z = -95; z <= 95; z += 3) {
      for (let y = -35; y <= 35; y += 3) {
        // Create window space in middle of right wall
        if (z > -40 && z < 40 && y > -10 && y < 25) {
          // Window frame points
          if (Math.abs(z) >= 35 || y <= -7 || y >= 22) {
            tempPoints.push({ x: 95, y, z, type: "window" });
          }
        } else {
          tempPoints.push({ x: 95, y, z, type: "wall" });
        }
      }
    }

    // 6. Door frame points at the front left
    for (let y = -35; y <= 15; y += 1.2) {
      tempPoints.push({ x: -75, y, z: 95, type: "door" });
      if (y >= 10) {
        for (let x = -95; x <= -75; x += 1.2) {
          tempPoints.push({ x, y, z: 95, type: "door" });
        }
      }
    }

    setPoints(tempPoints);
  }, []);

  // Sensor node coordinates in 3D
  const getSensorCoords = (id: string) => {
    switch (id) {
      case "room_1": return { x: -50, y: 15, z: -95 }; // Back Wall Left
      case "room_2": return { x: 50, y: 15, z: -95 };  // Back Wall Right
      case "room_3": return { x: 95, y: 8, z: 0 };    // Window Sensor Node
      case "room_4": return { x: -85, y: -10, z: 95 }; // Door Sensor Node
      default: return { x: 0, y: 0, z: 0 };
    }
  };

  // Temperature color mapper
  // Interpolates between Cool Blue (<= 22C), Slate/White (25C), Warm Amber (32C), and Flaming Red (>= 40C)
  const getTempColor = (temp: number, alpha: number = 1) => {
    if (temp <= 22) {
      // Deep sky blue to calm teal
      const ratio = Math.max(0, (temp - 15) / 7);
      const r = Math.round(59 + ratio * (71 - 59));
      const g = Math.round(130 + ratio * (184 - 130));
      const b = Math.round(246 + ratio * (224 - 246));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else if (temp <= 26) {
      // Teal to Slate White
      const ratio = (temp - 22) / 4;
      const r = Math.round(71 + ratio * (148 - 71));
      const g = Math.round(184 + ratio * (163 - 184));
      const b = Math.round(224 + ratio * (184 - 224));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else if (temp <= 34) {
      // Slate to Amber Warning
      const ratio = (temp - 26) / 8;
      const r = Math.round(148 + ratio * (245 - 148));
      const g = Math.round(163 + ratio * (158 - 163));
      const b = Math.round(184 + ratio * (11 - 184));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else {
      // Amber Warning to Flash Fire Red
      const ratio = Math.min(1, (temp - 34) / 10);
      const r = Math.round(245 + ratio * (239 - 245));
      const g = Math.round(158 + ratio * (68 - 158));
      const b = Math.round(11 + ratio * (68 - 11));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  };

  // Interpolate local temperature at any 3D coordinate based on inverse distance weighting of the 4 sensors
  const getInterpolatedTempAt = (x: number, y: number, z: number, currentRooms: Room[]) => {
    let numerator = 0;
    let denominator = 0;

    for (const room of currentRooms) {
      const sCoord = getSensorCoords(room.id);
      const dx = x - sCoord.x;
      const dy = y - sCoord.y;
      const dz = z - sCoord.z;
      
      // Euclidean distance
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) + 1; // Add epsilon to avoid division by zero
      
      // Inverse distance weight (power of 2)
      const weight = 1 / (dist * dist);
      
      numerator += room.temperature * weight;
      denominator += weight;
    }

    return denominator > 0 ? numerator / denominator : 24;
  };

  // Drag handlers for camera rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setAutoRotate(false);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!isDraggingRef.current) {
      // Mouse move detection for hovering over sensors
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Project all sensors to check distance
      let closestSensor: Room | null = null;
      let minDistance = 22; // Pixels radius threshold

      const currentRooms = roomsRef.current;
      const yaw = yawRef.current;
      const pitch = pitchRef.current;
      const zoom = zoomRef.current;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosX = Math.cos(pitch);
      const sinX = Math.sin(pitch);
      
      const width = rect.width;
      const height = rect.height;
      const cx = width / 2;
      const cy = height / 2;

      for (const room of currentRooms) {
        const coord = getSensorCoords(room.id);
        
        // 3D rotations
        // Rotate Y (Yaw)
        const x1 = coord.x * cosY - coord.z * sinY;
        const z1 = coord.x * sinY + coord.z * cosY;
        // Rotate X (Pitch)
        const y2 = coord.y * cosX - z1 * sinX;
        const z2 = coord.y * sinX + z1 * cosX;

        // Camera distance translation
        const zCamera = z2 + 250;
        const scale = (180 * zoom) / zCamera;

        const px = cx + x1 * scale;
        const py = cy + y2 * scale;

        const dist = Math.sqrt((px - mouseX) ** 2 + (py - mouseY) ** 2);
        if (dist < minDistance) {
          closestSensor = room;
          minDistance = dist;
        }
      }

      if (hoveredSensor?.id !== closestSensor?.id) {
        setHoveredSensor(closestSensor);
      }
      return;
    }

    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    yawRef.current = yawRef.current - dx * 0.007;
    pitchRef.current = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitchRef.current - dy * 0.007));

    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Canvas resize and render loops
  useEffect(() => {
    if (points.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const handleResize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = (rect?.width || 800) * window.devicePixelRatio;
      canvas.height = 420 * window.devicePixelRatio;
      canvas.style.width = "100%";
      canvas.style.height = "420px";
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const render = () => {
      // Apply auto-rotation if active
      if (autoRotateRef.current && !isDraggingRef.current) {
        yawRef.current += 0.0035;
      }

      const currentRooms = roomsRef.current;
      const yaw = yawRef.current;
      const pitch = pitchRef.current;
      const zoom = zoomRef.current;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosX = Math.cos(pitch);
      const sinX = Math.sin(pitch);

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      const cx = width / 2;
      const cy = height / 2;

      // Clear with elegant dark high-tech background
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, width, height);

      // Draw perspective grid reference base
      ctx.strokeStyle = "rgba(99, 102, 241, 0.04)";
      ctx.lineWidth = 1;
      for (let gridX = -90; gridX <= 90; gridX += 30) {
        ctx.beginPath();
        for (let gridZ = -90; gridZ <= 90; gridZ += 10) {
          // Project grid lines
          const x1 = gridX * cosY - gridZ * sinY;
          const z1 = gridX * sinY + gridZ * cosY;
          const y2 = -35 * cosX - z1 * sinX;
          const z2 = -35 * sinX + z1 * cosX;
          const zCamera = z2 + 250;
          const scale = (180 * zoom) / zCamera;
          const px = cx + x1 * scale;
          const py = cy + y2 * scale;
          if (gridZ === -90) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // Draw point cloud elements
      // First project and sort points by depth (back to front) for painters algorithm
      const projectedPoints = points.map((pt) => {
        // Rotate Y (Yaw)
        const x1 = pt.x * cosY - pt.z * sinY;
        const z1 = pt.x * sinY + pt.z * cosY;
        // Rotate X (Pitch)
        const y2 = pt.y * cosX - z1 * sinX;
        const z2 = pt.y * sinX + z1 * cosX;

        // Camera translation
        const zCamera = z2 + 250;
        const scale = (180 * zoom) / zCamera;

        const px = cx + x1 * scale;
        const py = cy + y2 * scale;

        // Interpolate temperature at this coordinate
        const localTemp = getInterpolatedTempAt(pt.x, pt.y, pt.z, currentRooms);

        return {
          px,
          py,
          depth: zCamera,
          type: pt.type,
          temp: localTemp,
          scale,
        };
      });

      // Sort points back-to-front
      projectedPoints.sort((a, b) => b.depth - a.depth);

      // Render points
      projectedPoints.forEach((p) => {
        // Out of bounds safety
        if (p.px < -50 || p.px > width + 50 || p.py < -50 || p.py > height + 50) return;

        // Determine particle alpha & size based on depth and element type
        let size = p.scale * 1.1;
        let alpha = Math.max(0.15, Math.min(0.85, 180 / p.depth));

        // Styling based on element type
        if (p.type === "window") {
          ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 0.9})`;
          size *= 1.4;
        } else if (p.type === "door") {
          ctx.fillStyle = `rgba(129, 140, 248, ${alpha * 0.9})`;
          size *= 1.4;
        } else if (p.type === "desk") {
          ctx.fillStyle = getTempColor(p.temp, alpha * 0.45);
          size *= 0.8;
        } else {
          // Regular wall/floor points get dynamic heatmap coloring
          ctx.fillStyle = getTempColor(p.temp, alpha * 0.7);
        }

        // Draw point
        ctx.beginPath();
        ctx.arc(p.px, p.py, size, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Draw the 4 sensor nodes (conspicuous glowing physical spheres with labels)
      currentRooms.forEach((room) => {
        const coord = getSensorCoords(room.id);
        
        // Project
        const x1 = coord.x * cosY - coord.z * sinY;
        const z1 = coord.x * sinY + coord.z * cosY;
        const y2 = coord.y * cosX - z1 * sinX;
        const z2 = coord.y * sinX + z1 * cosX;
        const zCamera = z2 + 250;
        const scale = (180 * zoom) / zCamera;
        const px = cx + x1 * scale;
        const py = cy + y2 * scale;

        const isFlame = room.flameStatus === "Detected";
        const isHovered = hoveredSensorRef.current?.id === room.id;

        // Draw pulsing outer corona glow if flame detected
        if (isFlame) {
          const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.25;
          const grad = ctx.createRadialGradient(px, py, 2, px, py, scale * 12 * pulse);
          grad.addColorStop(0, "rgba(239, 68, 68, 0.8)");
          grad.addColorStop(0.3, "rgba(249, 115, 22, 0.4)");
          grad.addColorStop(1, "rgba(239, 68, 68, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, scale * 12 * pulse, 0, 2 * Math.PI);
          ctx.fill();
        } else {
          // Subtle ambient glow
          const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.1;
          const colorHex = room.condition === "Warning" ? "245, 158, 11" : "16, 185, 129";
          const grad = ctx.createRadialGradient(px, py, 1, px, py, scale * 6 * pulse);
          grad.addColorStop(0, `rgba(${colorHex}, 0.7)`);
          grad.addColorStop(1, `rgba(${colorHex}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, scale * 6 * pulse, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Draw core sphere
        ctx.fillStyle = isFlame 
          ? "#ef4444" 
          : room.condition === "Warning" 
            ? "#f59e0b" 
            : "#10b981";
        ctx.strokeStyle = isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        
        ctx.beginPath();
        ctx.arc(px, py, scale * 3.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Draw node identifier label
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        
        // Background card behind text for readability
        const textStr = `${room.name.split(" ")[0]} (${room.temperature.toFixed(1)}°C)`;
        const textWidth = ctx.measureText(textStr).width;
        ctx.fillStyle = "rgba(10, 15, 30, 0.85)";
        ctx.strokeStyle = isFlame ? "rgba(239, 68, 68, 0.5)" : "rgba(255,255,255,0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(px - textWidth / 2 - 6, py - scale * 6 - 15, textWidth + 12, 16, 4);
        ctx.fill();
        ctx.stroke();

        // Label text
        ctx.fillStyle = isFlame ? "#f87171" : "#ffffff";
        ctx.fillText(textStr, px, py - scale * 6 - 4);

        // Draw small pointer line from label to node
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py - scale * 3);
        ctx.lineTo(px, py - scale * 6 + 1);
        ctx.stroke();
      });

      // Canvas compass indicator overlay (bottom-left)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1.5;
      const compassX = 40;
      const compassY = height - 40;
      ctx.beginPath();
      ctx.arc(compassX, compassY, 20, 0, 2 * Math.PI);
      ctx.stroke();

      // North needle
      const nX = compassX + Math.sin(yaw) * 16;
      const nY = compassY - Math.cos(yaw) * Math.cos(pitch) * 16;
      ctx.strokeStyle = "#ef4444"; // Red for North
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(compassX, compassY);
      ctx.lineTo(nX, nY);
      ctx.stroke();

      // South needle
      const sX = compassX - Math.sin(yaw) * 16;
      const sY = compassY + Math.cos(yaw) * Math.cos(pitch) * 16;
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(compassX, compassY);
      ctx.lineTo(sX, sY);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("N", nX, nY - 3);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [points]);

  // Handle clicking on the canvas to toggle simulations
  const handleCanvasClick = async () => {
    if (hoveredSensor) {
      const isFlame = hoveredSensor.flameStatus === "Detected";
      if (isFlame) {
        await onClearFlame(hoveredSensor.id);
      } else {
        await onTriggerFlame(hoveredSensor.id);
      }
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col" ref={containerRef}>
      {/* 3D Viewport Controls Overlay */}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 pointer-events-auto">
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800/80 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-lg">
          <Move3d className="h-4 w-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-200">3D Point Cloud</span>
          <span className="text-[10px] font-mono text-indigo-400 bg-slate-950 px-1.5 py-0.5 rounded animate-pulse">
            LIVE 3D VIEWPORT
          </span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-800/80 p-1.5 rounded-xl shadow-lg">
        {/* Toggle Auto Rotation */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-2 rounded-lg transition duration-150 cursor-pointer ${
            autoRotate ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
          }`}
          title="Toggle Auto Rotation"
        >
          <RotateCw className={`h-4 w-4 ${autoRotate ? "animate-spin-slow" : ""}`} />
        </button>

        {/* Zoom In */}
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
          className="p-2 rounded-lg text-slate-400 hover:text-white transition duration-150 cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
          className="p-2 rounded-lg text-slate-400 hover:text-white transition duration-150 cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
      </div>

      {/* Interactive Drag Region */}
      <div className="relative w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onClick={handleCanvasClick}
          className={`block w-full cursor-grab ${isDragging ? "cursor-grabbing" : ""} ${
            hoveredSensor ? "cursor-pointer" : ""
          }`}
        />

        {/* Instruction overlay */}
        <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur border border-slate-800/60 px-3 py-1.5 rounded-xl text-[10px] text-slate-400 flex items-center gap-1.5 select-none font-medium">
          <Compass className="h-3.5 w-3.5 text-slate-400" />
          <span>Left-click & drag to rotate view • Click node label to ignite/extinguish</span>
        </div>

        {/* Heat Legend Overlay */}
        <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur border border-slate-800/60 p-2.5 rounded-xl flex flex-col gap-1.5 select-none font-medium max-w-48">
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wide">3D Heatmap Legend</p>
          <div className="h-2 w-32 rounded bg-gradient-to-r from-blue-500 via-slate-400 via-amber-500 to-red-500 border border-slate-800" />
          <div className="flex justify-between text-[8px] text-slate-500 font-mono">
            <span>≤ 20°C</span>
            <span>26°C</span>
            <span>≥ 38°C</span>
          </div>
        </div>

        {/* Floating details panel for hovered sensor */}
        {hoveredSensor && (
          <div className="absolute top-16 left-4 z-25 bg-slate-900/95 backdrop-blur border border-indigo-500/30 p-3 rounded-xl shadow-xl w-60 pointer-events-none">
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${hoveredSensor.flameStatus === "Detected" ? "bg-red-500 animate-ping" : "bg-emerald-500"}`} />
              {hoveredSensor.name}
            </h4>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                <p className="text-slate-500">Temp</p>
                <p className="font-bold font-mono text-slate-200 mt-0.5">{hoveredSensor.temperature.toFixed(1)}°C</p>
              </div>
              <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                <p className="text-slate-500">Humidity</p>
                <p className="font-bold font-mono text-slate-200 mt-0.5">{hoveredSensor.humidity.toFixed(1)}%</p>
              </div>
            </div>
            <p className="text-[8px] text-indigo-400 mt-2 font-mono text-center">Click label to simulate fire</p>
          </div>
        )}
      </div>
    </div>
  );
}
