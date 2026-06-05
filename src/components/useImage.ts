import { useEffect, useState } from 'react'

/** Load an HTMLImageElement from a URL (or data URL). Returns undefined
 *  until loaded; resets when the url changes. */
export function useImage(url: string | undefined): HTMLImageElement | undefined {
  const [img, setImg] = useState<HTMLImageElement>()
  useEffect(() => {
    if (!url) {
      setImg(undefined)
      return
    }
    const image = new Image()
    image.crossOrigin = 'anonymous'
    let active = true
    image.onload = () => {
      if (active) setImg(image)
    }
    image.onerror = () => {
      if (active) setImg(undefined)
    }
    image.src = url
    return () => {
      active = false
    }
  }, [url])
  return img
}
