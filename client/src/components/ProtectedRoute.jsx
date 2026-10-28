import { Navigate } from "react-router-dom";
import { getSession } from "../auth";

function ProtectedRoute({ children, adminOnly = false }) {

    // Reads the role from the signed token rather than the editable
    // "user" entry; the server enforces admin access either way.
    const session = getSession();

    if (!session) {

        return <Navigate to="/login" />;

    }

    if (adminOnly && session.role !== "admin") {

        return <Navigate to="/hotels" />;

    }

    return children;
}

export default ProtectedRoute;
