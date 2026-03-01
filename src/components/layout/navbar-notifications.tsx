"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn, formatDate } from "@/lib/utils";

type NotificationEventType = "comment" | "reaction" | "reply" | "review" | "mention" | "poll_vote" | "report_update";
type NotificationView = "active" | "archived";

interface NotificationItem {
	archived_at: string | null;
	body: string;
	created_at: string;
	event_type: NotificationEventType;
	id: string;
	link_path: string;
	read_at: string | null;
	title: string;
}

interface NotificationsResponse {
	notifications: NotificationItem[];
	unread_count: number;
	view?: NotificationView;
}

interface NavbarNotificationsProps {
	mobile?: boolean;
	userId: string;
}

function normalizeNotification(row: Record<string, unknown>): NotificationItem | null {
	if (
		typeof row.id !== "string" ||
		typeof row.event_type !== "string" ||
		typeof row.title !== "string" ||
		typeof row.body !== "string" ||
		typeof row.link_path !== "string" ||
		typeof row.created_at !== "string"
	) {
		return null;
	}

	if (
		row.event_type !== "comment" &&
		row.event_type !== "reaction" &&
		row.event_type !== "reply" &&
		row.event_type !== "review" &&
		row.event_type !== "mention" &&
		row.event_type !== "poll_vote" &&
		row.event_type !== "report_update"
	) {
		return null;
	}

	return {
		id: row.id,
		event_type: row.event_type,
		title: row.title,
		body: row.body,
		link_path: row.link_path,
		created_at: row.created_at,
		read_at: typeof row.read_at === "string" ? row.read_at : null,
		archived_at: typeof row.archived_at === "string" ? row.archived_at : null,
	};
}

export function NavbarNotifications({ userId, mobile = false }: NavbarNotificationsProps) {
	const { locale, t } = useAppPreferences();
	const router = useRouter();
	const rootRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [markingAll, setMarkingAll] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const [view, setView] = useState<NotificationView>("active");
	const [workingId, setWorkingId] = useState<string | null>(null);
	const [items, setItems] = useState<NotificationItem[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);

	const eventLabelLookup = useMemo(
		() => ({
			review: t("notifications.event.review"),
			comment: t("notifications.event.comment"),
			reply: t("notifications.event.reply"),
			reaction: t("notifications.event.reaction"),
			mention: t("notifications.event.mention"),
			poll_vote: t("notifications.event.pollVote"),
			report_update: t("notifications.event.reportUpdate"),
		}),
		[t],
	);

	const loadNotifications = useCallback(async (nextView: NotificationView) => {
		setLoading(true);
		setActionError(null);
		const response = await fetch(`/api/notifications?limit=20&view=${nextView}`, { method: "GET" }).catch(() => null);

		if (!response?.ok) {
			setItems([]);
			setUnreadCount(0);
			setLoading(false);
			return;
		}

		const body = (await response.json().catch(() => ({}))) as Partial<NotificationsResponse>;
		setItems(Array.isArray(body.notifications) ? body.notifications : []);
		setUnreadCount(typeof body.unread_count === "number" ? body.unread_count : 0);
		setLoading(false);
	}, []);

	useEffect(() => {
		void loadNotifications(view);
	}, [view, loadNotifications]);

	useEffect(() => {
		if (!open) return;

		function onMouseDown(event: MouseEvent) {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		}

		function onKeydown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setOpen(false);
				triggerRef.current?.focus();
			}
		}

		document.addEventListener("mousedown", onMouseDown);
		document.addEventListener("keydown", onKeydown);

		return () => {
			document.removeEventListener("mousedown", onMouseDown);
			document.removeEventListener("keydown", onKeydown);
		};
	}, [open]);

	useEffect(() => {
		const supabase = createSupabaseBrowserClient();
		const channel = supabase
			.channel(`notifications:${userId}`)
			.on(
				"postgres_changes",
				{ event: "INSERT", schema: "public", table: "user_notifications", filter: `recipient_id=eq.${userId}` },
				(payload) => {
					const notification = normalizeNotification(payload.new as Record<string, unknown>);
					if (!notification) return;

					const isActive = !notification.archived_at;
					if (isActive === (view === "active")) {
						setItems((previous) => [notification, ...previous.filter((item) => item.id !== notification.id)].slice(0, 20));
					}

					if (isActive && !notification.read_at) {
						setUnreadCount((count) => count + 1);
					}
				},
			)
			.on(
				"postgres_changes",
				{ event: "UPDATE", schema: "public", table: "user_notifications", filter: `recipient_id=eq.${userId}` },
				(payload) => {
					const updated = normalizeNotification(payload.new as Record<string, unknown>);
					if (!updated) return;

					const previousReadAt = typeof payload.old?.read_at === "string" ? payload.old.read_at : null;
					const previousArchivedAt = typeof payload.old?.archived_at === "string" ? payload.old.archived_at : null;
					const wasUnreadActive = !previousReadAt && !previousArchivedAt;
					const isUnreadActive = !updated.read_at && !updated.archived_at;

					if (wasUnreadActive && !isUnreadActive) {
						setUnreadCount((count) => Math.max(0, count - 1));
					}
					if (!wasUnreadActive && isUnreadActive) {
						setUnreadCount((count) => count + 1);
					}

					const matchesView = view === "active" ? !updated.archived_at : Boolean(updated.archived_at);
					setItems((previous) => {
						if (!matchesView) {
							return previous.filter((item) => item.id !== updated.id);
						}

						if (previous.some((item) => item.id === updated.id)) {
							return previous.map((item) => (item.id === updated.id ? updated : item));
						}

						return [updated, ...previous].slice(0, 20);
					});
				},
			)
			.on(
				"postgres_changes",
				{ event: "DELETE", schema: "public", table: "user_notifications", filter: `recipient_id=eq.${userId}` },
				(payload) => {
					const oldReadAt = typeof payload.old?.read_at === "string" ? payload.old.read_at : null;
					const oldArchivedAt = typeof payload.old?.archived_at === "string" ? payload.old.archived_at : null;
					if (!oldReadAt && !oldArchivedAt) {
						setUnreadCount((count) => Math.max(0, count - 1));
					}
					const oldId = typeof payload.old?.id === "string" ? payload.old.id : null;
					if (!oldId) return;
					setItems((previous) => previous.filter((item) => item.id !== oldId));
				},
			)
			.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
	}, [userId, view]);

	async function markOneAsRead(notificationId: string) {
		const response = await fetch(`/api/notifications/${notificationId}/read`, {
			method: "PATCH",
		}).catch(() => null);

		if (!response?.ok) {
			return;
		}

		setItems((previous) =>
			previous.map((item) =>
				item.id === notificationId ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item,
			),
		);
		setUnreadCount((count) => Math.max(0, count - 1));
	}

	async function archiveNotification(notificationId: string) {
		setWorkingId(notificationId);
		setActionError(null);
		const target = items.find((item) => item.id === notificationId) ?? null;
		const response = await fetch(`/api/notifications/${notificationId}/archive`, { method: "PATCH" }).catch(() => null);
		if (!response?.ok) {
			setActionError(t("notifications.actionFailed"));
			setWorkingId(null);
			return;
		}

		setItems((previous) => previous.filter((item) => item.id !== notificationId));
		if (target && !target.read_at && !target.archived_at) {
			setUnreadCount((count) => Math.max(0, count - 1));
		}
		setWorkingId(null);
	}

	async function unarchiveNotification(notificationId: string) {
		setWorkingId(notificationId);
		setActionError(null);
		const response = await fetch(`/api/notifications/${notificationId}/unarchive`, { method: "PATCH" }).catch(() => null);
		if (!response?.ok) {
			setActionError(t("notifications.actionFailed"));
			setWorkingId(null);
			return;
		}

		setItems((previous) => previous.filter((item) => item.id !== notificationId));
		setWorkingId(null);
	}

	async function deleteNotification(notificationId: string) {
		setWorkingId(notificationId);
		setActionError(null);
		const target = items.find((item) => item.id === notificationId) ?? null;
		const response = await fetch(`/api/notifications/${notificationId}`, { method: "DELETE" }).catch(() => null);
		if (!response?.ok) {
			setActionError(t("notifications.actionFailed"));
			setWorkingId(null);
			return;
		}

		setItems((previous) => previous.filter((item) => item.id !== notificationId));
		if (target && !target.read_at && !target.archived_at) {
			setUnreadCount((count) => Math.max(0, count - 1));
		}
		setWorkingId(null);
	}

	async function markAllAsRead() {
		if (markingAll || unreadCount === 0) return;
		setMarkingAll(true);

		const response = await fetch("/api/notifications/read-all", {
			method: "POST",
		}).catch(() => null);

		if (response?.ok) {
			const now = new Date().toISOString();
			setItems((previous) => previous.map((item) => ({ ...item, read_at: item.read_at ?? now })));
			setUnreadCount(0);
		}

		setMarkingAll(false);
	}

	async function onNotificationClick(item: NotificationItem) {
		if (view === "active" && !item.read_at) {
			await markOneAsRead(item.id);
		}

		setOpen(false);
		router.push(item.link_path);
	}

	return (
		<div ref={rootRef} className={cn("relative", mobile && "w-full")}>
			<button
				ref={triggerRef}
				type="button"
				onClick={() => setOpen((current) => !current)}
				className={cn(
					"relative inline-flex h-10 items-center rounded-lg border border-(--border) bg-(--surface) text-foreground transition hover:bg-(--sand)/15",
					mobile ? "w-full justify-between px-3" : "w-10 justify-center",
				)}
				aria-label={t("notifications.title")}
				aria-expanded={open}
				aria-haspopup="menu"
			>
				<span className="inline-flex items-center gap-2">
					<Bell size={16} />
					{mobile ? <span className="text-sm font-semibold">{t("notifications.title")}</span> : null}
				</span>
				{unreadCount > 0 ? (
					<span
						className={cn(
							"inline-flex min-w-4 items-center justify-center rounded-full bg-(--danger) px-1 text-[10px] font-semibold text-white",
							mobile ? "static" : "absolute -top-1 -right-1",
						)}
					>
						{unreadCount > 99 ? "99+" : unreadCount}
					</span>
				) : null}
			</button>

			{open ? (
				<div
					role="menu"
					className={cn(
						"rounded-xl border border-(--border) bg-(--surface-elevated) p-3 shadow-[0_18px_40px_-22px_var(--overlay)]",
						mobile ? "mt-2 w-full" : "absolute right-0 top-11 z-130 w-88 max-w-[calc(100vw-1.5rem)]",
					)}
				>
					<div className="mb-2 flex items-center justify-between gap-2">
						<div>
							<p className="text-sm font-semibold text-(--espresso)">{t("notifications.title")}</p>
							<p className="text-xs text-(--muted)">
								{t("notifications.unreadCount")} {unreadCount}
							</p>
						</div>
						<button
							type="button"
							onClick={markAllAsRead}
							disabled={markingAll || unreadCount === 0 || view !== "active"}
							className="rounded-md px-2 py-1 text-xs font-semibold text-(--accent) hover:bg-(--sand)/20 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{markingAll ? `${t("notifications.markAll")}...` : t("notifications.markAll")}
						</button>
					</div>

					<div className="mb-2 inline-flex rounded-lg border border-(--border) bg-(--surface) p-1">
						<button
							type="button"
							onClick={() => setView("active")}
							className={cn(
								"rounded-md px-2.5 py-1 text-xs font-semibold transition",
								view === "active" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted) hover:bg-(--sand)/20",
							)}
						>
							{t("notifications.activeTab")}
						</button>
						<button
							type="button"
							onClick={() => setView("archived")}
							className={cn(
								"rounded-md px-2.5 py-1 text-xs font-semibold transition",
								view === "archived" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted) hover:bg-(--sand)/20",
							)}
						>
							{t("notifications.archivedTab")}
						</button>
					</div>

					<div className="max-h-96 space-y-2 overflow-y-auto pr-1">
						{loading ? (
							<p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-(--muted)">
								{t("notifications.loading")}
							</p>
						) : items.length === 0 ? (
							<p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-(--muted)">
								{t("notifications.empty")}
							</p>
						) : (
							items.map((item) => (
								<div
									key={item.id}
									className={cn(
										"rounded-lg border px-3 py-2 text-left transition",
										item.read_at ? "border-(--border) bg-(--surface)" : "border-(--accent)/45 bg-(--accent)/5",
									)}
								>
									<div className="mb-1 flex items-center justify-between gap-2">
										<span className="text-[11px] font-semibold uppercase tracking-wide text-(--muted)">
											{eventLabelLookup[item.event_type]}
										</span>
										<span className="text-[11px] text-(--muted)">{formatDate(item.created_at, locale)}</span>
									</div>
									<button
										type="button"
										onClick={() => void onNotificationClick(item)}
										className="w-full rounded-md text-left transition hover:bg-(--sand)/10"
									>
										<p className="text-sm font-semibold text-(--espresso)">{item.title}</p>
										<p className="mt-1 line-clamp-2 text-xs text-(--muted)">{item.body}</p>
									</button>
									<div className="mt-2 flex items-center justify-end gap-2">
										{view === "active" ? (
											<button
												type="button"
												onClick={() => void archiveNotification(item.id)}
												disabled={workingId === item.id}
												className="rounded-md border px-2 py-1 text-[11px] font-semibold text-(--muted) transition hover:bg-(--sand)/20 disabled:opacity-60"
											>
												{t("notifications.archive")}
											</button>
										) : (
											<button
												type="button"
												onClick={() => void unarchiveNotification(item.id)}
												disabled={workingId === item.id}
												className="rounded-md border px-2 py-1 text-[11px] font-semibold text-(--muted) transition hover:bg-(--sand)/20 disabled:opacity-60"
											>
												{t("notifications.unarchive")}
											</button>
										)}
										<button
											type="button"
											onClick={() => void deleteNotification(item.id)}
											disabled={workingId === item.id}
											className="rounded-md border border-(--danger)/50 px-2 py-1 text-[11px] font-semibold text-(--danger) transition hover:bg-(--danger)/10 disabled:opacity-60"
										>
											{t("notifications.delete")}
										</button>
									</div>
								</div>
							))
						)}
					</div>
					{actionError ? <p className="mt-2 text-xs text-(--danger)">{actionError}</p> : null}
				</div>
			) : null}
		</div>
	);
}
