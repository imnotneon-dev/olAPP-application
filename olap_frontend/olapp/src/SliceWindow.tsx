import { useEffect, useMemo, useState } from "react";
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

const revenueChartConfig = {
  total_revenue: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig;

const fareChartConfig = {
  average_fare: { label: "Average fare", color: "var(--chart-2)" },
} satisfies ChartConfig;

const tipChartConfig = {
  average_tip_percentage: {
    label: "Average tip percentage",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

function SliceWindow() {
  const [paymentOption, setPaymentOption] = useState("");
  const [rows, setRows] = useState<SliceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const chartRows = useMemo(
    () =>
      rows
        .map((row) => ({
          ...row,
          month_label: new Date(2025, row.month - 1, 1).toLocaleString(
            "en-US",
            { month: "short" },
          ),
          total_revenue: Number(row.total_revenue),
          average_fare:
            row.average_fare === null ? null : Number(row.average_fare),
          average_tip_percentage:
            row.average_tip_percentage === null
              ? null
              : Number(row.average_tip_percentage),
        }))
        .sort((a, b) => a.month - b.month),
    [rows],
  );

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
        <Card className="w-full max-w-7xl">
          <CardHeader>
            <CardTitle>{paymentOption} — Monthly Summary, 2025</CardTitle>
          </CardHeader>
          <CardContent className="gap-6">
            {loading ? (
              <p role="status">Loading monthly payment data...</p>
            ) : error ? (
              <p role="alert">{error}</p>
            ) : rows.length === 0 ? (
              <p>No trips found for this payment method in 2025.</p>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <section className="min-w-0 rounded-lg border p-4">
                    <h3 className="mb-3 font-medium">Monthly Revenue</h3>
                    <ChartContainer
                      config={revenueChartConfig}
                      className="h-72 w-full"
                    >
                      <BarChart
                        accessibilityLayer
                        data={chartRows}
                        margin={{ top: 12, right: 12, bottom: 8, left: 8 }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="month_label"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          interval={0}
                          height={28}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={72}
                          tick={{ fontSize: 11 }}
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
                          dataKey="total_revenue"
                          fill="var(--color-total_revenue)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </section>

                  <section className="min-w-0 rounded-lg border p-4">
                    <h3 className="mb-3 font-medium">Monthly Average Fare</h3>
                    <ChartContainer
                      config={fareChartConfig}
                      className="h-72 w-full"
                    >
                      <LineChart
                        accessibilityLayer
                        data={chartRows}
                        margin={{ top: 12, right: 12, bottom: 8, left: 8 }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="month_label"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          interval={0}
                          height={28}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={65}
                          tick={{ fontSize: 11 }}
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
                    <h3 className="mb-3 font-medium">Monthly Average Tip %</h3>
                    <ChartContainer
                      config={tipChartConfig}
                      className="h-72 w-full"
                    >
                      <LineChart
                        accessibilityLayer
                        data={chartRows}
                        margin={{ top: 12, right: 12, bottom: 8, left: 8 }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="month_label"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          interval={0}
                          height={28}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={55}
                          tick={{ fontSize: 11 }}
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
                          dataKey="average_tip_percentage"
                          type="monotone"
                          stroke="var(--color-average_tip_percentage)"
                          strokeWidth={2}
                          dot
                          connectNulls={false}
                        />
                      </LineChart>
                    </ChartContainer>
                  </section>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">
                        Total Revenue
                      </TableHead>
                      <TableHead className="text-right">Average Fare</TableHead>
                      <TableHead className="text-right">
                        Average Tip Percentage
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chartRows.map((row) => (
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
              </>
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
