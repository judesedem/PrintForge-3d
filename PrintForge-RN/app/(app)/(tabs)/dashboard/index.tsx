import { Redirect, useLocalSearchParams } from 'expo-router';
import StudentDashboard from './student';
import DesignerDashboard from './designer';

export default function DashboardIndex() {
  const { role } = useLocalSearchParams();
  const currentRole = typeof role === 'string' ? role.toLowerCase() : 'student';

  if (currentRole === 'designer') return <DesignerDashboard />;
  if (currentRole === 'staff') return <Redirect href="/staff/queue" />;
  if (currentRole === 'admin') return <Redirect href="/admin" />;

  return <StudentDashboard />;
}