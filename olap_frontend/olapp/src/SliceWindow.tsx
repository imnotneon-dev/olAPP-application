import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SliceRow = {
  year: number;
  month: number;
  month_name: string;
  payment_name: string;
  total_revenue: number | string;
  average_fare: number | string | null;
  average_tip_percentage: number | string | null;
};

const paymentOptions = [
  "Flex Fare trip",
  "Credit card",
  "Cash",
  "No charge",
  "Dispute",
  "Unknown",
  "Voided trip",
];

function SliceWindow() {
  const [paymentOption, setPaymentOption] = useState("");
  const [rows, setRows] = useState<SliceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!paymentOption) return;

    const controller = new AbortController();

    async function load() {
      try {
        const params = new URLSearchParams({
          payment_option: paymentOption,
        });
        const response = await fetch(`/api/slice?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Could not load monthly payment data (${response.status})`,
          );
        }

        const result: { data: SliceRow[] } = await response.json();
        if (controller.signal.aborted) return;
        setRows(result.data);
        setLoading(false);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load monthly payment data",
        );
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [paymentOption, reloadKey]);

  function formatCurrency(value: number | string | null) {
    if (value === null) return "N/A";
    const amount = Number(value);
    return Number.isFinite(amount)
      ? amount.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "N/A";
  }

  function formatPercentage(value: number | string | null) {
    if (value === null) return "N/A";
    const percentage = Number(value);
    return Number.isFinite(percentage) ? `${percentage.toFixed(2)}%` : "N/A";
  }

  return (
    <div className="flex flex-col gap-4 items-center">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          {paymentOption || "Select Payment Option"}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Payment Methods</DropdownMenuLabel>
            {paymentOptions.map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() => {
                  setRows([]);
                  setError("");
                  setLoading(true);
                  if (option === paymentOption) {
                    setReloadKey((key) => key + 1);
                  } else {
                    setPaymentOption(option);
                  }
                }}
              >
                {option}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {paymentOption ? (
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle>{paymentOption} — Monthly Summary, 2025</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p role="status">Loading monthly payment data...</p>
            ) : error ? (
              <p role="alert">{error}</p>
            ) : rows.length === 0 ? (
              <p>No trips found for this payment method in 2025.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-right">Average Fare</TableHead>
                    <TableHead className="text-right">
                      Average Tip Percentage
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell>{row.month_name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.total_revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.average_fare)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercentage(row.average_tip_percentage)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <p>Please select a payment option.</p>
      )}
    </div>
  );
}

export default SliceWindow;
