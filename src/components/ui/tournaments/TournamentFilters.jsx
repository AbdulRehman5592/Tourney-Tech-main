"use client";

export default function TournamentFilters({
  filters,
  onChange,
  search,
  onSearchChange,
  tournamentData,
}) {
  const uniqueLocations = [...new Set(tournamentData.map((t) => t.location))].sort();

  // Derive unique formats (single/double elimination, round robin)
  // const uniqueFormats = [
  //   ...new Set(tournamentData.flatMap((t) => t.games.map((g) => g.format))),
  // ];

  // Derive unique team types (single_player / double_player)
  const uniqueTeamTypes = [
    ...new Set(tournamentData.flatMap((t) => t.games.map((g) => g.tournamentTeamType))),
  ];

  // Derive unique game names (Spades, Bid Whist, etc.)
  const uniqueGames = [
    ...new Set(
      tournamentData.flatMap((t) => t.games.map((g) => g.game?.name)).filter(Boolean)
    ),
  ].sort();

  const selectClass =
    "p-2 rounded border border-[var(--border-color)] bg-[var(--card-background)] text-[var(--foreground)]";

  const optionStyle = {
    backgroundColor: "var(--card-background)",
    color: "var(--foreground)",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-10">
      {/* Search bar */}
      <input
        type="text"
        placeholder="Search by tournament name..."
        className={selectClass}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      {/* Status filter */}
      <select
        name="status"
        value={filters.status}
        onChange={onChange}
        className={selectClass}
      >
        <option value="" style={optionStyle}>
          All Status
        </option>
        <option value="upcoming" style={optionStyle}>
          Upcoming
        </option>
        <option value="ongoing" style={optionStyle}>
          Ongoing
        </option>
        <option value="completed" style={optionStyle}>
          Completed
        </option>
      </select>

      {/* Location filter */}
      <select
        name="location"
        value={filters.location}
        onChange={onChange}
        className={selectClass}
      >
        <option value="" style={optionStyle}>
          All Locations
        </option>
        {uniqueLocations.map((loc) => (
          <option key={loc} value={loc} style={optionStyle}>
            {loc}
          </option>
        ))}
      </select>

      {/* Game filter */}
      <select
        name="game"
        value={filters.game}
        onChange={onChange}
        className={selectClass}
      >
        <option value="" style={optionStyle}>
          All Games
        </option>
        {uniqueGames.map((name) => (
          <option key={name} value={name} style={optionStyle}>
            {name}
          </option>
        ))}
      </select>

      {/* Format filter */}
      {/* <select
        name="format"
        value={filters.format}
        onChange={onChange}
        className={selectClass}
      >
        <option value="" style={optionStyle}>
          All Formats
        </option>
        {uniqueFormats.map((f) => (
          <option key={f} value={f} style={optionStyle}>
            {f === "single_elimination"
              ? "Single Elimination"
              : f === "double_elimination"
              ? "Double Elimination"
              : "Round Robin"}
          </option>
        ))}
      </select> */}

      {/* Start date filter -- show tournaments starting on or after this date */}
      <input
        type="date"
        name="startDate"
        value={filters.startDate}
        onChange={onChange}
        title="Show tournaments starting on or after this date"
        className={`${selectClass} [color-scheme:dark]`}
      />

      {/* Team Type filter */}
      <select
        name="teamType"
        value={filters.teamType}
        onChange={onChange}
        className={selectClass}
      >
        <option value="" style={optionStyle}>
          All Team Types
        </option>
        {uniqueTeamTypes.map((type) => (
          <option key={type} value={type} style={optionStyle}>
            {type === "single_player" ? "Single Player" : "Double Player"}
          </option>
        ))}
      </select>
    </div>
  );
}
