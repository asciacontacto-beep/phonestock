"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import styles from "./GuidedTour.module.css";

type TourStep = {
  targetId: string;
  title: string;
  text: string;
  position: "bottom" | "right" | "left" | "top";
};

const steps: TourStep[] = [
  {
    targetId: "tour-sidebar",
    title: "Navegación Principal",
    text: "Desde aquí puedes acceder a todas las áreas de Stackr: Inventario, Ventas, Reparaciones y Configuración.",
    position: "right"
  },
  {
    targetId: "tour-first-item",
    title: "Tu primer paso",
    text: "Te recomendamos comenzar cargando tu stock. Presiona este botón para agregar tu primer equipo al sistema.",
    position: "bottom"
  },
  {
    targetId: "tour-metrics",
    title: "Tus números claros",
    text: "Aquí verás tus ventas, ganancias y capital en tiempo real. ¡Se llenará de vida pronto!",
    position: "bottom"
  },
  {
    targetId: "tour-alerts",
    title: "Alertas Inteligentes",
    text: "El sistema te avisará automáticamente cuando un repuesto se esté agotando para que no pierdas ventas.",
    position: "bottom"
  },
  {
    targetId: "tour-chart",
    title: "Mide tu crecimiento",
    text: "Tus ventas se grafican solas. Ya no tienes que armar excels complejos.",
    position: "right"
  }
];

export default function GuidedTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [isActive, setIsActive] = useState(false);
  const frameRef = useRef<number | null>(null);

  const searchParams = useSearchParams();

  // Handle initialization
  useEffect(() => {
    const isTourRequested = searchParams.get("tour") === "true";
    const hasCompletedTour = localStorage.getItem("stackr_tour_completed") === "true";

    if (isTourRequested || !hasCompletedTour) {
      setTimeout(() => {
        let firstStep = 0;
        while (firstStep < steps.length && !document.getElementById(steps[firstStep].targetId)) {
          firstStep++;
        }
        if (firstStep < steps.length) {
          setIsActive(true);
          setCurrentStep(firstStep);
        } else {
          setIsActive(false);
          localStorage.setItem("stackr_tour_completed", "true");
        }
      }, 500);
    }
  }, [searchParams]);

  // Continuous tracking of target element via requestAnimationFrame
  useEffect(() => {
    if (!isActive) return;

    const trackElement = () => {
      const target = document.getElementById(steps[currentStep].targetId);
      if (target) {
        const newRect = target.getBoundingClientRect();
        // Only update state if values changed significantly to avoid infinite re-renders
        setRect(prev => {
          if (!prev || 
              Math.abs(prev.top - newRect.top) > 1 || 
              Math.abs(prev.left - newRect.left) > 1 ||
              Math.abs(prev.width - newRect.width) > 1 ||
              Math.abs(prev.height - newRect.height) > 1) {
            return newRect;
          }
          return prev;
        });
      }
      frameRef.current = requestAnimationFrame(trackElement);
    };

    frameRef.current = requestAnimationFrame(trackElement);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isActive, currentStep]);

  // Handle smooth scroll when changing steps
  useEffect(() => {
    if (isActive) {
      const target = document.getElementById(steps[currentStep].targetId);
      if (target) {
        // Scroll only if it's not fully visible
        const r = target.getBoundingClientRect();
        const isVisible = r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth;
        if (!isVisible) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [isActive, currentStep]);

  const handleNext = () => {
    let nextStep = currentStep + 1;
    while (nextStep < steps.length && !document.getElementById(steps[nextStep].targetId)) {
      nextStep++;
    }

    if (nextStep < steps.length) {
      setCurrentStep(nextStep);
    } else {
      finishTour();
    }
  };

  const finishTour = () => {
    setIsActive(false);
    localStorage.setItem("stackr_tour_completed", "true");
    if (searchParams.get("tour") === "true") {
      window.history.replaceState({}, '', '/dashboard');
    }
  };

  if (!isActive || !rect) return null;

  const step = steps[currentStep];

  // Tooltip positioning logic
  let tooltipTop = rect.top;
  let tooltipLeft = rect.left;

  // We add window.innerHeight/Width constraints so tooltip never overflows screen
  if (step.position === "bottom") {
    tooltipTop = rect.top + rect.height + 24;
    tooltipLeft = rect.left + rect.width / 2 - 160; 
  } else if (step.position === "right") {
    tooltipTop = rect.top + rect.height / 2 - 50;
    tooltipLeft = rect.left + rect.width + 24;
  } else if (step.position === "left") {
    tooltipTop = rect.top + rect.height / 2 - 50;
    tooltipLeft = rect.left - 340;
  } else if (step.position === "top") {
    tooltipTop = rect.top - 180;
    tooltipLeft = rect.left + rect.width / 2 - 160;
  }

  // Safety clamps for screen edges
  if (typeof window !== 'undefined') {
    tooltipLeft = Math.max(20, Math.min(tooltipLeft, window.innerWidth - 340));
    tooltipTop = Math.max(20, Math.min(tooltipTop, window.innerHeight - 200));
  }

  return (
    <>
      {/* Dimmed Background */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={styles.tourOverlay} 
      />
      
      {/* The glowing spotlight cutout */}
      <motion.div 
        className={styles.tourSpotlight} 
        animate={{
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
      />

      {/* Premium Tooltip Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
          className={styles.tourTooltip}
          style={{ top: tooltipTop, left: tooltipLeft }}
        >
          <div className={styles.tourGlow} />
          <div className={styles.tourContent}>
            <h3 className={styles.tourTitle}>{step.title}</h3>
            <p className={styles.tourText}>{step.text}</p>
            <div className={styles.tourFooter}>
              <span className={styles.tourStep}>{currentStep + 1} de {steps.length}</span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button onClick={finishTour} className={styles.tourSkipBtn}>
                  Saltar
                </button>
                <button className={styles.tourBtn} onClick={handleNext}>
                  {currentStep === steps.length - 1 ? "Entendido" : "Siguiente"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
