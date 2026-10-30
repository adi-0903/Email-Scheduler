import { useState, useMemo, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { TabsToolbar } from './components/TabsToolbar';
import { DataTable } from './components/DataTable';
import { ComposeModal } from './components/ComposeModal';
import { LoginScreen } from './components/LoginScreen';
import { EmailPreviewModal } from './components/EmailPreviewModal';
import { ToastContainer } from './components/Toast';
import { ActiveTab, ComposeFormState, EmailItem, ToastItem } from './types';
import {
  INITIAL_COUNTS,
  SAMPLE_SCHEDULED_EMAILS,
  SAMPLE_SENT_EMAILS,
} from './data/mockData';
import { filterEmails } from './utils/scheduleCalculator';
import { BackendIntegrationModal } from './components/BackendIntegrationModal';
import { realtimeClient, RealtimeEvent } from './services/realtimeBackendService';

function mapBackendEmail(email: any): EmailItem {
  const status =
    email.status === 'SENT' ? 'Sent' : email.status === 'FAILED' ? 'Failed' : 'Scheduled';
  const primaryEmail = email.recipient || email.email || 'target@example.com';
  return {
    id: email.id,
    email: primaryEmail,
    company: primaryEmail.split('@')[1]?.split('.')[0] || 'Company',
    avatarText: primaryEmail.slice(0, 2).toUpperCase(),
    tag: email.jobId ? 'BullMQ Dispatch' : 'Live Email',
    subject: email.subject || 'Outbound campaign message',
    scheduledTime: email.scheduledAt ? new Date(email.scheduledAt).toLocaleString() : undefined,
    sentTime: email.sentAt ? new Date(email.sentAt).toLocaleString() : undefined,
    status,
    failedReason: email.lastError || undefined,
    bodySnippet: email.body ? email.body.replace(/<[^>]*>/g, '').slice(0, 80) + '...' : '',
    previewUrl: email.previewUrl || undefined,
  };
}

export default function App() {
  // Navigation & User Auth
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [user, setUser] = useState<{ name: string; email: string }>({
    name: 'Alex Morgan',
    email: 'alex.morgan@gmail.com',
  });
  const [isSlackConnected, setIsSlackConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('scheduled');

  // Backend Real-Time Connection
  const [isBackendModalOpen, setIsBackendModalOpen] = useState(false);
  const [backendUrl, setBackendUrl] = useState(
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_BACKEND_URL) || 'https://email-scheduler-jqgy.onrender.com'
  );
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  // Email collections & counts - start clean and empty
  const [scheduledEmails, setScheduledEmails] = useState<EmailItem[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailItem[]>([]);
  const [scheduledTotal, setScheduledTotal] = useState(0);
  const [sentTotal, setSentTotal] = useState(0);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [isTableError, setIsTableError] = useState(false);

  // Compose Modal
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Preview Modal
  const [previewEmail, setPreviewEmail] = useState<EmailItem | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Latest sent email preview url for Ethereal direct link
  const latestEtherealUrl = useMemo(() => {
    return sentEmails.find((e) => e.previewUrl)?.previewUrl;
  }, [sentEmails]);

  // Toast Helpers
  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch real data from backend on mount or reconnect
  const loadBackendEmails = useCallback(async () => {
    setIsLoading(true);
    try {
      const [scheduledRes, sentRes] = await Promise.all([
        realtimeClient.fetchEmails({ status: 'SCHEDULED', limit: 100 }),
        realtimeClient.fetchEmails({ status: 'SENT', limit: 100 }),
      ]);

      if (scheduledRes.data) {
        const mapped = scheduledRes.data.map(mapBackendEmail);
        setScheduledEmails(mapped);
        setScheduledTotal(scheduledRes.pagination?.total ?? mapped.length);
      }

      if (sentRes.data) {
        const mapped = sentRes.data.map(mapBackendEmail);
        setSentEmails(mapped);
        setSentTotal(sentRes.pagination?.total ?? mapped.length);
      }
    } catch (err) {
      console.warn('[App] Could not fetch initial backend emails:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check Slack status on mount
  useEffect(() => {
    realtimeClient.checkSlackStatus(user.email).then((res) => {
      if (res.connected) {
        setIsSlackConnected(true);
      }
    });
  }, [user.email]);

  // Real-Time WebSocket Event Listener & Auto-sync
  useEffect(() => {
    const unsubStatus = realtimeClient.onStatusChange((connected) => {
      setIsBackendConnected(connected);
      if (connected) {
        addToast('success', 'Connected to real-time email dispatch engine (Neon + BullMQ)!');
        loadBackendEmails();
      }
    });

    const unsubEvents = realtimeClient.subscribe((event: RealtimeEvent) => {
      if (event.type === 'email:scheduled') {
        const { email, scheduledTime, jobId } = event.data;
        setScheduledEmails((prev) => {
          if (prev.some((item) => item.email === email && item.status === 'Scheduled')) return prev;
          const newItem: EmailItem = {
            id: jobId || `sch-${Date.now()}`,
            email,
            company: email.split('@')[1]?.split('.')[0] || 'Company',
            avatarText: email.slice(0, 2).toUpperCase(),
            tag: 'BullMQ Queued',
            subject: 'Campaign message',
            scheduledTime: scheduledTime || new Date().toLocaleString(),
            status: 'Scheduled',
          };
          return [newItem, ...prev];
        });
        setScheduledTotal((prev) => prev + 1);
      } else if (event.type === 'email:sending') {
        const { email } = event.data;
        addToast('success', `⏳ BullMQ worker picked: ${email} (dispatching now via SMTP)...`);
      } else if (event.type === 'email:sent') {
        const { email, sentTime } = event.data;
        // Move from scheduled to sent
        setScheduledEmails((prev) => prev.filter((item) => item.email !== email));
        setScheduledTotal((prev) => Math.max(0, prev - 1));

        const sentItem: EmailItem = {
          id: `sent-${Date.now()}-${Math.random()}`,
          email,
          company: email.split('@')[1]?.split('.')[0] || 'Company',
          avatarText: email.slice(0, 2).toUpperCase(),
          tag: 'Ethereal Delivered',
          subject: 'Outbound campaign message',
          sentTime: sentTime || new Date().toLocaleString(),
          status: 'Sent',
          previewUrl: event.data.previewUrl ? String(event.data.previewUrl) : undefined,
        };

        setSentEmails((prev) => [sentItem, ...prev]);
        setSentTotal((prev) => prev + 1);
        addToast('success', `⚡ Real-Time Dispatch: Email successfully sent to ${email}`);
      } else if (event.type === 'email:failed') {
        const { email, reason } = event.data;
        setScheduledEmails((prev) => prev.filter((item) => item.email !== email));
        setScheduledTotal((prev) => Math.max(0, prev - 1));

        const failedItem: EmailItem = {
          id: `failed-${Date.now()}-${Math.random()}`,
          email,
          company: email.split('@')[1]?.split('.')[0] || 'Company',
          avatarText: email.slice(0, 2).toUpperCase(),
          tag: 'Failed',
          subject: 'Outbound campaign message',
          sentTime: new Date().toLocaleString(),
          status: 'Failed',
          failedReason: reason || 'Delivery failed after 3 attempts',
        };

        setSentEmails((prev) => [failedItem, ...prev]);
        setSentTotal((prev) => prev + 1);
        addToast('error', `❌ Delivery Failed: ${email} (${reason || 'SMTP rejected'})`);
      }
    });

    return () => {
      unsubStatus();
      unsubEvents();
    };
  }, [addToast, loadBackendEmails]);

  // Real-time Delivery Simulation for Demo/Testing
  const handleSimulateRealtimeDelivery = () => {
    if (scheduledEmails.length === 0) {
      addToast('error', 'No scheduled emails left to simulate!');
      return;
    }

    const targetEmail = scheduledEmails[0];
    addToast('success', `⏳ Queue worker picked: ${targetEmail.email} (dispatching in 2s)...`);

    setTimeout(() => {
      setScheduledEmails((prev) => prev.filter((item) => item.id !== targetEmail.id));
      setScheduledTotal((prev) => Math.max(0, prev - 1));

      const deliveredItem: EmailItem = {
        ...targetEmail,
        id: `sent-sim-${Date.now()}`,
        sentTime: 'Just now',
        status: 'Sent',
      };

      setSentEmails((prev) => [deliveredItem, ...prev]);
      setSentTotal((prev) => prev + 1);
      addToast('success', `🚀 Real-Time Event: Email dispatched to ${targetEmail.email}! Moved to Sent Emails.`);
    }, 2000);
  };

  // Slack Connect / Disconnect Handler
  const handleToggleSlack = async (connect: boolean) => {
    if (connect) {
      const authUrl = realtimeClient.getSlackAuthUrl(user.email);
      window.open(authUrl, '_blank', 'width=650,height=750');
      setIsSlackConnected(true);
      addToast('success', 'Slack OAuth window opened. Syncing #alerts channel...');
    } else {
      await realtimeClient.disconnectSlack(user.email);
      setIsSlackConnected(false);
      addToast('error', 'Slack channel disconnected.');
    }
  };
  const currentList = useMemo(() => {
    const source = activeTab === 'scheduled' ? scheduledEmails : sentEmails;
    return filterEmails(source, searchQuery);
  }, [activeTab, scheduledEmails, sentEmails, searchQuery]);

  // Paginated slice
  const paginatedEmails = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return currentList.slice(startIndex, startIndex + rowsPerPage);
  }, [currentList, currentPage, rowsPerPage]);

  const activeTotalCount = activeTab === 'scheduled' ? scheduledTotal : sentTotal;

  // Compose Submission Handler
  const handleScheduleEmail = async (formData: ComposeFormState) => {
    const directCount = formData.toEmails?.length || 0;
    const fileCount = formData.fileName ? (formData.leadCount || 0) : 0;
    const totalCount = Math.max(1, directCount + fileCount);

    const primaryRecipient =
      formData.toEmails?.[0] ||
      (formData.fileName
        ? `leads@${formData.fileName.replace(/[^a-zA-Z0-9]/g, '')}.com`
        : 'aarav.mehta@northwind.io');

    const recipients =
      formData.toEmails.length > 0
        ? formData.toEmails.map((e) => ({ email: e }))
        : [{ email: primaryRecipient }];

    // If backend is connected, dispatch to real BullMQ queue via REST
    if (isBackendConnected) {
      try {
        const result = await realtimeClient.scheduleCampaign({
          fromEmail: formData.fromEmail || 'alex.morgan@reachinbox.ai',
          fromName: formData.fromName || 'Alex Morgan',
          subject: formData.subject,
          bodyHtml: formData.bodyHtml || formData.body,
          recipients,
          delaySeconds: Number(formData.delaySeconds) || 2,
          hourlyLimit: Number(formData.hourlyLimit) || 50,
          startTimeIso: formData.startTime || new Date().toISOString(),
        });

        if (result.success && result.emails && result.emails.length > 0) {
          const newItems: EmailItem[] = result.emails.map((e: any) => ({
            id: e.id,
            email: e.email,
            company: e.email.split('@')[1]?.split('.')[0] || 'Company',
            avatarText: e.email.slice(0, 2).toUpperCase(),
            tag: formData.fileName ? 'Bulk Campaign' : 'Direct Outreach',
            subject: formData.subject,
            scheduledTime: new Date(e.scheduledAt).toLocaleString(),
            status: 'Scheduled',
            bodySnippet: formData.body.slice(0, 80) + '...',
          }));

          setScheduledEmails((prev) => [...newItems, ...prev]);
          setScheduledTotal((prev) => prev + newItems.length);
          addToast(
            'success',
            `🚀 ${newItems.length} email(s) successfully queued in BullMQ (Neon DB)!`
          );
          return;
        }
      } catch (err: any) {
        console.warn('Backend campaign schedule failed:', err);
      }
    }

    // Fallback if backend temporarily disconnected
    const newEmailItem: EmailItem = {
      id: `sch-${Date.now()}`,
      email: primaryRecipient,
      company: 'Outbound Target',
      avatarText: primaryRecipient.slice(0, 2).toUpperCase(),
      tag: formData.fileName ? 'Bulk Campaign' : 'Direct Outreach',
      subject: formData.subject,
      scheduledTime: new Date().toLocaleString(),
      status: 'Scheduled',
      bodySnippet: formData.body.slice(0, 80) + '...',
    };

    setScheduledEmails((prev) => [newEmailItem, ...prev]);
    setScheduledTotal((prev) => prev + totalCount);
    addToast(
      'success',
      `${totalCount} email${totalCount > 1 ? 's' : ''} scheduled from ${
        formData.fromEmail || 'Alex Morgan'
      }.`
    );
  };

  // If user is logged out, show Login / Create Account Screen
  if (!isLoggedIn) {
    return (
      <div className="relative min-h-screen">
        <LoginScreen
          onLogin={(userData) => {
            if (userData) {
              setUser(userData);
            }
            setIsLoggedIn(true);
            addToast('success', `Welcome back, ${userData?.name || 'Alex'}!`);
          }}
        />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast Notification Layer */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSearchQuery('');
          setCurrentPage(1);
        }}
        scheduledCount={scheduledTotal}
        sentCount={sentTotal}
        isSlackConnected={isSlackConnected}
        onToggleSlack={handleToggleSlack}
        userName={user.name}
        userEmail={user.email}
        onLogout={() => {
          setIsLoggedIn(false);
        }}
        onComposeClick={() => setIsComposeOpen(true)}
        bullmqUrl={`${backendUrl}/admin/queues`}
        etherealUrl={latestEtherealUrl}
        isBackendConnected={isBackendConnected}
        onOpenBackendEngine={() => setIsBackendModalOpen(true)}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        {/* Top Header - Minimal & Lightweight */}
        <Header
          userName={user.name}
          userEmail={user.email}
          onLogout={() => {
            setIsLoggedIn(false);
          }}
        />

        {/* Content Body */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1360px] w-full mx-auto pb-16">
          {/* Overview Metric Cards */}
          <MetricCards
            scheduledCount={scheduledTotal}
            sentCount={sentTotal}
          />

          {/* Tabs & Toolbar */}
          <TabsToolbar
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              setSearchQuery('');
              setCurrentPage(1);
            }}
            scheduledCount={scheduledTotal}
            sentCount={sentTotal}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
            onComposeClick={() => {
              setIsComposeOpen(true);
            }}
            isLoading={isLoading}
          />

          {/* Data Table Card */}
          <DataTable
            activeTab={activeTab}
            emails={paginatedEmails}
            totalCount={activeTotalCount}
            isLoading={isLoading}
            isError={isTableError}
            onRetry={() => {
              setIsTableError(false);
              setIsLoading(true);
              setTimeout(() => {
                setIsLoading(false);
              }, 600);
            }}
            onComposeClick={() => {
              setIsComposeOpen(true);
            }}
            onSwitchToScheduled={() => {
              setActiveTab('scheduled');
              setSearchQuery('');
            }}
            onPreviewEmail={(email) => setPreviewEmail(email)}
            currentPage={currentPage}
            rowsPerPage={rowsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
            onRowsPerPageChange={(limit) => {
              setRowsPerPage(limit);
              setCurrentPage(1);
            }}
          />
        </main>
      </div>

      {/* Compose New Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSchedule={handleScheduleEmail}
      />

      {/* Email Preview Drawer / Modal */}
      <EmailPreviewModal email={previewEmail} onClose={() => setPreviewEmail(null)} />

      {/* Real-time Backend Engine Configuration & Guide Modal */}
      <BackendIntegrationModal
        isOpen={isBackendModalOpen}
        onClose={() => setIsBackendModalOpen(false)}
        isConnected={isBackendConnected}
        backendUrl={backendUrl}
        onUpdateBackendUrl={(url) => {
          setBackendUrl(url);
          realtimeClient.setBackendUrl(url);
          addToast('success', `Backend target set to ${url}. Attempting WebSocket connection...`);
        }}
        onSimulateRealtimeDelivery={handleSimulateRealtimeDelivery}
      />
    </div>
  );
}
