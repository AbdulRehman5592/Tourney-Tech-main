export default function HowItWorks() {
  const steps = [
    {
      title: "1. Browse Tournaments",
      description: "Explore ongoing and upcoming tournaments across different games or sports.",
      emoji: "🔍",
    },
    {
      title: "2. Join a Match",
      description: "Sign up for a tournament and get matched with other players instantly.",
      emoji: "🎮",
    },
    {
      title: "3. Play & Compete",
      description: "Play your matches on time, and compete with others to move up the bracket.",
      emoji: "⚔️",
    },
    {
      title: "4. Track Progress",
      description: "Follow your bracket, match history, and results — all in one place.",
      emoji: "📊",
    },
  ];

  return (
    <section
      className="py-20"
      id="how-it-works"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-12">
          How It Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
          {steps.map((step, index) => (
            <div
              key={index}
              className="p-6 rounded-xl shadow hover:shadow-lg transition"
              style={{
                backgroundColor: "var(--card-background)",
                color: "var(--foreground)",
              }}
            >
              <div className="text-4xl mb-4">{step.emoji}</div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p style={{ color: "#9CA3AF" }}>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
