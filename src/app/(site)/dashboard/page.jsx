"use client";

import { useState, useEffect } from "react";
import api from "@/utils/axios";

import TournamentCard from "@/components/ui/tournaments/TournamentCard";
import TournamentFilters from "@/components/ui/tournaments/TournamentFilters";
import { sortTournamentsCompletedLast } from "@/utils/tournamentSort";

export default function TournamentListing() {
  const [tournaments, setTournaments] = useState([]);
  const [userTournaments, setUserTournaments] = useState({}); // Store user's role in each tournament
  const [selectedId, setSelectedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    location: "",
    format: "",
    teamType: "",
    game: "",
    startDate: "",
  });

  const itemsPerPage = 6;

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await api.get("/api/tournaments");
        setTournaments(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch tournaments:", err);
      }
    };

    fetchTournaments();
  }, []);

  const fetchUserTournaments = async () => {
    try {
      const res = await api.get("/api/tournaments/my-tournaments");
      const myTournaments = res.data.data || [];

      // Create a map of tournament ID to the user's role + (for players)
      // payment-verification status, so this listing's cards stay
      // consistent with My Tournaments instead of assuming "paid".
      const tournamentRoleMap = {};
      myTournaments.forEach((tournament) => {
        tournamentRoleMap[tournament._id] = {
          userRole: tournament.userRole,
          paymentStatus: tournament.paymentStatus,
          registrationCancelled: tournament.registrationCancelled,
          registeredGameConfigIds: tournament.registeredGameConfigIds,
        };
      });

      setUserTournaments(tournamentRoleMap);
    } catch (err) {
      console.error("Failed to fetch user tournaments:", err);
    }
  };

  useEffect(() => {
    fetchUserTournaments();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const sortedTournaments = sortTournamentsCompletedLast(tournaments);

  const filteredTournaments = sortedTournaments.filter((t) => {
    const matchesSearch =
      t.name?.toLowerCase().includes(search.toLowerCase()) ?? false;

    const matchesStatus = filters.status ? t.status === filters.status : true;

    const matchesLocation = filters.location
      ? t.location === filters.location
      : true;

    // ✅ Only tournaments starting on or after the picked date
    const matchesStartDate = filters.startDate
      ? t.startDate && new Date(t.startDate) >= new Date(filters.startDate)
      : true;

    // ✅ Check by format inside games[]
    const matchesFormat = filters.format
      ? t.games?.some((g) => g?.format === filters.format)
      : true;

    // ✅ Check by team type inside games[]
    const matchesTeamType = filters.teamType
      ? t.games?.some((g) => g?.tournamentTeamType === filters.teamType)
      : true;

    // ✅ Check by game name
    const matchesGame = filters.game
      ? t.games?.some(
          (g) => g?.game?.name?.toLowerCase() === filters.game.toLowerCase()
        )
      : true;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesLocation &&
      matchesStartDate &&
      matchesFormat &&
      matchesTeamType &&
      matchesGame
    );
  });

  const totalPages = Math.ceil(filteredTournaments.length / itemsPerPage);

  const paginatedTournaments = filteredTournaments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-7xl mx-auto">
      <h1
        className="text-4xl font-extrabold text-center mb-6"
        style={{ color: "var(--accent-color)" }}
      >
        🎮 Explore Tournaments
      </h1>

      {/* Filters + Search */}
      <TournamentFilters
        filters={filters}
        onChange={handleFilterChange}
        search={search}
        onSearchChange={setSearch}
        tournamentData={tournaments}
      />

      {/* Tournament Cards */}
      <div className="grid grid-cols-1 gap-4">
        {paginatedTournaments.map((tournament) => {
          const mine = userTournaments[tournament._id] || {};
          return (
            <TournamentCard
              key={tournament._id}
              {...tournament}
              selectedId={selectedId}
              onSelect={setSelectedId}
              userRole={mine.userRole}
              paymentStatus={mine.paymentStatus}
              registrationCancelled={mine.registrationCancelled}
              registeredGameConfigIds={mine.registeredGameConfigIds}
              onCancelled={fetchUserTournaments}
            />
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-4 mt-12">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50"
        >
          Previous
        </button>

        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index}
            onClick={() => setCurrentPage(index + 1)}
            className={`px-4 py-2 rounded font-semibold ${
              currentPage === index + 1
                ? "bg-yellow-500 text-black"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            {index + 1}
          </button>
        ))}

        <button
          disabled={currentPage === totalPages}
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
