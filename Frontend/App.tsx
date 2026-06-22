// PrintForge 3D — App.tsx (updated)
// Changes from original:
//   • Imports QueueManagement + PrinterManagement screens
//   • Wires push notification hook after login
//   • Extends ModalScreen + MainTab types for new screens
//   • Passes navigation callbacks into AdminDashboard for new screens
//   • Wraps the app in ErrorBoundary for uncaught render-time errors
//   • Wires real approve/reject results from JobDetailScreen into EstimateResult

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import { ThemeProvider, useTheme } from './src/hooks/useTheme';
import { Typography, Spacing, Radius } from './src/constants/theme';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { PrintJob } from './src/types';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import JobsScreen from './src/screens/JobsScreen';
import JobDetailScreen from './src/screens/JobDetailScreen';
import SubmitJobScreen from './src/screens/SubmitJobScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AdminDashboard from './src/screens/AdminDashboard';
import QueueManagement from './src/screens/QueueManagement';
import PrinterManagement from './src/screens/PrinterManagement';
import EstimateResult from './src/screens/EstimateResult';

type AuthScreen = 'splash' | 'login' | 'register';
type MainTab = 'home' | 'jobs' | 'dashboard' | 'profile';
type ModalScreen =
  | 'jobDetail'
  | 'submitJob'
  | 'notifications'
  | 'queueManagement'
  | 'printerManagement'
  | 'estimateResult'
  | null;

function AppContent() {
  const { user, isAuthenticated, isLoading, login, register, logout, switchRole } = useAuth();
  const { Colors } = useTheme();

  // Auth flow
  const [authScreen, setAuthScreen] = useState<AuthScreen>('splash');

  // Main navigation
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [modal, setModal] = useState<ModalScreen>(null);
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);
  const [pendingEstimate, setPendingEstimate] = useState<{ cost: number; time: number; job_id: string } | null>(null);

  // Push notifications (only fires when authenticated)
  usePushNotifications({
    onNotificationTapped: notification => {
      // If the notification carries a job_id, navigate to job detail
      const data = notification.request.content.data as any;
      if (data?.job_id) {
        // We don't have the full job object here; AdminDashboard / JobsScreen
        // will re-fetch. For now, switch to the jobs tab.
        setModal(null);
        setActiveTab('jobs');
      }
    },
  });

  // ── Loading spinner while restoring session ──────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles(Colors).root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  // ── Auth screens ─────────────────────────────────────────────────────────

  if (!isAuthenticated) {
    if (authScreen === 'splash') {
      return (
        <SplashScreen
          onGetStarted={() => setAuthScreen('register')}
          onLogin={() => setAuthScreen('login')}
        />
      );
    }
    if (authScreen === 'login') {
      return (
        <LoginScreen
          onLogin={login}
          onRegister={() => setAuthScreen('register')}
          onBack={() => setAuthScreen('splash')}
        />
      );
    }
    return (
      <RegisterScreen
        onRegister={register}
        onLogin={() => setAuthScreen('login')}
        onBack={() => setAuthScreen('splash')}
      />
    );
  }

  // ── Modal overlays ───────────────────────────────────────────────────────

  if (modal === 'jobDetail' && selectedJob) {
    return (
      <JobDetailScreen
        job={selectedJob}
        onBack={() => setModal(null)}
        isStaff={user?.role === 'lab_staff' || user?.role === 'admin'}
        onApproved={estimate => {
          setPendingEstimate(estimate);
          setModal('estimateResult');
        }}
        onRejected={() => setModal(null)}
      />
    );
  }

  if (modal === 'estimateResult' && pendingEstimate) {
    return (
      <EstimateResult
        estimate={pendingEstimate}
        fileName={selectedJob?.file_name}
        onDone={() => {
          setPendingEstimate(null);
          setSelectedJob(null);
          setModal(null);
          setActiveTab('dashboard');
        }}
        onViewJob={() => {
          setPendingEstimate(null);
          setModal('jobDetail');
        }}
      />
    );
  }

  if (modal === 'submitJob') {
    return (
      <SubmitJobScreen
        onBack={() => setModal(null)}
        onSubmit={() => {
          setModal(null);
          setActiveTab('jobs');
        }}
      />
    );
  }

  if (modal === 'notifications') {
    return <NotificationsScreen onBack={() => setModal(null)} />;
  }

  if (modal === 'queueManagement') {
    return (
      <QueueManagement
        onBack={() => setModal(null)}
        onJobPress={job => {
          setSelectedJob(job);
          setModal('jobDetail');
        }}
      />
    );
  }

  if (modal === 'printerManagement') {
    return <PrinterManagement onBack={() => setModal(null)} />;
  }

  // ── Main app with bottom tab bar ─────────────────────────────────────────

  const isStaffOrAdmin = user?.role === 'lab_staff' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const handleJobPress = (job: PrintJob) => {
    setSelectedJob(job);
    setModal('jobDetail');
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            user={user!}
            onNewJob={() => setModal('submitJob')}
            onJobPress={handleJobPress}
            onViewAll={() => setActiveTab('jobs')}
            onNotifications={() => setModal('notifications')}
          />
        );
      case 'jobs':
        return (
          <JobsScreen
            onJobPress={handleJobPress}
            onNewJob={() => setModal('submitJob')}
            userId={user?.user_id}
            showAll={isStaffOrAdmin}
          />
        );
      case 'dashboard':
        return (
          <AdminDashboard
            onJobPress={handleJobPress}
            onViewAllJobs={() => setActiveTab('jobs')}
            isAdmin={isAdmin}
            // New callbacks wired to the new screens
            onOpenQueueManagement={() => setModal('queueManagement')}
            onOpenPrinterManagement={() => setModal('printerManagement')}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            user={user!}
            onLogout={logout}
            onSwitchRole={role => {
              switchRole(role);
              setActiveTab('home');
            }}
          />
        );
      default:
        return null;
    }
  };

  const tabs = [
    { id: 'home',      label: 'Home',     iconActive: 'home',                 iconInactive: 'home-outline' },
    { id: 'jobs',      label: isStaffOrAdmin ? 'All Jobs' : 'My Jobs',
                                            iconActive: 'layers',               iconInactive: 'layers-outline' },
    ...(isStaffOrAdmin ? [{ id: 'dashboard', label: 'Dashboard',
                                            iconActive: 'speedometer',          iconInactive: 'speedometer-outline' }] : []),
    { id: 'profile',   label: 'Profile',  iconActive: 'person-circle',         iconInactive: 'person-circle-outline' },
  ] as const;

  return (
    <View style={styles(Colors).root}>
      <View style={{ flex: 1 }}>{renderTab()}</View>

      {/* FAB for new job (students only) */}
      {!isStaffOrAdmin && (
        <TouchableOpacity
          style={styles(Colors).fab}
          onPress={() => setModal('submitJob')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={Colors.background} />
        </TouchableOpacity>
      )}

      {/* Floating navigation dock */}
      <SafeAreaView style={styles(Colors).dockSafeArea} pointerEvents="box-none">
        <View style={styles(Colors).dock}>
          {tabs.map(tab => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles(Colors).dockItem, active && styles(Colors).dockItemActive]}
                onPress={() => setActiveTab(tab.id as MainTab)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={(active ? tab.iconActive : tab.iconInactive) as any}
                  size={22}
                  color={active ? Colors.accent : Colors.textMuted}
                />
                {active && (
                  <Text style={[Typography.labelSmall, styles(Colors).dockLabel]} numberOfLines={1}>
                    {tab.label}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// styles is now a function of the current palette instead of a static
// StyleSheet.create call, so colors update the instant the user switches
// theme — StyleSheet.create still does its normal optimization internally,
// we're just re-invoking it with fresh values each render.
const styles = (Colors: {
  background: string; surface: string; border: string; accent: string;
  navBackground: string; navBorder: string; textMuted: string;
}) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },

    // Floating dock — sits in its own SafeAreaView so it respects the home
    // indicator / gesture bar, but the dock itself is a compact pill that
    // floats above the content with margin on all sides (not edge-to-edge).
    dockSafeArea: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
    },
    dock: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.navBackground,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: Colors.navBorder,
      paddingHorizontal: 8,
      paddingVertical: 8,
      marginBottom: 12,
      gap: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
      elevation: 14,
    },
    dockItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: Radius.full,
    },
    dockItemActive: {
      backgroundColor: Colors.accent + '1A',
    },
    dockLabel: {
      color: Colors.accent,
      marginLeft: 6,
    },

    fab: {
      position: 'absolute',
      bottom: 96,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: Colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: Colors.accent,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
      elevation: 10,
      zIndex: 100,
    },
  });
