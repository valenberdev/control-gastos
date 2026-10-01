# 7. the slash on auth head and modal head; bigger auth title
SLASH = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230057ff' stroke-width='2.5'%3E%3Cpath d='M4 20L20 4'/%3E%3C/svg%3E\") center / contain no-repeat"
extra = (
    ".auth-head {\n  position: relative;\n}\n\n"
    ".auth-head::after {\n  content: '';\n  position: absolute;\n  right: 0;\n  top: 2px;\n  width: 30px;\n  height: 30px;\n  background: " + SLASH + ";\n  pointer-events: none;\n}\n\n"
    ".movement-head::after {\n  content: '';\n  flex: none;\n  width: 24px;\n  height: 24px;\n  margin-left: auto;\n  order: 1;\n  background: " + SLASH + ";\n}\n\n"
    ".movement-head .icon-button {\n  order: 2;\n}\n\n"
    ".auth-head h1 {\n  font-size: 40px;"
)
c = sub(c, ".auth-head h1 {\n  font-size: 36px;", extra)
open(p, 'w', encoding='utf-8').write(c)
print('ok')
