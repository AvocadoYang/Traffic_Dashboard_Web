import { FC, ReactNode, memo } from "react";
import styled from "styled-components";
import { AvatarChoice, useAvatars } from "@/api/useProfile";

/**
 * 內建頭像: 工業風線條圖示 x 底色, 不能上傳。
 * 圖示是 24x24 的線條 (stroke = currentColor), 底色都夠深, 白色圖示在深淺主題都看得清楚。
 * id 存在後端 (UserInFo.avatar), 改名字就等於換掉別人的頭像, 只能加不能改。
 * 名稱在翻譯檔 profile.avatar_icon.<id> / profile.avatar_color.<id>。
 */

const g = (children: ReactNode) => children;

export const AVATAR_ICONS: { id: string; glyph: ReactNode }[] = [
  {
    id: "forklift",
    glyph: g(
      <>
        <path d="M4 17V9h6l3 4v4" />
        <path d="M13 13h3" />
        <path d="M17 5v12h4" />
        <circle cx="6.5" cy="18" r="1.6" />
        <circle cx="12" cy="18" r="1.6" />
      </>,
    ),
  },
  {
    id: "amr",
    glyph: g(
      <>
        <rect x="3.5" y="8" width="17" height="8" rx="2" />
        <path d="M7 8V6h10v2" />
        <circle cx="7.5" cy="17.5" r="1.4" />
        <circle cx="16.5" cy="17.5" r="1.4" />
        <path d="M10 12h4" />
      </>,
    ),
  },
  {
    id: "hardhat",
    glyph: g(
      <>
        <path d="M4 16a8 8 0 0 1 16 0" />
        <path d="M3 16h18v2H3z" />
        <path d="M10 8.3V6h4v2.3" />
      </>,
    ),
  },
  {
    id: "wrench",
    glyph: g(
      <path d="M14.5 5.5a4 4 0 0 0 4.9 4.9l-8.7 8.7a2 2 0 0 1-2.8-2.8l8.7-8.7a4 4 0 0 0-2.1-2.1z" />,
    ),
  },
  {
    id: "gear",
    glyph: g(
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
      </>,
    ),
  },
  {
    id: "box",
    glyph: g(
      <>
        <path d="M4 8l8-4 8 4v8l-8 4-8-4z" />
        <path d="M4 8l8 4 8-4M12 12v8" />
      </>,
    ),
  },
  {
    id: "pallet",
    glyph: g(
      <>
        <rect x="6" y="5" width="12" height="9" />
        <path d="M3 15h18M3 19h18M5 15v4M12 15v4M19 15v4" />
      </>,
    ),
  },
  {
    id: "conveyor",
    glyph: g(
      <>
        <rect x="3" y="12" width="18" height="5" rx="2.5" />
        <circle cx="6" cy="14.5" r="1" />
        <circle cx="12" cy="14.5" r="1" />
        <circle cx="18" cy="14.5" r="1" />
        <rect x="8" y="6" width="6" height="5" />
      </>,
    ),
  },
  {
    id: "warehouse",
    glyph: g(
      <>
        <path d="M3 10l9-5 9 5v10H3z" />
        <path d="M7 20v-7h10v7M7 16h10" />
      </>,
    ),
  },
  {
    id: "battery",
    glyph: g(
      <>
        <rect x="3" y="7" width="16" height="10" rx="1.5" />
        <path d="M21 10v4" />
        <path d="M11.5 9l-2 3.5h3l-2 3.5" />
      </>,
    ),
  },
  {
    id: "pin",
    glyph: g(
      <>
        <path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z" />
        <circle cx="12" cy="11" r="2.2" />
      </>,
    ),
  },
  {
    id: "clipboard",
    glyph: g(
      <>
        <rect x="5" y="5" width="14" height="16" rx="1.5" />
        <path d="M9 5V3.5h6V5M8.5 11h7M8.5 15h5" />
      </>,
    ),
  },
  {
    id: "shield",
    glyph: g(
      <>
        <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
        <path d="M9 12l2 2 4-4" />
      </>,
    ),
  },
  {
    id: "truck",
    glyph: g(
      <>
        <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
        <circle cx="7" cy="17.5" r="1.6" />
        <circle cx="17" cy="17.5" r="1.6" />
      </>,
    ),
  },
  {
    id: "radar",
    glyph: g(
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 12l5-5" />
      </>,
    ),
  },
  {
    id: "route",
    glyph: g(
      <>
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="6" r="2" />
        <path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6" />
      </>,
    ),
  },
];

export const AVATAR_COLORS: { id: string; value: string }[] = [
  { id: "slate", value: "#334155" },
  { id: "blue", value: "#1d4ed8" },
  { id: "indigo", value: "#4338ca" },
  { id: "teal", value: "#0f766e" },
  { id: "green", value: "#15803d" },
  { id: "amber", value: "#b45309" },
  { id: "orange", value: "#c2410c" },
  { id: "red", value: "#b91c1c" },
];

const ICONS = new Map(AVATAR_ICONS.map((i) => [i.id, i]));
const COLORS = new Map(AVATAR_COLORS.map((c) => [c.id, c]));

const Circle = styled.span<{ $size: number; $bg?: string }>`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: ${({ $bg }) => $bg ?? "var(--c-bg-muted)"};
  color: ${({ $bg }) => ($bg ? "#fff" : "var(--c-text-secondary)")};
  border: ${({ $bg }) => ($bg ? "none" : "1px solid var(--c-border)")};
  font-size: ${({ $size }) => Math.round($size * 0.45)}px;
  font-weight: 600;
  line-height: 1;
  text-transform: uppercase;
  user-select: none;
  vertical-align: middle;

  svg {
    width: 62%;
    height: 62%;
  }
`;

type Props = {
  avatar?: AvatarChoice | null;
  /** 沒有頭像時顯示第一個字 */
  account?: string;
  size?: number;
  title?: string;
};

/** 一個頭像圓; 沒選過頭像 (或 id 不認得) 就顯示帳號的第一個字 */
export const UserAvatar: FC<Props> = memo(({ avatar, account, size = 28, title }) => {
  const icon = avatar ? ICONS.get(avatar.icon) : undefined;
  const color = avatar ? COLORS.get(avatar.color) : undefined;
  if (!icon) {
    return (
      <Circle $size={size} $bg={color?.value} title={title ?? account} aria-hidden={!title}>
        {(account ?? "?").slice(0, 1)}
      </Circle>
    );
  }
  return (
    <Circle $size={size} $bg={color?.value ?? AVATAR_COLORS[0].value} title={title ?? account} aria-hidden={!title}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon.glyph}
      </svg>
    </Circle>
  );
});

/** 依帳號名稱查頭像 (設定變更紀錄、任務歷史、交班留言用) */
export const AccountAvatar: FC<{ account?: string | null; size?: number }> = ({ account, size = 20 }) => {
  const { data } = useAvatars();
  if (!account) return null;
  return <UserAvatar avatar={data?.[account]} account={account} size={size} />;
};

/** 頭像 + 帳號名稱, 一行 */
export const AccountTag: FC<{ account?: string | null; size?: number; children?: ReactNode }> = ({
  account,
  size = 20,
  children,
}) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
    <AccountAvatar account={account} size={size} />
    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {children ?? account}
    </span>
  </span>
);

export default UserAvatar;
