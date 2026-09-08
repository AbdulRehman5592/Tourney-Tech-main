import { ClipboardCheck, Activity, TrendingUp } from 'lucide-react';

const FEATURES = [
  {
    icon: ClipboardCheck,
    title: 'Registration & Check-In',
    description:
      'Simplify tournament day before play even begins. Players can register, select teammates or partners, complete tournament requirements, and check in when they arrive.',
  },
  {
    icon: Activity,
    title: 'Live Scoring & Standings',
    description:
      'Save time calculating results and know where everyone stands as the tournament unfolds. Record scores and results while Tourney Tech updates wins, losses, points, standings, placements, and tournament progress.',
  },
  {
    icon: TrendingUp,
    title: 'Player & Team Performance',
    description:
      'Turn every tournament into meaningful performance data. Track tournament history, statistics, attendance, results, and rankings for players and teams over time.',
  },
];

export default function Features() {
  return (
    <section
      className="py-16"
      style={{
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
      }}
    >
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-10">
          Why Choose Tourney Tech?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="p-6 rounded-xl border text-left transition hover:shadow-lg"
              style={{
                backgroundColor: 'var(--card-background)',
                borderColor: 'var(--border-color)',
              }}
            >
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center mb-4"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent-color) 12%, transparent)',
                }}
              >
                <Icon size={22} style={{ color: 'var(--accent-color)' }} aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
