import { createBrowserRouter } from 'react-router'
import { HomePage } from './pages/HomePage'
import { PlayerProfilePage } from './pages/PlayerProfilePage'
import { StorePage } from './pages/StorePage'
import { StoreDashboardPage } from './pages/StoreDashboardPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SignInPage } from './pages/SignInPage'
import { EditProfilePage } from './pages/EditProfilePage'
import { AuthLanding } from './pages/AuthLanding'
import { OnboardingPage } from './pages/OnboardingPage'
import { MyEventHistoryPage } from './pages/MyEventHistoryPage'

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/players/:slug', element: <PlayerProfilePage /> },
  { path: '/stores/:slug', element: <StorePage /> },
  { path: '/sign-in', element: <SignInPage /> },
  { path: '/onboarding', element: <OnboardingPage /> },
  { path: '/me', element: <AuthLanding /> },
  { path: '/me/edit', element: <EditProfilePage /> },
  { path: '/me/events', element: <MyEventHistoryPage /> },
  { path: '/me/dashboard', element: <StoreDashboardPage /> },
  { path: '*', element: <NotFoundPage /> },
])
