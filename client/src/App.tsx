import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import TripDetail from "./pages/TripDetail";
import ExpensesPage from "./pages/ExpensesPage";
import MapPage from "./pages/MapPage";
import AIAnalysisPage from "./pages/AIAnalysisPage";
import SettingsPage from "./pages/SettingsPage";
import PrepCostsPage from "./pages/PrepCostsPage";
import DutchPayPage from "./pages/DutchPayPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/trip/:tripId" component={TripDetail} />
      <Route path="/trip/:tripId/expenses" component={ExpensesPage} />
      <Route path="/trip/:tripId/prep" component={PrepCostsPage} />
      <Route path="/trip/:tripId/map" component={MapPage} />
      <Route path="/trip/:tripId/dutch" component={DutchPayPage} />
      <Route path="/trip/:tripId/ai" component={AIAnalysisPage} />
      <Route path="/trip/:tripId/settings" component={SettingsPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "oklch(0.20 0.025 260)",
                border: "1px solid oklch(0.30 0.025 260)",
                color: "oklch(0.95 0.01 260)",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
