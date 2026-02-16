import { createSharedComposable } from "@vueuse/core";
import type { Notification } from "~/types";

const _useDashboard = () => {
  const route = useRoute();
  const router = useRouter();
  const isNotificationsSlideoverOpen = ref(false);
  const notifications = useState<Notification[]>(
    "dashboard-notifications",
    () => [],
  );
  const notificationsLoaded = useState<boolean>(
    "dashboard-notifications-loaded",
    () => false,
  );
  const notificationsLoading = ref(false);

  const unreadNotificationsCount = computed(
    () => notifications.value.filter((item) => item.unread).length,
  );

  const normalizeNotification = (notification: Notification): Notification => ({
    ...notification,
    unread: !!notification.unread,
  });

  const fetchNotifications = async (force = false) => {
    if (notificationsLoading.value) return;
    if (notificationsLoaded.value && !force) return;

    notificationsLoading.value = true;
    try {
      const rows = await $fetch<Notification[]>("/api/notifications");
      notifications.value = rows.map(normalizeNotification);
      notificationsLoaded.value = true;
    } catch {
      if (!notificationsLoaded.value) {
        notifications.value = [];
      }
    } finally {
      notificationsLoading.value = false;
    }
  };

  const pushNotification = async (
    notification: Pick<Notification, "body"> & {
      senderName?: string;
      senderAvatarSrc?: string;
      date?: string;
      to?: string;
    },
  ) => {
    try {
      const created = await $fetch<Notification>("/api/notifications", {
        method: "POST",
        body: {
          body: notification.body,
          senderName: notification.senderName,
          senderAvatarSrc: notification.senderAvatarSrc,
          date: notification.date,
          to: notification.to,
        },
      });
      notifications.value.unshift(normalizeNotification(created));
      notificationsLoaded.value = true;
    } catch {
      notifications.value.unshift({
        id: `local-${Date.now()}`,
        unread: true,
        sender: {
          name: notification.senderName || "Expense Tracker",
          avatar: notification.senderAvatarSrc
            ? { src: notification.senderAvatarSrc }
            : undefined,
        },
        body: notification.body,
        date: notification.date || new Date().toISOString(),
        to: notification.to,
      });
    }
  };

  const markNotificationAsRead = async (id: string) => {
    const target = notifications.value.find((item) => item.id === id);
    if (!target || !target.unread) return;

    notifications.value = notifications.value.map((item) =>
      item.id === id ? { ...item, unread: false } : item,
    );

    try {
      await $fetch("/api/notifications", {
        method: "PATCH",
        body: { id },
      });
    } catch {
      notifications.value = notifications.value.map((item) =>
        item.id === id ? { ...item, unread: true } : item,
      );
    }
  };

  defineShortcuts({
    "g-h": () => router.push("/"),
    "g-i": () => router.push("/inbox"),
    "g-c": () => router.push("/customers"),
    "g-s": () => router.push("/settings"),
    n: () =>
      (isNotificationsSlideoverOpen.value =
        !isNotificationsSlideoverOpen.value),
  });

  watch(
    () => route.fullPath,
    () => {
      isNotificationsSlideoverOpen.value = false;
    },
  );

  if (import.meta.client) {
    onMounted(() => {
      void fetchNotifications();
    });
  }

  return {
    isNotificationsSlideoverOpen,
    notifications,
    unreadNotificationsCount,
    fetchNotifications,
    pushNotification,
    markNotificationAsRead,
  };
};

export const useDashboard = createSharedComposable(_useDashboard);
