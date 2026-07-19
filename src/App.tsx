import { PlayerProfileCard } from './components/PlayerProfileCard'

const mockProfile = {
  id: 'mock-id',
  role: 'player',
  is_pro: true,
  location: '千葉',
  display_name: '福地 祐哉',
  slug: 'yuya-fukuchi',
  avatar_url: 'https://livescore.japanprodarts.jp/player_images/178348847730.jpg',
  bio_text: 'Darts & Sports Bar Boom!! の店長',
  stats_url: 'https://livescore.japanprodarts.jp/directory_detail.php?p=3311',
  created_at: '',
  updated_at: '',
} as const

const mockStats = { request_count: 34, total_mobilized: 812 }

export default function App() {
  return <PlayerProfileCard profile={mockProfile} stats={mockStats} />
}