import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ToastProvider } from "./components/Toast";
import { HistoryPage } from "./pages/HistoryPage";
import { IngredientsPage } from "./pages/IngredientsPage";
import { OrderPage } from "./pages/OrderPage";
import { RecipesPage } from "./pages/RecipesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StoreProvider } from "./store";
import { useStore } from "./useStore";

function AppRoutes() {
  const store = useStore();
  if (!store.ready) {
    return (
      <p className="loading" role="status">
        正在讀取這台裝置的資料…
      </p>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OrderPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="ingredients" element={<IngredientsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </StoreProvider>
  );
}
