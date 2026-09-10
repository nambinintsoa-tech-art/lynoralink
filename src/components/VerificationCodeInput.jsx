"use client";

import { useEffect, useRef } from "react";

export default function VerificationCodeInput({
  value = "",
  onChange,
  label = "Code de vérification",
  helperText = "",
  disabled = false,
  autoFocus = false,
}) {
  const inputRefs = useRef([]);

  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");

  useEffect(() => {
    if (autoFocus) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  const updateValue = (nextDigits) => {
    const cleanValue = nextDigits.join("").replace(/\D/g, "").slice(0, 6);
    onChange?.(cleanValue);
  };

  const handleChange = (index, event) => {
    const nextChar = event.target.value.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = nextChar;
    updateValue(nextDigits);

    if (nextChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    updateValue(Array.from({ length: 6 }, (_, index) => pasted[index] ?? ""));
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-xs font-semibold text-navy900">{label}</label>
      )}
      {helperText && <p className="text-xs text-muted">{helperText}</p>}
      <div className="flex items-center justify-between gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <input
            key={index}
            ref={(node) => {
              inputRefs.current[index] = node;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={1}
            value={digits[index]}
            disabled={disabled}
            onChange={(event) => handleChange(index, event)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            aria-label={`${label} - chiffre ${index + 1}`}
            className="h-12 w-11 rounded-xl border border-navy100 bg-white text-center text-lg font-bold tracking-wide text-[#132433] outline-none transition-all focus:border-navy700 focus:ring-2 focus:ring-navy700 focus:ring-opacity-20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        ))}
      </div>
    </div>
  );
}
