# Frontend Design Skill

## Trigger
When user asks to design or redesign a UI page/component.

## Process

### 1. Reference Materials
- Check Figma design: `https://www.figma.com/make/4sQX2lzfet9HzKYLYstkSq/`
- Read `docs/01-system-design/frontend/ui-guidelines.md`
- Read `docs/01-system-design/frontend/screen-inventory.md`
- Check existing components in `src/components/`

### 2. Design System

#### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#1e3a8a` | Buttons, active states, sidebar |
| Primary Light | `#3b82f6` | Gradients, hover |
| Background | `#f5f5f7` | Page background |
| Surface | `#ffffff` | Cards |
| Text | gray-900, gray-500, gray-400 | Primary, secondary, tertiary |

#### Typography
- Font: Noto Sans JP
- Title: text-2xl font-bold
- Body: text-sm/text-base
- Caption: text-xs text-gray-400

#### Components
- Cards: `bg-white rounded-xl shadow-sm border border-gray-200 p-5`
- Buttons: `bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white`
- Avatar gradient: `from-[#1e3a8a] to-[#3b82f6]`
- Avatar CDN: `https://ondo-metal.sgp1.cdn.digitaloceanspaces.com/avatars/{lastNumber}.jpg`

#### Layout
- Sidebar: 256px (desktop), 64px (tablet), bottom nav (mobile)
- Content: max-w-2xl mx-auto for timeline
- Right sidebar: w-80 (desktop only)

### 3. Responsive Breakpoints
- Mobile: < 768px (md) — single column, bottom nav
- Tablet: 768-1024px — collapsed sidebar (64px)
- Desktop: > 1024px (lg) — full 3-column layout

### 4. Existing UI Components (shadcn/ui)
Button, Card, Dialog, Input, Textarea, Avatar, Badge, Tabs, Calendar,
Dropdown, Skeleton, Separator, ScrollArea, Label, Tooltip, Checkbox, Toast

### 5. Implementation
- Use existing shadcn/ui components, don't create new ones unless necessary
- All text in Japanese (日本語)
- Responsive: mobile-first approach
- Use Tailwind CSS utility classes
- Follow Facebook-inspired design patterns for social features
- Media gallery: Facebook-style grid (1/2/3/4/5+ images)
- Video player: inline with auto-play muted, controls

### 6. App Identity
- App name: 日報
- Company: 音頭金属株式会社
- Logo: `/images/logo.jpg`
