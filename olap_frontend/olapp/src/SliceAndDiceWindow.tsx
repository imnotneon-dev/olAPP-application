import { useEffect, useState } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const boroughs = [
  "Bronx",
  "Brooklyn",
  "EWR",
  "Manhattan",
  "Queens",
  "Staten Island",
  "Unknown",
];

const paymentOptions = [
  "Flex Fare trip",
  "Credit card",
  "Cash",
  "No charge",
  "Dispute",
  "Unknown",
  "Voided trip",
];

type SliceAndDiceRow = {
  distance_tier: "Short" | "Medium" | "Long";
  total_trips: number;
  average_fare: number | string | null;
  tipping_percentage: number | string | null;
  total_surcharges: number | string | null;
};

function formatNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatCurrency(value: number | string | null) {
  const number = formatNumber(value);
  return number === null
    ? "N/A"
    : number.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

function formatPercentage(value: number | string | null) {
  const number = formatNumber(value);
  return number === null ? "N/A" : `${number.toFixed(2)}%`;
}

function SliceAndDiceWindow() {
  const [borough, setBorough] = useState("");
  const [paymentOption, setPaymentOption] = useState("");
  const [rows, setRows] = useState<SliceAndDiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!borough || !paymentOption) return;

    const controller = new AbortController();

    async function loadSummary() {
      try {
        const params = new URLSearchParams({
          pickup_borough: borough,
          payment_option: paymentOption,
        });
        const response = await fetch(`/api/slice_and_dice?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Could not load slice-and-dice data (${response.status})`,
          );
        }

        const result: { data: SliceAndDiceRow[] } = await response.json();
        if (controller.signal.aborted) return;
        setRows(result.data);
        setLoading(false);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load slice-and-dice data",
        );
        setLoading(false);
      }
    }

    void loadSummary();
    return () => controller.abort();
  }, [borough, paymentOption]);

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="flex flex-row gap-2">
        <Combobox
          items={boroughs}
          value={borough || null}
          onValueChange={(value) => {
            setBorough(value ?? "");
            setRows([]);
            setError("");
            setLoading(Boolean(value && paymentOption));
          }}
        >
          <ComboboxInput placeholder="Select Pickup Borough" />
          <ComboboxContent>
            <ComboboxEmpty>No items found.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        <Combobox
          items={paymentOptions}
          value={paymentOption || null}
          onValueChange={(value) => {
            setPaymentOption(value ?? "");
            setRows([]);
            setError("");
            setLoading(Boolean(value && borough));
          }}
        >
          <ComboboxInput placeholder="Select Payment Option" />
          <ComboboxContent>
            <ComboboxEmpty>No items found.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
      {borough && paymentOption ? (
        <Card className="w-full max-w-5xl">
          <CardHeader>
            <CardTitle>
              {borough} — {paymentOption} — 2025
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p role="status">Loading trip summary...</p>
            ) : error ? (
              <p role="alert">{error}</p>
            ) : rows.length === 0 ? (
              <p>No trips found for this borough and payment method in 2025.</p>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  Short: under 3 mi; Medium: 3 to under 10 mi; Long: 10 mi or
                  more.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trip Distance</TableHead>
                      <TableHead className="text-right">Total Trips</TableHead>
                      <TableHead className="text-right">Average Fare</TableHead>
                      <TableHead className="text-right">
                        Tipping Percentage
                      </TableHead>
                      <TableHead className="text-right">
                        Total Surcharges
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.distance_tier}>
                        <TableCell>{row.distance_tier}</TableCell>
                        <TableCell className="text-right">
                          {row.total_trips.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.average_fare)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPercentage(row.tipping_percentage)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.total_surcharges)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <p>Select a pickup borough and a payment method</p>
      )}
    </div>
  );
}

export default SliceAndDiceWindow;
