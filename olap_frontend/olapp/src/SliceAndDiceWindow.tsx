import { useEffect, useMemo, useState } from "react";

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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

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

const tripsChartConfig = {
  total_trips: { label: "Total trips", color: "var(--chart-1)" },
} satisfies ChartConfig;

const fareChartConfig = {
  average_fare: { label: "Average fare", color: "var(--chart-2)" },
} satisfies ChartConfig;

const tippingChartConfig = {
  tipping_percentage: {
    label: "Tipping percentage",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const surchargesChartConfig = {
  total_surcharges: { label: "Total surcharges", color: "var(--chart-4)" },
} satisfies ChartConfig;

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
  const [reloadKey, setReloadKey] = useState(0);
  const chartRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        average_fare:
          row.average_fare === null ? null : Number(row.average_fare),
        tipping_percentage:
          row.tipping_percentage === null
            ? null
            : Number(row.tipping_percentage),
        total_surcharges:
          row.total_surcharges === null ? null : Number(row.total_surcharges),
      })),
    [rows],
  );

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
  }, [borough, paymentOption, reloadKey]);

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="flex flex-row gap-2">
        <Combobox
          items={boroughs}
          value={borough || null}
          onValueChange={(value) => {
            const nextBorough = value ?? "";
            setRows([]);
            setError("");
            setLoading(Boolean(nextBorough && paymentOption));
            if (nextBorough === borough) {
              if (nextBorough && paymentOption) {
                setReloadKey((key) => key + 1);
              }
            } else {
              setBorough(nextBorough);
            }
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
            const nextPaymentOption = value ?? "";
            setRows([]);
            setError("");
            setLoading(Boolean(nextPaymentOption && borough));
            if (nextPaymentOption === paymentOption) {
              if (nextPaymentOption && borough) {
                setReloadKey((key) => key + 1);
              }
            } else {
              setPaymentOption(nextPaymentOption);
            }
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
        <Card className="w-full max-w-6xl">
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
                <div className="mb-6 grid gap-4 md:grid-cols-2">
                  <section className="min-w-0 rounded-lg border p-4">
                    <h3 className="mb-3 font-medium">Total Trips</h3>
                    <ChartContainer
                      config={tripsChartConfig}
                      className="h-64 w-full"
                    >
                      <BarChart
                        accessibilityLayer
                        data={chartRows}
                        margin={{ top: 12, right: 12, bottom: 8, left: 8 }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="distance_tier"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={65}
                          tickFormatter={(value: number) =>
                            Number(value).toLocaleString()
                          }
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent />}
                        />
                        <Bar
                          dataKey="total_trips"
                          fill="var(--color-total_trips)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </section>

                  <section className="min-w-0 rounded-lg border p-4">
                    <h3 className="mb-3 font-medium">Average Fare</h3>
                    <ChartContainer
                      config={fareChartConfig}
                      className="h-64 w-full"
                    >
                      <LineChart
                        accessibilityLayer
                        data={chartRows}
                        margin={{ top: 12, right: 12, bottom: 8, left: 8 }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="distance_tier"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={65}
                          tickFormatter={(value: number) => `$${value}`}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              formatter={(value) =>
                                formatCurrency(Number(value))
                              }
                            />
                          }
                        />
                        <Line
                          dataKey="average_fare"
                          type="monotone"
                          stroke="var(--color-average_fare)"
                          strokeWidth={2}
                          dot
                          connectNulls={false}
                        />
                      </LineChart>
                    </ChartContainer>
                  </section>

                  <section className="min-w-0 rounded-lg border p-4">
                    <h3 className="mb-3 font-medium">Tipping Percentage</h3>
                    <ChartContainer
                      config={tippingChartConfig}
                      className="h-64 w-full"
                    >
                      <LineChart
                        accessibilityLayer
                        data={chartRows}
                        margin={{ top: 12, right: 12, bottom: 8, left: 8 }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="distance_tier"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={55}
                          tickFormatter={(value: number) => `${value}%`}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              formatter={(value) =>
                                formatPercentage(Number(value))
                              }
                            />
                          }
                        />
                        <Line
                          dataKey="tipping_percentage"
                          type="monotone"
                          stroke="var(--color-tipping_percentage)"
                          strokeWidth={2}
                          dot
                          connectNulls={false}
                        />
                      </LineChart>
                    </ChartContainer>
                  </section>

                  <section className="min-w-0 rounded-lg border p-4">
                    <h3 className="mb-3 font-medium">Total Surcharges</h3>
                    <ChartContainer
                      config={surchargesChartConfig}
                      className="h-64 w-full"
                    >
                      <BarChart
                        accessibilityLayer
                        data={chartRows}
                        margin={{ top: 12, right: 12, bottom: 8, left: 8 }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="distance_tier"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={75}
                          tickFormatter={(value: number) =>
                            `$${Intl.NumberFormat("en", {
                              notation: "compact",
                              maximumFractionDigits: 1,
                            }).format(value)}`
                          }
                        />
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              formatter={(value) =>
                                formatCurrency(Number(value))
                              }
                            />
                          }
                        />
                        <Bar
                          dataKey="total_surcharges"
                          fill="var(--color-total_surcharges)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </section>
                </div>
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
                    {chartRows.map((row) => (
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
