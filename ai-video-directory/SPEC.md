# AI Video Generation Models Directory - Specification

## 1. Project Overview

**Project Name:** AI Video Gen Directory  
**Project Type:** Static website (single HTML file)  
**Core Functionality:** A curated directory showcasing the best AI video generation models available, with detailed information about each tool.  
**Target Users:** Content creators, marketers, filmmakers, and tech enthusiasts looking for AI video generation solutions.

---

## 2. UI/UX Specification

### Layout Structure

**Header:**
- Fixed navigation bar at the top
- Logo/brand name on the left
- Navigation links on the right (Home, Models, About)
- Height: 70px

**Hero Section:**
- Full-width hero with background gradient
- Main headline and subheadline
- Search bar for filtering tools
- Height: ~400px

**Models Grid:**
- Responsive grid layout
- 3 columns on desktop (>1024px)
- 2 columns on tablet (768px-1024px)
- 1 column on mobile (<768px)
- Card-based design for each model

**Footer:**
- Simple footer with copyright
- Height: 80px

### Visual Design

**Color Palette:**
- Background Primary: `#0a0a0f` (near black)
- Background Secondary: `#12121a` (dark navy)
- Card Background: `#1a1a24` (dark card)
- Primary Accent: `#00d4ff` (cyan)
- Secondary Accent: `#7c3aed` (violet)
- Gradient: `linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)`
- Text Primary: `#ffffff`
- Text Secondary: `#a0a0b0`
- Border Color: `#2a2a3a`

**Typography:**
- Headings Font: "Syne", sans-serif (Google Fonts)
- Body Font: "DM Sans", sans-serif (Google Fonts)
- Hero Title: 56px, bold
- Section Title: 36px, bold
- Card Title: 22px, semibold
- Body Text: 16px, regular
- Small Text: 14px, regular

**Spacing System:**
- Section Padding: 80px vertical
- Card Padding: 24px
- Grid Gap: 24px
- Container Max Width: 1200px

**Visual Effects:**
- Card hover: translateY(-8px) with box-shadow
- Gradient border on hover for cards
- Smooth transitions: 0.3s ease
- Subtle glow effect on accent elements

### Components

**Navigation Bar:**
- Transparent background, becomes solid on scroll
- Logo with gradient text effect
- Nav links with hover underline animation

**Hero Section:**
- Animated gradient background
- Floating geometric shapes (CSS only)
- Search input with icon

**Model Card:**
- Logo/icon area (80x80px)
- Model name
- Description (2-3 lines)
- Feature tags (pill-shaped)
- Pricing indicator (Free/Freemium/Paid)
- "Learn More" button with gradient border
- Hover state with glow effect

**Search/Filter:**
- Search input with filter icon
- Real-time filtering of cards

---

## 3. Functionality Specification

### Core Features

1. **Display Directory:**
   - Show 12 AI video generation models
   - Each card displays: logo, name, description, features, pricing

2. **Search Functionality:**
   - Filter models by name in real-time
   - Case-insensitive search

3. **Responsive Design:**
   - Fully responsive across all devices
   - Mobile-friendly navigation

4. **Smooth Animations:**
   - Page load animations
   - Hover effects on cards
   - Scroll-triggered fade-in

### User Interactions

- Click "Learn More" opens model website in new tab
- Search filters cards instantly as user types
- Cards animate on hover

### Data (AI Video Generation Models to Include)

1. **Sora** - OpenAI's text-to-video model
2. **Runway Gen-2** - Advanced video generation
3. **Pika** - AI video generation platform
4. **Luma Dream Machine** - Photorealistic video AI
5. **Kling AI** - Chinese video generation
6. **Runway Gen-3** - Latest generation model
7. **Haiper** - AI video creation tool
8. **Pika Labs** - Text and image to video
9. **Leonardo AI** - Video generation capability
10. **Meta Movie Gen** - Meta's video AI
11. **Google Veo** - Google's video generation
12. **Stable Video** - Stability AI's video model

### Edge Cases
- Empty search results: Show "No models found" message
- Long descriptions: Truncate with ellipsis

---

## 4. Acceptance Criteria

1. ✅ Page loads with all 12 AI video models displayed
2. ✅ Hero section displays with gradient background and search bar
3. ✅ Search functionality filters models in real-time
4. ✅ Cards have hover animation (lift + glow)
5. ✅ Responsive: 3 cols desktop, 2 cols tablet, 1 col mobile
6. ✅ All external links open in new tabs
7. ✅ Typography uses Syne and DM Sans fonts
8. ✅ Color scheme matches specification exactly
9. ✅ Smooth page load animations present
10. ✅ Footer displays at bottom of page
