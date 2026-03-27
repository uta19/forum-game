import { create } from "zustand";
import { Message, POSTS, Post, NPC_COMMENTS, NPC_NAMES, NPC_AVATARS } from "./data";

const IP_LOCATIONS = [
  "北京", "上海", "广东", "浙江", "江苏", "四川", "湖北",
  "福建", "山东", "河南", "湖南", "重庆", "陕西", "辽宁",
  "天津", "安徽", "海南", "云南", "贵州", "广西",
];

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
  likeMessage: (postId: string, msgId: string) => void;
}

let _id = 0;
const uid = () => `msg-${Date.now()}-${++_id}`;
const randomIp = () => IP_LOCATIONS[Math.floor(Math.random() * IP_LOCATIONS.length)];

export const useGameStore = create<GameState>((set, get) => ({
  posts: POSTS,
  messages: {},
  stages: {},
  loading: {},

  addMessage: (postId, msg) =>
    set((s) => {
      const existing = s.messages[postId] || [];
      return {
        messages: {
          ...s.messages,
          [postId]: [...existing, { ...msg, floor: existing.length + 1 }],
        },
      };
    }),

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
      floor: 0,
      likes: Math.floor(Math.random() * 20),
      ip: randomIp(),
    };
    get().addMessage(postId, msg);
  },

  likeMessage: (postId, msgId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [postId]: (s.messages[postId] || []).map((m) =>
          m.id === msgId ? { ...m, likes: m.likes + 1 } : m
        ),
      },
    })),
}));
