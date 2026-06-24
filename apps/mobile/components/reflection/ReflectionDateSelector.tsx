import { useMemo } from "react";
import { DateSelector } from "@/components/ui/DateSelector";
import { toLocalDateString } from "@/lib/db";

type ReflectionDateSelectorProps = {
  /** Selected reflection date as YYYY-MM-DD. */
  value: string;
  /** Called with the newly selected date (never a future date). */
  onChange: (dateString: string) => void;
  /** Optional label shown above the control. Defaults to "Reflection date". */
  label?: string;
};

/**
 * Calm date picker for new reflections. Defaults to today and allows today or
 * any past day (future days disabled via maxDate). Thin wrapper over the shared
 * DateSelector so reflections always have a required, non-future date.
 */
export function ReflectionDateSelector({
  value,
  onChange,
  label = "Reflection date",
}: ReflectionDateSelectorProps) {
  const todayDate = useMemo(() => toLocalDateString(new Date()), []);

  return (
    <DateSelector
      label={label}
      value={value}
      maxDate={todayDate}
      hint="You can choose today or a past day."
      onChange={(next) => {
        // Reflections always keep a date; the calendar never returns null here.
        if (next) {
          onChange(next);
        }
      }}
    />
  );
}
