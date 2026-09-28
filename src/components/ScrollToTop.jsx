import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// SPA routes keep the previous scroll position — always start pages from the top.
export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
