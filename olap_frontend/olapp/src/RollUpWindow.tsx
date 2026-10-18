import { useState, useEffect, useMemo } from "react";
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
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Pie, PieChart } from "recharts";

type RollupRow = {
  month: number;
  month_name: string;
  pickup_borough: string;
  total_revenue: number;
  total_trip_volume: number;
  average_fare_per_mile: number | null;
};

function RollUpWindow() {
  const [quarter, setQuarter] = useState(0);
  const [data, setData] = useState<RollupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { boroughRevenue, chartConfig } = useMemo(() => {
    const revenueByBorough = new Map<string, number>();
    for (const row of data) {
      revenueByBorough.set(
        row.pickup_borough,
        (revenueByBorough.get(row.pickup_borough) ?? 0) + row.total_revenue,
      );
    }

    const boroughRevenue = [...revenueByBorough.entries()]
      .sort(([boroughA], [boroughB]) => boroughA.localeCompare(boroughB))
      .map(([borough, revenue], index) => ({
        borough,
        revenue,
        chartKey: `borough${index + 1}`,
        fill: `var(--color-borough${index + 1})`,
      }));

    const chartConfig: ChartConfig = Object.fromEntries(
      boroughRevenue.map((item, index) => [
        item.chartKey,
        {
          label: item.borough,
          color: `var(--chart-${(index % 5) + 1})`,
        },
      ]),
    );

    return { boroughRevenue, chartConfig };
  }, [data]);

  useEffect(() => {
    if (quarter === 0) return;

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        setError("");
        setData([]);
        const response = await fetch(`/api/rollup?quarter=${quarter}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Could not load roll-up data (${response.status})`);
        }

        const result: { data: RollupRow[] } = await response.json();
        if (controller.signal.aborted) return;
        setData(result.data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Could not load roll-up data",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [quarter]);

  return (
    <div className="flex flex-col gap-4 items-center">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          Select Quarter
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Quarters</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setQuarter(1)}>1</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuarter(2)}>2</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuarter(3)}>3</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuarter(4)}>4</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {quarter == 0 ? (
        <p>Please select a quarter</p>
      ) : loading ? (
        <p role="status">Loading roll-up data...</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <Card className="w-200">
          <CardHeader>
            <CardTitle>Quarter {quarter} — 2025</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {boroughRevenue.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">
                  Quarterly Revenue by Borough
                </h3>
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square max-h-72"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          nameKey="chartKey"
                          formatter={(value) =>
                            typeof value === "number"
                              ? `$${value.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : value
                          }
                        />
                      }
                    />
                    <Pie
                      data={boroughRevenue}
                      dataKey="revenue"
                      nameKey="borough"
                      innerRadius={55}
                      strokeWidth={2}
                    />
                    <ChartLegend
                      content={<ChartLegendContent nameKey="chartKey" />}
                    />
                  </PieChart>
                </ChartContainer>
              </div>
            )}
            {data.map((row) => (
              <section
                key={`${row.month}-${row.pickup_borough}`}
                className="border-b pb-3 last:border-b-0"
              >
                <h3 className="font-semibold">
                  {row.month_name} — {row.pickup_borough}
                </h3>
                <p>Total Revenue: ${row.total_revenue.toFixed(2)}</p>
                <p>Total Trip Volume: {row.total_trip_volume}</p>
                <p>
                  Average Fare per Mile:{" "}
                  {row.average_fare_per_mile === null
                    ? "N/A"
                    : `$${row.average_fare_per_mile.toFixed(2)}`}
                </p>
              </section>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RollUpWindow;
