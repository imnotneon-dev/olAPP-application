import { useState, useEffect } from "react";
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
  const [error, setError] = useState("");

  useEffect(() => {
    if (quarter === 0) return;

    const controller = new AbortController();

    async function load() {
      try {
        setError("");
        const response = await fetch(`/api/rollup?quarter=${quarter}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Could not load roll-up data (${response.status})`);
        }

        const result: { data: RollupRow[] } = await response.json();
        setData(result.data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Could not load roll-up data",
        );
      }
    }

    void load();
    return () => controller.abort();
  }, [quarter]);

  return (
    <>
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
        <p>Please select a quarter.</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle>Quarter {quarter}, 2025</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
    </>
  );
}

export default RollUpWindow;
