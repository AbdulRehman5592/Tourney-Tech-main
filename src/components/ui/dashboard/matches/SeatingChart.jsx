"use client";

// Auto-generated seating / table chart -- derived directly from already-loaded
// match data (round, tableNumber, teamA/teamB), no separate upload required.
// Rows are tables, columns are rounds, matching how the reference tournament
// charts lay theirs out. The manual seating-picture upload (gallery) stays
// available separately for organizers who prefer that instead.
export default function SeatingChart({ matches = [] }) {
  const withTable = matches.filter((m) => m.tableNumber);
  if (!withTable.length) {
    return (
      <p className="text-sm text-gray-400">
        No table assignments yet -- generate matches to see the seating chart.
      </p>
    );
  }

  const rounds = [...new Set(withTable.map((m) => m.round))].sort((a, b) => a - b);
  const maxTable = Math.max(...withTable.map((m) => m.tableNumber));

  const byRoundTable = new Map();
  withTable.forEach((m) => {
    byRoundTable.set(`${m.round}:${m.tableNumber}`, m);
  });

  const teamLabel = (team) => {
    if (!team) return "TBD";
    return [team.displayId || team.serialNo, team.name].filter(Boolean).join(" ");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Auto-generated from the current bracket/schedule -- print or screenshot
          for the room.
        </p>
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 rounded bg-gray-700 text-white text-sm hover:bg-gray-600"
        >
          Print
        </button>
      </div>
      <div className="overflow-x-auto scrollbar-x">
        <table className="w-full border-collapse text-sm" style={{ width: "max-content" }}>
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="p-2 text-left">Table</th>
              {rounds.map((r) => (
                <th key={r} className="p-2 text-left">
                  Round {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-gray-900 text-gray-200">
            {Array.from({ length: maxTable }, (_, i) => i + 1).map((table) => (
              <tr key={table} className="border-b border-gray-700">
                <td className="p-2 font-semibold">{table}</td>
                {rounds.map((r) => {
                  const m = byRoundTable.get(`${r}:${table}`);
                  return (
                    <td key={r} className="p-2">
                      {m ? (
                        <span>
                          {teamLabel(m.teamA)}{" "}
                          <span className="text-gray-500">vs</span> {teamLabel(m.teamB)}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
