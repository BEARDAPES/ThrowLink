import { createBrowserRouter } from 'react-router'
import { PlayerProfilePage } from './pages/PlayerProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SignInPage } from './pages/SignInPage'
import { EditProfilePage } from './pages/EditProfilePage'
import { AuthLanding } from './pages/AuthLanding'

export const router = createBrowserRouter([
  { path: '/players/:slug', element: <PlayerProfilePage /> },
  { path: '/sign-in', element: <SignInPage /> },
  { path: '/me', element: <AuthLanding /> },
  { path: '/me/edit', element: <EditProfilePage /> },
  { path: '*', element: <NotFoundPage /> },
])
