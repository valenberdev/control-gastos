import { Outlet } from "react-router";
import Footer from "./Footer";

export default function PublicLayout() {
  return (
    <div className="public-shell">
      <main className="public-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
