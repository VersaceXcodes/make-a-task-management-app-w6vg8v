import create from 'zustand';
import { persist } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';

export interface AuthState {
  token: string;
  is_authenticated: boolean;
  user_id: string;
}

export interface UserProfile {
  user_id: string;
  email: string;
  full_name: string | null;
}

export interface UserSetting {
  dark_mode_enabled: boolean;
  timezone_offset: number;
  notif_in_app_enabled: boolean;
  notif_push_enabled: boolean;
}

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface Workspace {
  workspace_id: number;
  workspace_name: string;
  role: WorkspaceRole;
  is_personal: boolean;
}

export interface TaskList {
  task_list_id: number;
  list_name: string;
  workspace_id: number | null;
  user_id: string | null;
  position_order: number;
  incomplete_task_count: number;
}

export interface Tag {
  tag_id: number;
  tag_name: string;
  workspace_id: number | null;
  user_id: string | null;
}

export interface AssignedUser {
  user_id: string;
  full_name: string | null;
  email: string;
}

export interface Task {
  task_id: number;
  task_list_id: number;
  parent_task_id: number | null;
  title: string;
  description: string | null;
  priority: 'Low' | 'Medium' | 'High';
  due_datetime: string | null;
  estimated_effort_mins: number | null;
  status: 'Pending' | 'In Progress' | 'Completed';
  created_by_user_id: string;
  created_at: string;
  updated_at: string | null;
  is_completed: boolean;
  position_order: number;
  is_active: boolean;
  recurring_pattern: string | null;
  recurrence_end_date: string | null;
  recurrence_count: number | null;
  tags: { tag_id: number; tag_name: string }[];
  assigned_users: AssignedUser[];
}

export interface Comment {
  comment_id: number;
  task_id: number;
  user_id: string;
  parent_comment_id: number | null;
  content: string;
  created_at: string;
  updated_at: string | null;
  is_deleted: boolean;
}

export interface ActivityLog {
  activity_id: number;
  workspace_id: number | null;
  task_id: number | null;
  user_id: string;
  activity_type: string;
  details: object | null;
  created_at: string;
}

export type NotificationType =
  | 'reminder'
  | 'assignment'
  | 'comment'
  | 'status_change';

export interface Notification {
  notification_id: number;
  user_id: string;
  related_task_id: number | null;
  notification_type: NotificationType;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface UndoEntry {
  undo_id: number;
  entity_type: 'task' | 'task_assignment' | 'task_list' | 'comment' | 'tag';
  entity_id: string | number;
  created_at: string;
}

export interface LastUndoAction {
  last_action: UndoEntry | null;
}

export interface CurrentContext {
  workspace_id: number | null;
  task_list_id: number | null;
  multi_select_active: boolean;
}

interface AppState {
  // State slices
  auth: AuthState;
  user_profile: UserProfile;
  user_setting: UserSetting;
  workspaces: Workspace[];
  task_lists: TaskList[];
  current_context: CurrentContext;
  tasks: Record<number, Task>;
  selected_tasks: number[];
  tags: Tag[];
  assigned_users: AssignedUser[];
  comments: Record<number, Comment>;
  activity_logs: ActivityLog[];
  notifications: Notification[];
  unread_count: number;
  undo: LastUndoAction;

  // Setters: These setters replace the slice entirely or update fields for objects
  set_auth: (auth: Partial<AuthState>) => void;
  set_user_profile: (profile: Partial<UserProfile>) => void;
  set_user_setting: (setting: Partial<UserSetting>) => void;
  set_workspaces: (workspaces: Workspace[]) => void;
  set_task_lists: (lists: TaskList[]) => void;
  set_current_context: (ctx: Partial<CurrentContext>) => void;
  set_tasks: (tasks: Record<number, Task>) => void;
  set_selected_tasks: (selected: number[]) => void;
  set_tags: (tags: Tag[]) => void;
  set_assigned_users: (users: AssignedUser[]) => void;
  set_comments: (comments: Record<number, Comment>) => void;
  set_activity_logs: (logs: ActivityLog[]) => void;
  set_notifications: (notifs: Notification[]) => void;
  set_unread_count: (count: number) => void;
  set_undo: (undo: LastUndoAction) => void;

  // Socket management
  socket: Socket | null;
  setup_socket: (token: string) => void; // Initializes socket connection
  disconnect_socket: () => void;
}

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/^http/, 'ws')
  : 'ws://localhost:3000';

export const use_app_store = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state defaults
      auth: { token: '', is_authenticated: false, user_id: '' },
      user_profile: { user_id: '', email: '', full_name: null },
      user_setting: {
        dark_mode_enabled: false,
        timezone_offset: 0,
        notif_in_app_enabled: true,
        notif_push_enabled: true,
      },
      workspaces: [],
      task_lists: [],
      current_context: { workspace_id: null, task_list_id: null, multi_select_active: false },
      tasks: {},
      selected_tasks: [],
      tags: [],
      assigned_users: [],
      comments: {},
      activity_logs: [],
      notifications: [],
      unread_count: 0,
      undo: { last_action: null },

      // Socket instance
      socket: null,

      // Setters
      set_auth: (auth) =>
        set((state) => ({
          auth: { ...state.auth, ...auth },
        })),
      set_user_profile: (profile) =>
        set((state) => ({
          user_profile: { ...state.user_profile, ...profile },
        })),
      set_user_setting: (setting) =>
        set((state) => ({
          user_setting: { ...state.user_setting, ...setting },
        })),
      set_workspaces: (workspaces) => set(() => ({ workspaces })),
      set_task_lists: (task_lists) => set(() => ({ task_lists })),
      set_current_context: (current_context) =>
        set((state) => ({
          current_context: { ...state.current_context, ...current_context },
        })),
      set_tasks: (tasks) => set(() => ({ tasks })),
      set_selected_tasks: (selected_tasks) => set(() => ({ selected_tasks })),
      set_tags: (tags) => set(() => ({ tags })),
      set_assigned_users: (assigned_users) => set(() => ({ assigned_users })),
      set_comments: (comments) => set(() => ({ comments })),
      set_activity_logs: (activity_logs) => set(() => ({ activity_logs })),
      set_notifications: (notifications) => {
        // Calculate unread count on setting notifications
        const unread_count = notifications.reduce(
          (acc, n) => (n.is_read ? acc : acc + 1),
          0
        );
        set(() => ({
          notifications,
          unread_count,
        }));
      },
      set_unread_count: (unread_count) => set(() => ({ unread_count })),
      set_undo: (undo) => set({ undo }),

      // Socket initialization and events subscription
      setup_socket: (token) => {
        const existing_socket = get().socket;
        if (existing_socket) {
          existing_socket.disconnect();
        }

        const socket: Socket = io(SOCKET_URL, {
          auth: {
            token: `Bearer ${token}`,
          },
          transports: ['websocket'],
          reconnection: true,
        });

        // Attach event handlers

        socket.on('connect', () => {
          // console.log('Socket connected:', socket.id);
        });

        socket.on('disconnect', () => {
          // console.log('Socket disconnected');
        });

        socket.on('task_created', (task: Task) => {
          set((state) => {
            // Add new task if not exists
            const updated_tasks = { ...state.tasks };
            updated_tasks[task.task_id] = task;
            return { tasks: updated_tasks };
          });
        });

        socket.on('task_updated', (payload: {
          task_id: number;
          updated_fields: Partial<Task>;
          assignments: string[];
          tags: number[];
        }) => {
          set((state) => {
            const task = state.tasks[payload.task_id];
            if (!task) return {};
            const updated_task: Task = {
              ...task,
              ...payload.updated_fields,
              assigned_users: [], // Will be fetched/updated by components later
              tags: [], // Same here, keep empty for components to update
            };
            // Keep old arrays for tags and assigned_users, or clear? Better to clear on update since backend sends them raw.
            return {
              tasks: { ...state.tasks, [payload.task_id]: updated_task },
            };
          });
        });

        socket.on('task_deleted', (data: { task_id: number; is_active: boolean }) => {
          set((state) => {
            if (!(data.task_id in state.tasks)) return {};
            const updated_task = { ...state.tasks[data.task_id], is_active: data.is_active };
            return { tasks: { ...state.tasks, [data.task_id]: updated_task } };
          });
        });

        socket.on(
          'task_assignment_changed',
          (data: { task_id: number; assigned_user_ids: string[] }) => {
            set((state) => {
              const task = state.tasks[data.task_id];
              if (!task) return {};
              // Just update assigned_users list with user_ids and empty full_name/email (components should refresh)
              const new_assigned_users = data.assigned_user_ids.map((uid) => ({
                user_id: uid,
                full_name: null,
                email: '',
              }));
              return {
                tasks: {
                  ...state.tasks,
                  [data.task_id]: { ...task, assigned_users: new_assigned_users },
                },
              };
            });
          }
        );

        socket.on('comment_added', (comment: Comment) => {
          set((state) => {
            const updated_comments = { ...state.comments };
            updated_comments[comment.comment_id] = comment;
            return { comments: updated_comments };
          });
        });

        socket.on('comment_updated', (comment: { comment_id: number; content: string; updated_at: string }) => {
          set((state) => {
            const prev = state.comments[comment.comment_id];
            if (!prev) return {};
            const updated_comment = {
              ...prev,
              content: comment.content,
              updated_at: comment.updated_at,
            };
            return { comments: { ...state.comments, [comment.comment_id]: updated_comment } };
          });
        });

        socket.on('comment_deleted', (data: { comment_id: number; is_deleted: boolean }) => {
          set((state) => {
            const prev = state.comments[data.comment_id];
            if (!prev) return {};
            const updated_comment = { ...prev, is_deleted: data.is_deleted };
            return { comments: { ...state.comments, [data.comment_id]: updated_comment } };
          });
        });

        socket.on('notification_received', (notification: Notification) => {
          set((state) => {
            // Add new notification, update unread count if not read
            const updated_notifications = [...state.notifications];
            updated_notifications.unshift(notification);
            const unread_count = notification.is_read
              ? state.unread_count
              : state.unread_count + 1;
            return { notifications: updated_notifications, unread_count };
          });
        });

        socket.on('activity_log_updated', (activity: ActivityLog) => {
          set((state) => ({
            activity_logs: [activity, ...state.activity_logs],
          }));
        });

        socket.on(
          'undo_action_performed',
          (data: {
            entity_type: string;
            entity_id: number | string;
            data_snapshot: object;
            undone_by_user_id: string;
            created_at: string;
          }) => {
            set((state) => ({
              undo: {
                last_action: {
                  undo_id: -1, // Placeholder as no undo_id from event
                  entity_type: data.entity_type as UndoEntry['entity_type'],
                  entity_id: data.entity_id,
                  created_at: data.created_at,
                },
              },
            }));
          }
        );

        set({ socket });
      },

      disconnect_socket: () => {
        const socket = get().socket;
        if (socket) {
          socket.disconnect();
          set({ socket: null });
        }
      },
    }),
    {
      name: 'taskcraft-app-storage',
      partialize: (state) => ({
        auth: state.auth,
        user_profile: state.user_profile,
        user_setting: state.user_setting,
        workspaces: state.workspaces,
        task_lists: state.task_lists,
        current_context: state.current_context,
        tasks: state.tasks,
        selected_tasks: state.selected_tasks,
        tags: state.tags,
        assigned_users: state.assigned_users,
        comments: state.comments,
        activity_logs: state.activity_logs,
        notifications: state.notifications,
        unread_count: state.unread_count,
        undo: state.undo,
      }),
      // Storage is localStorage by default
    }
  )
);