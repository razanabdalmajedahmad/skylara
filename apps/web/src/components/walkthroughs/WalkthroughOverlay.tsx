'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWalkthrough } from '@/hooks/useWalkthrough';

interface WalkthroughStep {
  title: string;
  description: string;
  targetSelector: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface WalkthroughDefinition {
  id: string;
  title: string;
  steps: WalkthroughStep[];
}

export function WalkthroughOverlay() {
  const { isActive, currentStep, nextStep, prevStep, skipTour, currentTour } = useWalkthrough();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const tour = currentTour;
  const step =
    tour && currentStep >= 0 && currentStep < tour.steps.length ? tour.steps[currentStep] : null;
  const overlayActive = Boolean(isActive && step);

  // Update target element measurements
  useEffect(() => {
    if (!overlayActive || !step) return;
    const targetSelector = step.targetSelector;
    const updateTarget = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    updateTarget();
    window.addEventListener('resize', updateTarget);
    return () => window.removeEventListener('resize', updateTarget);
  }, [overlayActive, step]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!overlayActive) return;
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextStep();
      if (e.key === 'ArrowLeft') prevStep();
      if (e.key === 'Escape') skipTour();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [overlayActive, nextStep, prevStep, skipTour]);

  if (!overlayActive || !step || !tour) {
    return null;
  }

  const position = step.position || 'bottom';

  if (!targetRect) return null;

  // Calculate tooltip position
  const tooltip = {
    top: 0,
    left: 0,
  };

  const spacing = 20;

  switch (position) {
    case 'top':
      tooltip.top = targetRect.top - 200 - spacing;
      tooltip.left = targetRect.left + targetRect.width / 2 - 150;
      break;
    case 'bottom':
      tooltip.top = targetRect.bottom + spacing;
      tooltip.left = targetRect.left + targetRect.width / 2 - 150;
      break;
    case 'left':
      tooltip.top = targetRect.top + targetRect.height / 2 - 100;
      tooltip.left = targetRect.left - 320 - spacing;
      break;
    case 'right':
      tooltip.top = targetRect.top + targetRect.height / 2 - 100;
      tooltip.left = targetRect.right + spacing;
      break;
  }

  const spotlightPadding = 8;

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 bg-black bg-opacity-60 animate-in fade-in duration-300"
        onClick={skipTour}
      >
        {/* Spotlight cutout */}
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - spotlightPadding}
                y={targetRect.top - spotlightPadding}
                width={targetRect.width + spotlightPadding * 2}
                height={targetRect.height + spotlightPadding * 2}
                fill="black"
                rx="4"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="black" mask="url(#spotlight-mask)" opacity="0.6" />
        </svg>
      </div>

      {/* Tooltip */}
      <div
        className="fixed bg-white rounded-lg shadow-2xl z-50 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{
          top: `${tooltip.top}px`,
          left: `${tooltip.left}px`,
          width: '300px',
        }}
      >
        {/* Close button */}
        <button
          onClick={skipTour}
          className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Skip tour"
        >
          <X size={18} className="text-gray-500" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1B4F72] to-[#2E86C1] text-white p-4 rounded-t-lg">
          <h3 className="font-bold text-lg">{step.title}</h3>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 text-sm mb-4">{step.description}</p>

          {/* Step counter */}
          <p className="text-xs text-gray-500 mb-4">
            Step {currentStep + 1} of {tour.steps.length}
          </p>

          {/* Progress dots */}
          <div className="flex gap-1 mb-4">
            {tour.steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  idx <= currentStep ? 'bg-[#2E86C1]' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-1 flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            {currentStep === tour.steps.length - 1 ? (
              <button
                onClick={skipTour}
                className="flex-1 px-3 py-2 bg-[#27AE60] text-white rounded hover:bg-[#229954] transition-colors text-sm font-medium"
              >
                Done
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="flex items-center gap-1 flex-1 px-3 py-2 bg-[#2E86C1] text-white rounded hover:bg-[#1B4F72] transition-colors text-sm font-medium"
              >
                Next
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {/* Help link */}
          <button
            onClick={() => window.open('/dashboard/documentation', '_blank')}
            className="w-full mt-3 text-xs text-[#2E86C1] hover:text-[#1B4F72] font-medium text-center"
          >
            Open Help Article
          </button>
        </div>
      </div>
    </>
  );
}
