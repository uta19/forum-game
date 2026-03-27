import { create } from "zustand";
import { Post, Comment, OFFICIAL_POSTS, ZONES as DEFAULT_ZONES } from "./data";

let _id = 0;
const uid = () => `c-${Date.now()}-${++_id}`;

interface ForumState {
  posts: Post[];
  zones: string[];
  loading: Record<string, boolean>;

  addPost: (post: Post) => void;
  addComment: (postId: string, comment: Comment) => void;
  setLoading: (postId: string, v: boolean) => void;
  likeComment: (postId: string, commentId: string) => void;
  getPost: (postId: string) => Post | undefined;
  addZone: (name: string) => void;
}

export const useForumStore = create<ForumState>((set, get) => ({
  posts: [...OFFICIAL_POSTS],
  zones: [...DEFAULT_ZONES],
  loading: {},

  addPost: (post) =>
    set((s) => ({ posts: [...s.posts, post] })),

  addComment: (postId, comment) =>
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
      ),
    })),

  setLoading: (postId, v) =>
    set((s) => ({ loading: { ...s.loading, [postId]: v } })),

  likeComment: (postId, commentId) =>
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: p.comments.map((c) =>
                c.id === commentId ? { ...c, likes: c.likes + 1 } : c
              ),
            }
          : p
      ),
    })),

  getPost: (postId) => get().posts.find((p) => p.id === postId),

  addZone: (name) =>
    set((s) => {
      if (s.zones.includes(name)) return s;
      return { zones: [...s.zones, name] };
    }),
}));

export { uid };
