"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./GuidedTour.module.css";

type TourStep = {
  targetId: string;
  title: string;
  text: string;
  position: "bottom" | "right" | "left" | "top";
};

const steps: TourStep[] = [
  {
    targetId: "tour-metrics",
    title: "Tus números claros",
    text: "Aquí verás tus ventas, ganancias y capital inmovilizado en tiempo real. Cero caos financiero.",
    position: "bottom"
  },
  {
    targetId: "tour-alerts",
    title: "Nunca pierdas una venta",
    text: "El sistema detecta automáticamente cuando un repuesto se está agotando y te avisa aquí para que lo repongas.",
    position: "bottom"
  },
  {
    targetId: "tour-chart",
    title: "Mide tu crecimiento",
    text: "Tus ventas de los últimos días se grafican solas. Ya no tienes que armar excels complejos.",
    position: "right"
  }
];

export default function GuidedTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Check if URL has ?tour=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("tour") === "true") {
      // Delay slightly so elements can render
      setTimeout(() => {
        setIsActive(true);
        updateRect(0);
      }, 500);
    }
  }, []);

  const updateRect = (stepIndex: number) => {
    const target = document.getElementById(steps[stepIndex].targetId);
    if (target) {
      const { top, left, width, height } = target.getBoundingClientRect();
      setRect({ top, left, width, height } as DOMRect);
      // scroll into view
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
      updateRect(currentStep + 1);
    } else {
      finishTour();
    }
  };

  const finishTour = () => {
    setIsActive(false);
    // remove ?tour=true from url
    window.history.replaceState({}, '', '/dashboard');
  };

  // Re-calculate on resize
  useEffect(() => {
    const handleResize = () => {
      if (isActive) updateRect(currentStep);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isActive, currentStep]);

  if (!isActive || !rect) return null;

  const step = steps[currentStep];

  // Calculate tooltip position based on position prop
  let tooltipTop = rect.top;
  let tooltipLeft = rect.left;

  if (step.position === "bottom") {
    tooltipTop = rect.top + rect.height + 24;
    tooltipLeft = rect.left + rect.width / 2 - 160; // center width 320
  } else if (step.position === "right") {
    tooltipTop = rect.top + rect.height / 2 - 50;
    tooltipLeft = rect.left + rect.width + 24;
  }

  return (
    <>
      <div className={styles.tourOverlay} />
      
      {/* The transparent cutout spotlight */}
      <div 
        className={styles.tourSpotlight} 
        style={{
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16
        }}
      />

      {/* The Tooltip Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, type: "spring" }}
          className={styles.tourTooltip}
          style={{ top: tooltipTop, left: tooltipLeft }}
        >
          <h3 className={styles.tourTitle}>{step.title}</h3>
          <p className={styles.tourText}>{step.text}</p>
          <div className={styles.tourFooter}>
            <span className={styles.tourStep}>{currentStep + 1} de {steps.length}</span>
            <button className={styles.tourBtn} onClick={handleNext}>
              {currentStep === steps.length - 1 ? "Entendido" : "Siguiente"}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
