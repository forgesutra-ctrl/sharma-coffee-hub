import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "lucide-react";
import { format, addDays } from "date-fns";

interface DeliveryDatePickerProps {
  selectedDate: number;
  onDateChange: (day: number) => void;
  minDate?: Date;
}

const DeliveryDatePicker = ({
  selectedDate,
  onDateChange,
  minDate = addDays(new Date(), 3),
}: DeliveryDatePickerProps) => {
  const generateDateOptions = () => {
    const options: { day: number; label: string; disabled: boolean }[] = [];

    for (let day = 1; day <= 28; day++) {
      const label = `${day}${getOrdinalSuffix(day)} of every month`;
      const nextDelivery = calculateNextDelivery(day, minDate);

      // All days 1-28 are always selectable for subscriptions.
      // The user picks a recurring monthly preference (e.g. "15th of every month").
      // The first delivery is calculated by calculateNextDelivery - it will be
      // this month if the date hasn't passed, or next month. No need to disable.
      options.push({
        day,
        label: `${label} • Order placed: ${format(nextDelivery, "MMM dd, yyyy")}`,
        disabled: false,
      });
    }

    return options;
  };

  const calculateNextDelivery = (day: number, fromDate: Date): Date => {
    const currentMonthDelivery = new Date(
      fromDate.getFullYear(),
      fromDate.getMonth(),
      day
    );

    if (currentMonthDelivery >= fromDate) {
      return currentMonthDelivery;
    }

    return new Date(
      fromDate.getFullYear(),
      fromDate.getMonth() + 1,
      day
    );
  };

  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  const popularDates = [1, 5, 10, 15, 20, 25];
  const dateOptions = generateDateOptions();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Calendar className="w-4 h-4" />
        <Label className="text-primary">Select Your Preferred Monthly Order Date</Label>
      </div>

      <div className="bg-muted/50 border border-primary/20 rounded-lg p-3 text-sm">
        <p className="text-foreground/80">
          Choose a date between the 1st and 28th of each month. Your order will be
          placed on this date every month. Actual delivery dates may vary based on
          shipping logistics. We recommend choosing dates between 1-28 for consistent
          monthly order placement.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Popular Choices:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {popularDates.map((day) => {
            const option = dateOptions.find((opt) => opt.day === day);
            const nextDelivery = calculateNextDelivery(day, minDate);

            return (
              <button
                key={day}
                type="button"
                onClick={() => !option?.disabled && onDateChange(day)}
                disabled={option?.disabled}
                className={`
                  p-3 rounded-lg border-2 text-left transition-all
                  ${
                    selectedDate === day
                      ? "border-primary bg-primary/10 shadow-sm text-primary"
                      : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                  }
                  ${option?.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <div className="font-semibold text-base">
                  {day}
                  {getOrdinalSuffix(day)}
                </div>
                <div className={`text-xs mt-1 ${
                  selectedDate === day ? "text-primary/80" : "text-muted-foreground"
                }`}>
                  {format(nextDelivery, "MMM dd")}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Or choose any date:</p>
        <RadioGroup
          value={selectedDate.toString()}
          onValueChange={(value) => onDateChange(parseInt(value))}
          className="grid grid-cols-4 sm:grid-cols-7 gap-2"
        >
          {dateOptions.map(({ day, disabled }) => (
            <div key={day} className="relative">
              <RadioGroupItem
                value={day.toString()}
                id={`date-${day}`}
                disabled={disabled}
                className="peer sr-only"
              />
              <Label
                htmlFor={`date-${day}`}
                className={`
                  flex items-center justify-center h-10 rounded-md border-2 text-sm font-medium
                  cursor-pointer transition-all bg-card
                  peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10
                  peer-data-[state=checked]:shadow-sm peer-data-[state=checked]:text-primary
                  ${
                    disabled
                      ? "opacity-40 cursor-not-allowed bg-muted/30"
                      : "hover:border-primary/50 hover:bg-muted/50"
                  }
                `}
              >
                {day}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {selectedDate && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
          <p className="text-sm font-medium text-primary">
            Your next order will be placed on {format(calculateNextDelivery(selectedDate, minDate), "MMMM dd, yyyy")}
          </p>
          <p className="text-xs text-foreground/70 mt-1">
            Your order will be placed on the {selectedDate}
            {getOrdinalSuffix(selectedDate)} of every month. Actual delivery dates may
            vary based on shipping. You can change this anytime from your account settings.
          </p>
        </div>
      )}
    </div>
  );
};

export default DeliveryDatePicker;
