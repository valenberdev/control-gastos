def edit(p, pairs):
    s = open(p, encoding='utf-8').read()
    for old, new in pairs:
        assert old in s, (p, old[:50])
        s = s.replace(old, new, 1)
    open(p, 'w', encoding='utf-8').write(s)

edit('src/sw.ts', [('      badge: "/icon-192.png",', '      badge: "/badge-96.png",')])

edit('vite.config.ts', [('''          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },''', '''          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },''')])

edit('index.html', [('    <link rel="apple-touch-icon" href="/icon-192.png" />',
'''    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />''')])

edit('src/components/BottomNav.tsx', [('''          Gastos
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path d="M4 20L20 4" />
          </svg>''', '''          <AppMark />
          Gastos'''),
('export default function BottomNav() {', '''function AppMark() {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className="app-mark">
      <rect width="512" height="512" fill="#0057FF" />
      <path
        fill="#FFFFFF"
        fillRule="evenodd"
        d="M136 96H376L416 136V376L376 416H136L96 376V136Z M160 160H416V224H288V288H352V352H160Z"
      />
      <path
        d="M188 324L264 248"
        stroke="#FFFFFF"
        strokeWidth="22"
        strokeLinecap="square"
        fill="none"
      />
    </svg>
  );
}

export default function BottomNav() {''')])

edit('src/styles/theme.css', [('''.brand-mark svg {
  width: 20px;
  height: 20px;
  color: var(--blue);
}''', '''.brand-mark .app-mark {
  width: 32px;
  height: 32px;
  flex: none;
}''')])
print('ok')
