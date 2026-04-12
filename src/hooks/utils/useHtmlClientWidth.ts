import { useEffect, useRef, useState } from "react"

const dpr = window.devicePixelRatio || 1;

export const useHtmlClientDimension = () => {
  const [htmlClientDimension, setHtmlClientDimension] = useState({
    htmlClientWidth: document.documentElement.clientWidth * dpr,
    htmlClientHeight: document.documentElement.clientHeight * dpr,
  });

  const observer = useRef(new ResizeObserver((entries) => {
    for (let entry of entries) {
      setHtmlClientDimension({ htmlClientHeight: entry.target.clientHeight * dpr, htmlClientWidth: entry.target.clientWidth * dpr })
    }
  }))

  useEffect(() => {
    observer.current.observe(document.documentElement)

    return () => {
      observer.current.unobserve(document.documentElement)
      observer.current.disconnect()
    }
  }, [])

  return htmlClientDimension
}
