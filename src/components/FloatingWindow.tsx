import React, { useState, useRef, useEffect } from "react";
import { 
  Minus, 
  Square, 
  X, 
  ExternalLink,
  Minimize2,
  PanelLeftClose,
  PanelRightClose
} from "lucide-react";
import { AppWindowState } from "../types";

interface FloatingWindowProps {
  windowState: AppWindowState;
  isActive: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximizeToggle: () => void;
  onSnapLeft?: () => void;
  onSnapRight?: () => void;
  onOpenAsTab?: () => void;
  onUpdatePositionSize: (
    pos: { x: number; y: number },
    size: { width: number; height: number }
  ) => void;
  children: React.ReactNode;
  iconComponent?: React.ReactNode;
}

export const FloatingWindow: React.FC<FloatingWindowProps> = React.memo(({
  windowState,
  isActive,
  onFocus,
  onClose,
  onMinimize,
  onMaximizeToggle,
  onSnapLeft,
  onSnapRight,
  onOpenAsTab,
  onUpdatePositionSize,
  children,
  iconComponent,
}) => {
  const windowRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const currentPosRef = useRef({ x: windowState.position.x, y: windowState.position.y });
  const currentSizeRef = useRef({ width: windowState.size.width, height: windowState.size.height });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });
  const rafIdRef = useRef<number | null>(null);

  // Sync refs when props update
  useEffect(() => {
    currentPosRef.current = { x: windowState.position.x, y: windowState.position.y };
    currentSizeRef.current = { width: windowState.size.width, height: windowState.size.height };
  }, [windowState.position.x, windowState.position.y, windowState.size.width, windowState.size.height]);

  // Handle pointer down on title bar for Dragging
  const handleTitlePointerDown = (e: React.PointerEvent) => {
    if (windowState.isMaximized) return;
    onFocus();
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - currentPosRef.current.x,
      y: e.clientY - currentPosRef.current.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleTitlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || windowState.isMaximized) return;

    const maxX = Math.max(10, window.innerWidth - 100);
    const maxY = Math.max(10, window.innerHeight - 80);
    const newX = Math.max(0, Math.min(maxX, e.clientX - dragOffsetRef.current.x));
    const newY = Math.max(0, Math.min(maxY, e.clientY - dragOffsetRef.current.y));

    currentPosRef.current = { x: newX, y: newY };

    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (windowRef.current) {
          windowRef.current.style.transform = `translate3d(${currentPosRef.current.x}px, ${currentPosRef.current.y}px, 0)`;
        }
        rafIdRef.current = null;
      });
    }
  };

  const handleTitlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      onUpdatePositionSize(currentPosRef.current, currentSizeRef.current);
    }
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Handle pointer down on resize corner
  const handleResizePointerDown = (e: React.PointerEvent) => {
    if (windowState.isMaximized) return;
    e.stopPropagation();
    onFocus();
    isResizingRef.current = true;
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: currentSizeRef.current.width,
      startH: currentSizeRef.current.height,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!isResizingRef.current || windowState.isMaximized) return;
    e.stopPropagation();

    const deltaX = e.clientX - resizeStartRef.current.startX;
    const deltaY = e.clientY - resizeStartRef.current.startY;

    const newW = Math.max(windowState.minSize.width, Math.min(window.innerWidth - currentPosRef.current.x - 20, resizeStartRef.current.startW + deltaX));
    const newH = Math.max(windowState.minSize.height, Math.min(window.innerHeight - currentPosRef.current.y - 40, resizeStartRef.current.startH + deltaY));

    currentSizeRef.current = { width: newW, height: newH };

    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (windowRef.current) {
          windowRef.current.style.width = `${currentSizeRef.current.width}px`;
          windowRef.current.style.height = `${currentSizeRef.current.height}px`;
        }
        rafIdRef.current = null;
      });
    }
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (isResizingRef.current) {
      isResizingRef.current = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      onUpdatePositionSize(currentPosRef.current, currentSizeRef.current);
    }
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  if (!windowState.isOpen || windowState.isMinimized) {
    return null;
  }

  const isMax = windowState.isMaximized;

  return (
    <div
      ref={windowRef}
      id={`window-${windowState.id}`}
      onPointerDown={onFocus}
      style={
        isMax
          ? {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              zIndex: windowState.zIndex + 100,
            }
          : {
              position: "absolute",
              transform: `translate3d(${windowState.position.x}px, ${windowState.position.y}px, 0)`,
              width: `${windowState.size.width}px`,
              height: `${windowState.size.height}px`,
              zIndex: windowState.zIndex,
            }
      }
      className={`rounded-2xl flex flex-col shadow-2xl transition-shadow duration-150 overflow-hidden border ${
        isActive
          ? "border-amber-500/80 shadow-amber-950/40 ring-1 ring-amber-500/50 bg-slate-900"
          : "border-slate-800 shadow-slate-950/80 bg-slate-900/95"
      }`}
    >
      {/* Window Header */}
      <div
        onPointerDown={handleTitlePointerDown}
        onPointerMove={handleTitlePointerMove}
        onPointerUp={handleTitlePointerUp}
        onDoubleClick={onMaximizeToggle}
        style={{ touchAction: "none" }}
        className={`px-3 sm:px-4 py-2.5 flex items-center justify-between select-none cursor-grab active:cursor-grabbing border-b transition-colors ${
          isActive
            ? "bg-gradient-to-r from-slate-900 via-slate-850 to-amber-950/30 border-slate-700/80"
            : "bg-slate-950/90 border-slate-800 hover:bg-slate-900"
        }`}
      >
        {/* Title and Icon */}
        <div className="flex items-center gap-2 overflow-hidden pointer-events-none min-w-0 pr-1">
          {iconComponent}
          <span className="text-xs sm:text-sm font-bold text-white truncate tracking-wide">
            {windowState.title}
          </span>
          {isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 hidden sm:inline-block animate-pulse" />
          )}
        </div>

        {/* Window Control Buttons */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Snap Half Left / Right buttons */}
          {onSnapLeft && !isMax && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSnapLeft();
              }}
              title="Прикрепить к левой половине (50%)"
              className="hidden sm:flex p-1.5 text-slate-400 hover:text-amber-300 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          )}

          {onSnapRight && !isMax && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSnapRight();
              }}
              title="Прикрепить к правой половине (50%)"
              className="hidden sm:flex p-1.5 text-slate-400 hover:text-amber-300 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenAsTab && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenAsTab();
              }}
              title="Развернуть во весь экран (Вкладка)"
              className="p-1.5 text-slate-400 hover:text-amber-300 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            title="Свернуть в панель задач"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onMaximizeToggle();
            }}
            title={isMax ? "Восстановить размер" : "Развернуть на весь экран"}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            {isMax ? <Minimize2 className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Закрыть окно"
            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-950/40 hover:border-red-500/20 transition-colors ml-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Window Body Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 bg-slate-950/60 custom-scrollbar">
        {children}
      </div>

      {/* Resize Handle (Bottom Right) */}
      {!isMax && (
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          style={{ touchAction: "none" }}
          title="Потяните для изменения размера"
          className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1.5 z-30 group"
        >
          <div className="w-3 h-3 border-r-2 border-b-2 border-slate-500 group-hover:border-amber-400 transition-colors rounded-br-sm" />
        </div>
      )}
    </div>
  );
});
