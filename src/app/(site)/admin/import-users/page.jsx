"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";
import api from "@/utils/axios";
import { GEOGRAPHIC_REGIONS } from "@/constants/regions";
import {
  IMPORT_COLUMNS,
  buildImportRow,
  headerToFieldKey,
  isBlankRow,
  validateImportRow,
  warnUnknownRegion,
} from "@/utils/userImport";

const MAX_ROWS = 2000;

const REQUIRED_KEYS = IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.key);

const STATUS_COLORS = {
  created: "var(--success-color)",
  skipped: "var(--warning-color)",
  failed: "var(--error-color)",
};

export default function ImportUsersPage() {
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState([]); // [{ row, errors, warning }]
  const [unknownHeaders, setUnknownHeaders] = useState([]);
  const [missingColumns, setMissingColumns] = useState([]);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState(null); // { summary, results }
  const [statusFilter, setStatusFilter] = useState("all");

  const validCount = useMemo(
    () => rows.filter((r) => r.errors.length === 0).length,
    [rows]
  );
  const invalidCount = rows.length - validCount;

  const resetPreview = () => {
    setRows([]);
    setUnknownHeaders([]);
    setMissingColumns([]);
    setReport(null);
    setStatusFilter("all");
  };

  // ── Template ─────────────────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const headers = IMPORT_COLUMNS.map((c) => c.key);
    const example = IMPORT_COLUMNS.map((c) => c.example);

    const sheet = XLSX.utils.aoa_to_sheet([headers, example]);
    sheet["!cols"] = headers.map((h) => ({ wch: Math.max(14, h.length + 4) }));

    const notes = [
      ["Column", "Required", "Notes"],
      ...IMPORT_COLUMNS.map((c) => [
        c.key,
        c.required ? "Yes" : "No",
        columnNote(c.key),
      ]),
      [],
      ["Regions", "", "Use one of the names (or the 2-digit code) below"],
      ...GEOGRAPHIC_REGIONS.map((r) => [r.code, r.name, ""]),
    ];
    const notesSheet = XLSX.utils.aoa_to_sheet(notes);
    notesSheet["!cols"] = [{ wch: 16 }, { wch: 24 }, { wch: 70 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Users");
    XLSX.utils.book_append_sheet(workbook, notesSheet, "Instructions");
    XLSX.writeFile(workbook, "user-import-template.xlsx");
  };

  // ── Parse ────────────────────────────────────────────────────────────────
  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetPreview();
    setFileName(file.name);
    setParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!sheet) {
        toast.error("That file has no sheets in it.");
        return;
      }

      // Read as arrays so each record keeps its true spreadsheet row number —
      // error messages then point at the row the admin sees in Excel.
      const matrix = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        blankrows: true,
      });

      const headers = (matrix[0] || []).map((h) => String(h ?? "").trim());
      if (headers.every((h) => !h)) {
        toast.error("The first row must contain column headers.");
        return;
      }

      const mappedKeys = new Set();
      const unknown = [];
      headers.forEach((header) => {
        if (!header) return;
        const key = headerToFieldKey(header);
        if (key) mappedKeys.add(key);
        else unknown.push(header);
      });

      const missing = REQUIRED_KEYS.filter((key) => !mappedKeys.has(key));

      const parsed = [];
      for (let i = 1; i < matrix.length; i++) {
        const cells = matrix[i] || [];
        const raw = {};
        headers.forEach((header, col) => {
          if (header) raw[header] = cells[col] ?? "";
        });

        const row = buildImportRow(raw, i + 1); // header is sheet row 1
        if (isBlankRow(row)) continue;

        parsed.push({
          row,
          errors: validateImportRow(row),
          warning: warnUnknownRegion(row),
        });
      }

      setUnknownHeaders(unknown);
      setMissingColumns(missing);
      setRows(parsed);

      if (parsed.length === 0) {
        toast.error("No data rows found in that sheet.");
      } else if (parsed.length > MAX_ROWS) {
        toast.error(`That file has ${parsed.length} rows. Import at most ${MAX_ROWS} at a time.`);
      } else {
        toast.success(`Read ${parsed.length} row${parsed.length === 1 ? "" : "s"} from ${file.name}`);
      }
    } catch (err) {
      console.error("Failed to read spreadsheet:", err);
      toast.error("Could not read that file. Use .xlsx, .xls or .csv.");
    } finally {
      setParsing(false);
      // Let the same file be picked again after a fix-and-retry.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Import ───────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (rows.length === 0) return;
    if (rows.length > MAX_ROWS) {
      toast.error(`Too many rows. Import at most ${MAX_ROWS} users per file.`);
      return;
    }

    try {
      setImporting(true);
      const res = await api.post("/api/admin/import-users", {
        rows: rows.map((r) => r.row),
      });

      const data = res?.data?.data;
      setReport(data);
      setRows([]);
      toast.success(res?.data?.message || "Import finished");
    } catch (err) {
      console.error("Import failed:", err);
      toast.error(err?.response?.data?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadReport = () => {
    if (!report?.results?.length) return;

    const sheetRows = report.results.map((r) => ({
      "Sheet Row": r.row,
      Name: r.name,
      Email: r.email,
      Status: r.status,
      Nickname: r.username || "",
      Password: r.password || "",
      Details: r.message || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    worksheet["!cols"] = [
      { wch: 10 }, { wch: 24 }, { wch: 30 }, { wch: 10 },
      { wch: 20 }, { wch: 20 }, { wch: 60 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Import Result");
    XLSX.writeFile(
      workbook,
      `user-import-result-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const visibleResults = useMemo(() => {
    if (!report?.results) return [];
    if (statusFilter === "all") return report.results;
    return report.results.filter((r) => r.status === statusFilter);
  }, [report, statusFilter]);

  return (
    <div className="min-h-screen p-2 sm:p-6 bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold">Import Users from Excel</h1>
        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 rounded-lg font-semibold transition hover:scale-[1.02]"
          style={{ backgroundColor: "var(--secondary-color)", color: "var(--foreground)" }}
        >
          Download Template
        </button>
      </div>

      <p className="text-sm opacity-70 mb-6">
        Upload a spreadsheet using the same columns as the signup form. Every row is
        checked before anything is saved, and users that already exist are skipped.
      </p>

      {/* ── Upload ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5 mb-6"
        style={{
          backgroundColor: "var(--card-background)",
          borderColor: "var(--border-color)",
        }}
      >
        <label className="block mb-2 text-sm font-medium">Spreadsheet file</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          disabled={parsing || importing}
          className="block w-full text-sm rounded-md border p-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:cursor-pointer cursor-pointer"
          style={{
            backgroundColor: "var(--secondary-color)",
            borderColor: "var(--border-color)",
            color: "var(--foreground)",
          }}
        />

        <div className="mt-4 text-sm opacity-80 space-y-1">
          <p>
            <strong>Required columns:</strong>{" "}
            {IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.key).join(", ")}
          </p>
          <p>
            <strong>Optional columns:</strong>{" "}
            {IMPORT_COLUMNS.filter((c) => !c.required).map((c) => c.key).join(", ")}
          </p>
          <p>
            Leave <code>password</code> blank and each user gets{" "}
            <code>nickname12345</code> (their nickname followed by 12345). Dates of
            birth are <code>MM/DD</code>. Everyone is imported as a{" "}
            <strong>player</strong>.
          </p>
        </div>

        {fileName && (
          <p className="mt-3 text-sm">
            File: <strong>{fileName}</strong>
            {parsing && <span className="ml-2 opacity-70">reading…</span>}
          </p>
        )}
      </div>

      {/* ── Column problems ────────────────────────────────────────────── */}
      {missingColumns.length > 0 && (
        <Banner color="var(--error-color)">
          Missing required column{missingColumns.length === 1 ? "" : "s"}:{" "}
          <strong>{missingColumns.join(", ")}</strong>. Add{" "}
          {missingColumns.length === 1 ? "it" : "them"} and upload again.
        </Banner>
      )}

      {unknownHeaders.length > 0 && (
        <Banner color="var(--warning-color)">
          Ignored column{unknownHeaders.length === 1 ? "" : "s"}:{" "}
          <strong>{unknownHeaders.join(", ")}</strong>. These don&apos;t match any signup
          field and will not be imported.
        </Banner>
      )}

      {/* ── Preview ────────────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-3">
            <h2 className="text-lg font-semibold">
              Preview — {rows.length} row{rows.length === 1 ? "" : "s"}{" "}
              <span style={{ color: "var(--success-color)" }}>({validCount} ready)</span>
              {invalidCount > 0 && (
                <span style={{ color: "var(--error-color)" }}> ({invalidCount} with errors)</span>
              )}
            </h2>

            <div className="flex gap-2">
              <button
                onClick={resetPreview}
                disabled={importing}
                className="px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                style={{ backgroundColor: "var(--secondary-color)", color: "var(--foreground)" }}
              >
                Clear
              </button>
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0 || missingColumns.length > 0}
                className="px-4 py-2 rounded-lg font-semibold transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                style={{ backgroundColor: "var(--success-color)", color: "white" }}
              >
                {importing ? "Importing…" : `Import ${validCount} User${validCount === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>

          {invalidCount > 0 && (
            <Banner color="var(--error-color)">
              {invalidCount} row{invalidCount === 1 ? "" : "s"} won&apos;t be created until the
              listed problems are fixed. You can still import the {validCount} valid
              row{validCount === 1 ? "" : "s"} now.
            </Banner>
          )}

          <div className="overflow-x-auto scrollbar rounded-lg border border-[var(--border-color)]">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-[var(--secondary-color)]">
                <tr>
                  {["Row", "Name", "Nickname", "Email", "Password", "DOB", "Phone", "Gender", "Region", "State", "City", "Club", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="py-2 px-3 text-left font-semibold border-b border-[var(--border-color)] whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="bg-[var(--card-background)]">
                {rows.map(({ row, errors, warning }) => {
                  const bad = errors.length > 0;
                  return (
                    <tr
                      key={row._row}
                      className="hover:bg-[var(--secondary-hover)] transition-colors align-top"
                    >
                      <td className="py-2 px-3 border-b border-[var(--border-color)]">{row._row}</td>
                      <td className="py-2 px-3 border-b border-[var(--border-color)] whitespace-nowrap">
                        {`${row.firstname} ${row.lastname}`.trim() || "—"}
                      </td>
                      <td className="py-2 px-3 border-b border-[var(--border-color)]">
                        {row.username || <span className="opacity-50">auto</span>}
                      </td>
                      <td className="py-2 px-3 border-b border-[var(--border-color)]">{row.email || "—"}</td>
                      <td className="py-2 px-3 border-b border-[var(--border-color)]">{row.password}</td>
                      <td className="py-2 px-3 border-b border-[var(--border-color)]">{row.dob || "—"}</td>
                      <td className="py-2 px-3 border-b border-[var(--border-color)]">{row.phone || "—"}</td>
                      <td className="py-2 px-3 border-b border-[var(--border-color)]">{row.gender || "—"}</td>
                      <td className="py-2 px-3 border-b border-[var(--border-color)]">{row.region || "—"}</td>
                      <td className="py-2 px-3 border-b border-[var(--border-color)]">{row.stateCode || "—"}</td>
                      <td className="py-2 px-3 border-b border-[var(--border-color)]">{row.city || "—"}</td>
                      <td className="py-2 px-3 border-b border-[var(--border-color)]">{row.club || "—"}</td>
                      <td
                        className="py-2 px-3 border-b border-[var(--border-color)] max-w-xs"
                        style={{ color: bad ? "var(--error-color)" : warning ? "var(--warning-color)" : "var(--success-color)" }}
                      >
                        {bad ? errors.join("; ") : warning || "Ready"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Result ─────────────────────────────────────────────────────── */}
      {report && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-3">
            <h2 className="text-lg font-semibold">Import Result</h2>
            <button
              onClick={handleDownloadReport}
              className="px-4 py-2 rounded-lg font-semibold transition hover:scale-[1.02]"
              style={{ backgroundColor: "var(--success-color)", color: "white" }}
            >
              Download Report
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <SummaryCard label="Total rows" value={report.summary.total} />
            <SummaryCard label="Created" value={report.summary.created} color="var(--success-color)" />
            <SummaryCard label="Skipped" value={report.summary.skipped} color="var(--warning-color)" />
            <SummaryCard label="Failed" value={report.summary.failed} color="var(--error-color)" />
          </div>

          <Banner color="var(--warning-color)">
            Passwords are only shown here. Download the report before leaving this page
            if you need to hand them out.
          </Banner>

          <div className="flex items-center gap-2 mb-3">
            <label htmlFor="statusFilter" className="text-sm">Show:</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 rounded border border-[var(--border-color)] bg-[var(--card-background)]"
            >
              <option value="all">All</option>
              <option value="created">Created</option>
              <option value="skipped">Skipped</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="overflow-x-auto scrollbar rounded-lg border border-[var(--border-color)]">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-[var(--secondary-color)]">
                <tr>
                  {["Row", "Name", "Email", "Nickname", "Password", "Status", "Details"].map((h) => (
                    <th
                      key={h}
                      className="py-2 px-3 text-left font-semibold border-b border-[var(--border-color)] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-[var(--card-background)]">
                {visibleResults.map((r, i) => (
                  <tr
                    key={`${r.row}-${i}`}
                    className="hover:bg-[var(--secondary-hover)] transition-colors align-top"
                  >
                    <td className="py-2 px-3 border-b border-[var(--border-color)]">{r.row}</td>
                    <td className="py-2 px-3 border-b border-[var(--border-color)] whitespace-nowrap">{r.name || "—"}</td>
                    <td className="py-2 px-3 border-b border-[var(--border-color)]">{r.email || "—"}</td>
                    <td className="py-2 px-3 border-b border-[var(--border-color)]">{r.username || "—"}</td>
                    <td className="py-2 px-3 border-b border-[var(--border-color)]">{r.password || "—"}</td>
                    <td
                      className="py-2 px-3 border-b border-[var(--border-color)] font-semibold capitalize"
                      style={{ color: STATUS_COLORS[r.status] }}
                    >
                      {r.status}
                    </td>
                    <td className="py-2 px-3 border-b border-[var(--border-color)] max-w-md">{r.message}</td>
                  </tr>
                ))}

                {visibleResults.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center opacity-70">
                      No rows with that status
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: "var(--card-background)", borderColor: "var(--border-color)" }}
    >
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold" style={color ? { color } : undefined}>{value}</p>
    </div>
  );
}

function Banner({ color, children }) {
  return (
    <div
      className="rounded-lg border px-4 py-3 mb-4 text-sm"
      style={{ borderColor: color, color, backgroundColor: "var(--card-background)" }}
    >
      {children}
    </div>
  );
}

function columnNote(key) {
  switch (key) {
    case "username":
      return "Leave blank to generate one from the first and last name.";
    case "password":
      return "Leave blank to use the nickname followed by 12345 (e.g. johnny12345).";
    case "dob":
      return "Month and day only, MM/DD (e.g. 05/14). Real date cells are accepted too.";
    case "phone":
      return "10 to 15 digits. Must not already belong to another user.";
    case "gender":
      return "male, female or other.";
    case "region":
      return "A region name or its 2-digit code — see the list below.";
    case "stateCode":
      return "Two-letter state code, e.g. GA.";
    case "email":
      return "Must be unique. Rows whose email already exists are skipped.";
    default:
      return "";
  }
}
