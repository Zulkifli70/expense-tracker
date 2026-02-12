import { createSharedComposable } from "@vueuse/core";
import type { Notification } from "~/types";

const _useDashboard = () => {
  const route = useRoute();
  const router = useRouter();
  const isNotificationsSlideoverOpen = ref(false);
  const notifications = useState<Notification[]>("dashboard-notifications", () => []);

  const unreadNotificationsCount = computed(
    () => notifications.value.filter((item) => item.unread).length,
  );

  const pushNotification = (
    notification: Pick<Notification, "body"> & {
      senderName?: string;
      senderAvatarSrc?: string;
      date?: string;
      to?: string;
    },
  ) => {
    const nextId =
      (notifications.value[0]?.id || 0) + 1;

    notifications.value.unshift({
      id: nextId,
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
  };

  const markNotificationAsRead = (id: number) => {
    notifications.value = notifications.value.map((item) =>
      item.id === id ? { ...item, unread: false } : item,
    );
  };

  defineShortcuts({
    "g-h": () => router.push("/"),
    "g-i": () => router.push("/inbox"),
    "g-c": () => router.push("/customers"),
    "g-s": () => router.push("/settings"),
    n: () => (isNotificationsSlideoverOpen.value = !isNotificationsSlideoverOpen.value),
  });

  watch(() => route.fullPath, () => {
    isNotificationsSlideoverOpen.value = false;
  });

  return {
    isNotificationsSlideoverOpen,
    notifications,
    unreadNotificationsCount,
    pushNotification,
    markNotificationAsRead,
  };
};

export const useDashboard = createSharedComposable(_useDashboard);
