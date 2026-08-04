import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import IntroPlayer from "@/components/IntroPlayer";
import EulaGate from "@/components/EulaGate";
import TitleBar from "@/components/TitleBar";
import UpdateChecker from "@/components/UpdateChecker";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={300}>
      <Toaster />
      <Sonner />
      <DataProvider>
        <AuthProvider>
          <TitleBar />
          <UpdateChecker />
          <IntroPlayer />
          <EulaGate />
          <HashRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </AuthProvider>
      </DataProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
