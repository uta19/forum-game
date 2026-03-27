import { create } from "zustand";
import { Message, POSTS, Post, NPC_COMMENTS, NPC_NAMES, NPC_AVATARS } from "./data";

interface GameState {
  posts: Post[];
  messages: Record<string, Message[]>;
  stages: Record<string, number>;
  loading: Record<string, boolean>;
  addMessage: (postId: string, msg: Message) => void;
  setLoading: (postId: string, loading: boolean) => void;
  advanceStage: (postId: string) => void;
  getStage: (postId: string) => number;
  addNpcComment: (postId: string) => void;
}

let _id = 0;
const uid = () => `msg-${Date.now()}-${++_id}`;

export const useGameStore = create<GameState>((set, get) => ({
  posts: POSTS,
  messages: {},
  stages: {},
  loading: {},

  addMessage: (postId, msg) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [postId]: [...(s.messages[postId] || []), msg],
      },
    })),

  setLoading: (postId, loading) =>
    set((s) => ({ loading: { ...s.loading, [postId]: loading } })),

  advanceStage: (postId) =>
    set((s) => {
      const post = POSTS.find((p) => p.id === postId);
      const maxStage = post ? post.stages.length - 1 : 2;
      return {
        stages: { ...s.stages, [postId]: Math.min((s.stages[postId] || 0) + 1, maxStage) },
      };
    }),

  getStage: (postId) => get().stages[postId] || 0,

  addNpcComment: (postId) => {
    const comment = NPC_COMMENTS[Math.floor(Math.random() * NPC_COMMENTS.length)];
    const nameIdx = Math.floor(Math.random() * NPC_NAMES.length);
    const msg: Message = {
      id: uid(),
      role: "npc",
      author: NPC_NAMES[nameIdx],
      avatar: NPC_AVATARS[nameIdx],
      content: comment,
      timestamp: Date.now(),
    };
    get().addMessage(postId, msg);
  },
}));
