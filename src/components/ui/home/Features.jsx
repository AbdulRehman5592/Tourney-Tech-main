import { Trophy, Users, Clock } from 'lucide-react';

const FEATURES = [
  {
    icon: Trophy,
    title: 'Live Bracket Updates',
    description:
      'Watch brackets update in real-time as scores are entered. Stay in sync with every match.',
  },
  {
    icon: Users,
    title: 'Team Management',
    description:
      'Easily add players, assign teams, and track their performance with intuitive tools.',
  },
  {
    icon: Clock,
    title: 'Schedule & Reminders',
    description:
      'Auto-generate match timings and notify players to keep your tournament running smoothly.',
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
          Why Choose Our Platform?
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
