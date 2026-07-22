import { Redirect } from 'expo-router';
import StudentDashboard from './student';
import DesignerDashboard from './designer';
import { useSession } from '@/SessionContext';

export default function DashboardIndex() {
  const { role } = useSession();

  // role comes straight from the backend's UserDto (Role enum name,
  // lowercased — see AuthService.toUserDto()), so LAB_STAFF arrives as
  // 'lab_staff', not 'staff'. This used to check 'staff' and silently
  // fall through lab staff accounts to the student dashboard.
  if (role === 'designer') return <DesignerDashboard />;
  if (role === 'lab_staff') return <Redirect href="/staff/board" />;
  if (role === 'admin') return <Redirect href="/admin" />;

  return <StudentDashboard />;
}