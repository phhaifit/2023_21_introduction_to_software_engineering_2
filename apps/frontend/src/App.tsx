import { AppRouter } from "./app/router";
import { AuthProvider } from "./features/authentication/context/AuthContext";

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
