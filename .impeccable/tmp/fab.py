p='theme.css'
c=open(p,encoding='utf-8').read()
a=c.index('/* botón de agregar */')
b=c.index('/* ------------------------------------------------------------------\n   Selector de mes')
new='''/* botón de agregar: en el celular es la celda azul al final de la barra
   inferior (nada flota sobre los datos); en escritorio vive en la barra
   superior, al lado de la campana */
.fab {
  position: fixed;
  right: 0;
  bottom: env(safe-area-inset-bottom, 0px);
  width: 64px;
  height: var(--nav-h);
  border: none;
  border-top: 1px solid var(--frame);
  border-radius: 0;
  background: var(--blue-fill);
  color: var(--on-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 17;
  transition: background-color 0.15s ease, transform 0.15s var(--ease);
}

.fab:hover {
  background: var(--blue-press);
}

.fab:active {
  transform: scale(0.96);
}

@media (max-width: 899px) {
  body:has(.fab) .bottom-nav {
    right: 64px;
  }

  body:has(.fab) .nav-item {
    padding-left: 4px;
    padding-right: 4px;
  }
}

@media (min-width: 900px) {
  .fab {
    top: 14px;
    right: 88px;
    bottom: auto;
    width: 44px;
    height: 44px;
    border: none;
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%);
  }
}

'''
c=c[:a]+new+c[b:]
c=c.replace("calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 96px);","calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 32px);",1)
c=c.replace("padding: 112px 32px 128px;","padding: 112px 32px 64px;")
open(p,'w',encoding='utf-8').write(c)
print('ok')
