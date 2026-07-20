import { createBrowserRouter } from 'react-router'
import { RootLayout } from './layouts/RootLayout'
import { HomePage } from './pages/HomePage'
import { PlayerProfilePage } from './pages/PlayerProfilePage'
import { PlayersListPage } from './pages/PlayersListPage'
import { StorePage } from './pages/StorePage'
import { StoresListPage } from './pages/StoresListPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SignInPage } from './pages/SignInPage'
import { EditProfilePage } from './pages/EditProfilePage'
import { AuthLanding } from './pages/AuthLanding'
import { OnboardingPage } from './pages/OnboardingPage'
import { MyEventHistoryPage } from './pages/MyEventHistoryPage'
import { StoreDashboardPage } from './pages/StoreDashboardPage'
import { EventDetailPage } from './pages/EventDetailPage'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/players', element: <PlayersListPage /> },
      { path: '/players/:slug', element: <PlayerProfilePage /> },
      { path: '/stores', element: <StoresListPage /> },
      { path: '/stores/:slug', element: <StorePage /> },
      { path: '/events/new', element: <EventDetailPage /> },
      { path: '/events/:id', element: <EventDetailPage /> },
      { path: '/sign-in', element: <SignInPage /> },
      { path: '/onboarding', element: <OnboardingPage /> },
      { path: '/me', element: <AuthLanding /> },
      { path: '/me/edit', element: <EditProfilePage /> },
      { path: '/me/events', element: <MyEventHistoryPage /> },
      { path: '/me/dashboard', element: <StoreDashboardPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
