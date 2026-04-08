import Link from "next/link";
import { getCurrentUser } from "@/lib/authSession";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div>
      <h1 className="pageTitle">Pharmacy Inventory</h1>
      <p className="muted">Track stock, expiry dates, and sales in one place.</p>

      <div style={{ height: 16 }} />

      <div className="card" style={{ maxWidth: 480 }}>
        {user ? (
          <>
            <p style={{ marginBottom: 12 }}>
              Signed in as <strong>{user.name || user.email}</strong> ({user.role}).
            </p>
            <div className="row">
              <Link className="btn" href="/dashboard">
                Go to dashboard
              </Link>
              <Link className="btn btnSecondary" href="/inventory">
                Inventory
              </Link>
            </div>
          </>
        ) : (
          <>
            <p style={{ marginBottom: 12 }}>Log in or create an account to manage inventory.</p>
            <div className="row">
              <Link className="btn" href="/login">
                Login
              </Link>
              <Link className="btn btnSecondary" href="/signup">
                Sign up
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
