import { Outlet } from 'react-router'
import { NavBar } from '../components/NavBar'

export function RootLayout() {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  )
}
