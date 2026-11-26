// Main page after login. For now it only greets the user; the document list comes in step 2.
import { useAuth } from '../AuthContext';

export default function DocumentsPage() {
  const { user } = useAuth();

  return (
    <div className="card">
      <h2>Documents</h2>
      <p>
        Welcome, <strong>{user.username}</strong>. You are signed in as a{' '}
        <strong>{user.role}</strong> in <strong>{user.department}</strong>.
      </p>
    </div>
  );
}
