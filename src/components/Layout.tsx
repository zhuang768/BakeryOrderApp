import { NavLink, Outlet } from "react-router-dom";
import { IconHistory, IconIngredient, IconOrder, IconRecipe, IconSettings } from "./Icons";

const links = [
  { to: "/", label: "今日叫貨", icon: IconOrder, end: true },
  { to: "/recipes", label: "配方", icon: IconRecipe, end: false },
  { to: "/ingredients", label: "原料", icon: IconIngredient, end: false },
  { to: "/history", label: "歷史紀錄", icon: IconHistory, end: false },
  { to: "/settings", label: "設定", icon: IconSettings, end: false },
];

export function Layout() {
  return (
    <div className="app-shell">
      <main className="main">
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="主要功能">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => (isActive ? "tab active" : "tab")}
          >
            <link.icon />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
