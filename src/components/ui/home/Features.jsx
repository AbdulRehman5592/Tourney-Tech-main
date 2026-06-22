import { Trophy, Users, Clock } from 'lucide-react';

export default function Features() {
  return (
    <section
      className="py-20"
      style={{
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
      }}
    >
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-12">
          Why Choose Our Platform?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Feature 1 */}
          <div
            className="p-8 rounded-xl shadow-md hover:shadow-lg transition"
            style={{ backgroundColor: 'var(--card-background)' }}
          >
            <Trophy className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent-color)' }} />
            <h3 className="text-xl font-semibold mb-2">Live Bracket Updates</h3>
            <p style={{ color: '#9CA3AF' /* gray-400 */ }}>
              Watch brackets update in real-time as scores are entered. Stay in sync with every match.
            </p>
          </div>

          {/* Feature 2 */}
          <div
            className="p-8 rounded-xl shadow-md hover:shadow-lg transition"
            style={{ backgroundColor: 'var(--card-background)' }}
          >
            <Users className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent-color)' }} />
            <h3 className="text-xl font-semibold mb-2">Team Management</h3>
            <p style={{ color: '#9CA3AF' }}>
              Easily add players, assign teams, and track their performance with intuitive tools.
            </p>
          </div>

          {/* Feature 3 */}
          <div
            className="p-8 rounded-xl shadow-md hover:shadow-lg transition"
            style={{ backgroundColor: 'var(--card-background)' }}
          >
            <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--accent-color)' }} />
            <h3 className="text-xl font-semibold mb-2">Schedule & Reminders</h3>
            <p style={{ color: '#9CA3AF' }}>
              Auto-generate match timings and notify players to keep your tournament running smoothly.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
