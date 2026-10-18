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

type DrilldownRow = {
  pickup_borough: string;
  pickup_neighborhood: string;
  month: number;
  day_of_week: number;
  day_name: string;
  pickup_hour: number;
  total_trips: number;
  avg_passenger_count: number | null;
  total_tips: number;
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const boroughs = [
  "Bronx",
  "Brooklyn",
  "EWR",
  "Manhattan",
  "Queens",
  "Staten Island",
  "Unknown",
];

function DrilLDownWindow() {
  const [month, setMonth] = useState("");
  const [borough, setBorough] = useState("");
  const [rows, setRows] = useState<DrilldownRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!month || !borough) return;

    const controller = new AbortController();
    const monthNumber = months.indexOf(month) + 1;

    async function load() {
      try {
        const params = new URLSearchParams({
          month: String(monthNumber),
          borough,
        });
        const response = await fetch(`/api/drilldown?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Could not load drill-down data (${response.status})`,
          );
        }

        const result: { data: DrilldownRow[] } = await response.json();
        if (controller.signal.aborted) return;
        setRows(result.data);
        setLoading(false);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Could not load drill-down data",
        );
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [month, borough]);

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="flex flex-row gap-2">
        <Combobox
          items={months}
          value={month || null}
          onValueChange={(value) => {
            setMonth(value ?? "");
            setRows([]);
            setError("");
            setLoading(Boolean(value && borough));
          }}
        >
          <ComboboxInput placeholder="Select month" />
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
          items={boroughs}
          value={borough || null}
          onValueChange={(value) => {
            setBorough(value ?? "");
            setRows([]);
            setError("");
            setLoading(Boolean(value && month));
          }}
        >
          <ComboboxInput placeholder="Select borough" />
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
      {month && borough ? (
        <Card className="w-full max-w-5xl">
          <CardHeader>
            <CardTitle>
              {borough} — {month} 2025
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p role="status">Loading drill-down data...</p>
            ) : error ? (
              <p role="alert">{error}</p>
            ) : rows.length === 0 ? (
              <p>No trips found for this month and borough.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pickup Neighborhood</TableHead>
                    <TableHead>Day of Week</TableHead>
                    <TableHead>Pickup Hour</TableHead>
                    <TableHead className="text-right">Total Trips</TableHead>
                    <TableHead className="text-right">
                      Avg. Passengers
                    </TableHead>
                    <TableHead className="text-right">Total Tips</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={`${row.pickup_neighborhood}-${row.day_of_week}-${row.pickup_hour}`}
                    >
                      <TableCell>{row.pickup_neighborhood}</TableCell>
                      <TableCell>{row.day_name}</TableCell>
                      <TableCell>
                        {String(row.pickup_hour).padStart(2, "0")}:00
                      </TableCell>
                      <TableCell className="text-right">
                        {row.total_trips.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.avg_passenger_count === null
                          ? "N/A"
                          : row.avg_passenger_count.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${row.total_tips.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <p>Please select a month and a borough.</p>
      )}
    </div>
  );
}

export default DrilLDownWindow;
