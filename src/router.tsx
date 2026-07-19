import { createBrowserRouter } from 'react-router'
import { PlayerProfilePage } from './pages/PlayerProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/players/:slug',
    element: <PlayerProfilePage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
