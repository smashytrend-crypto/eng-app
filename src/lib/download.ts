/** Zapisuje plik na telefonie/komputerze. Na iPhonie (PWA) używa menu „Udostępnij”. */
export async function saveFile(content: string, filename: string, type = 'application/json'): Promise<'shared' | 'downloaded'> {
  const blob = new Blob([content], { type })
  const file = new File([blob], filename, { type })
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isIos && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    } catch {
      // anulowane — spróbuj zwykłego pobrania
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return 'downloaded'
}

/** Kopiuje tekst do schowka (z zapasową metodą dla starszych przeglądarek). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    ta.remove()
    return ok
  }
}
