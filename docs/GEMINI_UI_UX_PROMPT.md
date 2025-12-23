# Gemini UI/UX Design Prompt Template

Use this prompt template with Google Gemini to get comprehensive UI/UX design recommendations for the H2O-ACP Dashboard.

---

## Copy-Paste Prompt for Gemini:

```
I'm building a B2B operations dashboard for a plumbing and construction company (H2O Plumbing & All County Construction). I need expert UI/UX design recommendations that will make this tool intuitive, efficient, and professional.

## APPLICATION CONTEXT

**Business Model:**
- Plumbing service company (H2O) + Construction company (All County)
- Multi-tenant SaaS dashboard for operations management
- Users: Field technicians, office staff, managers, admins
- Primary use cases: Job scheduling, service calls, bid management, marketing, customer reviews

**Current Tech Stack:**
- Frontend: Next.js 14 (React), TypeScript, CSS-in-JS (inline styles)
- Backend: FastAPI (Python), PostgreSQL, SQLAlchemy
- Design System: Custom CSS variables (--color-primary, --color-text-primary, etc.)
- Mobile-first responsive design

## ARCHITECTURE OVERVIEW

**Key Modules:**
1. **Dashboard** - Overview with stats, open tasks, overdue items, bid pipeline
2. **Jobs** - Construction job management (All County)
3. **Service Calls** - Plumbing service scheduling (H2O)
4. **Tech Schedule** - Field technician daily schedule view
5. **Bids** - Project bid management with pipeline tracking
6. **Marketing** - Social media content calendar with planned slots
7. **Reviews** - Customer review request management
8. **Users** - Admin user management
9. **Profile** - Self-service account management

**User Roles:**
- **Admin**: Full access, user management, all modules
- **User**: Standard access, can manage assigned work
- **Tech Users** (max, northwynd): Limited to tech schedule only
- **Viewer**: Read-only access

**Data Model Highlights:**
- Multi-tenant (h2o, all_county tenants)
- Jobs have phases, warranty tracking, builder relationships
- Service calls have scheduling, customer info, tech assignment
- Bids have line items, status workflow (Draft → Sent → Won/Lost)
- Marketing has content items, post instances, planned slots with categories
- Reviews have request → review workflow

## CURRENT UI PATTERNS

**Design Language:**
- Dark theme with CSS variables for theming
- Card-based layouts with borders and rounded corners
- Status badges with color coding (green/yellow/red/blue)
- Inline styles (no CSS framework)
- Responsive grid layouts (mobile-first)

**Key Components:**
- PageHeader (title, description, action button)
- StatusBadge (color-coded status indicators)
- Button (primary, secondary, danger, ghost variants)
- Table (responsive, sortable)
- Modal dialogs for forms
- Toast notifications
- Sidebar navigation with role-based items

**Current Pain Points:**
- Some pages feel cluttered (too much information density)
- Inconsistent spacing and typography hierarchy
- Some forms lack clear visual feedback
- Mobile experience could be improved
- Color system could be more systematic

## DESIGN GOALS

**Primary Objectives:**
1. **Efficiency**: Users should complete tasks in minimal clicks
2. **Clarity**: Information hierarchy should be obvious at a glance
3. **Consistency**: Same patterns across all modules
4. **Accessibility**: Works for users with varying technical skills
5. **Mobile-First**: Field technicians use phones/tablets

**User Experience Priorities:**
- Field technicians need quick access to today's schedule
- Office staff need to quickly assign jobs and track status
- Managers need overview dashboards and reporting
- Admins need user management and configuration

**Visual Design Goals:**
- Professional, trustworthy appearance
- Modern but not trendy (needs to age well)
- Clear visual hierarchy
- Consistent spacing system (8px/16px/24px/32px)
- Accessible color contrast
- Intuitive iconography

## SPECIFIC AREAS NEEDING IMPROVEMENT

1. **Dashboard Layout**
   - 3-column layout (Open Tasks | Bids Pipeline | Overdue)
   - Stats cards at top
   - Need better visual hierarchy

2. **Job Details Page**
   - Recently improved but could use more polish
   - 60/40 split layout (main content | sidebar)
   - Status, scheduling, warranty, notes sections

3. **Marketing Calendar**
   - Month/week view toggle
   - Planned slots with category badges
   - Side panel for demand signals
   - Need better visual distinction between planned vs. scheduled posts

4. **Bids Pipeline**
   - Side panel showing sent bids, ready to send, needs approval, drafting
   - Color-coded by status
   - Need better visual flow

5. **Forms & Modals**
   - Inconsistent styling
   - Need better validation feedback
   - Loading states could be improved

## TECHNICAL CONSTRAINTS

- Must use inline styles (no CSS framework)
- CSS variables for theming (--color-primary, --color-text-primary, etc.)
- Must work in Next.js 14
- Must be responsive (mobile, tablet, desktop)
- No external design libraries (Material UI, Tailwind, etc.)
- Must maintain existing component patterns where possible

## REQUEST

Please provide:

1. **Design System Recommendations**
   - Color palette expansion (primary, secondary, success, warning, error, info)
   - Typography scale (headings, body, captions)
   - Spacing system (consistent margins/padding)
   - Component patterns (buttons, cards, forms, tables)

2. **Layout Improvements**
   - Better information architecture
   - Visual hierarchy improvements
   - Responsive breakpoints and patterns

3. **Component Design**
   - Improved form inputs with better states (focus, error, disabled)
   - Better modal designs
   - Enhanced table designs
   - Improved status indicators

4. **User Flow Improvements**
   - Task completion flows
   - Navigation patterns
   - Error handling and feedback

5. **Mobile Optimizations**
   - Touch-friendly targets
   - Mobile navigation patterns
   - Responsive layouts

6. **Accessibility**
   - Color contrast recommendations
   - Keyboard navigation patterns
   - Screen reader considerations

7. **Specific Code Examples**
   - CSS variable definitions
   - Component style patterns
   - Responsive breakpoint examples

Please provide actionable, implementable recommendations with specific CSS/design patterns I can apply immediately. Focus on practical improvements that will make the biggest impact on user experience.

## CURRENT CSS VARIABLES

```css
:root {
  --color-bg: #0D1117;
  --color-card: #161B22;
  --color-hover: #1C2128;
  --color-border: #30363D;
  --color-primary: #60A5FA;
  --color-primary-hover: #3B82F6;
  --color-text-primary: #E6EDF3;
  --color-text-secondary: #8B949E;
}
```

**Current Status Colors:**
- Success/Completed: #4CAF50 (green)
- Warning/Scheduled: #FF9800 (orange)
- Error/Failed: #EF5350 (red)
- Info/Planned: #9C27B0 (purple)
- Neutral/Draft: #60A5FA (blue)

## SPECIFIC UI COMPONENTS TO IMPROVE

**1. Marketing Calendar**
- Month/week view toggle
- Planned slots with category badges (ad_content, team_post, coupon, diy, blog_post)
- Side panel for demand signals
- Need better visual distinction between planned vs. scheduled posts
- Drag-and-drop would be ideal but not required

**2. Bid Pipeline Side Panel**
- Shows: Sent bids, Ready to Send, Needs Price Approval, Drafting
- Color-coded by status
- Clickable cards that navigate to detail page
- Need better visual hierarchy

**3. Dashboard Stats Cards**
- 5 stat cards in grid (Open Tasks, Sold This Week, Overdue, Pending Reviews, Marketing Posts)
- Need better visual impact
- Should be more actionable

**4. Job Details Page**
- Recently improved with 60/40 layout
- Status, scheduling, warranty, notes sections
- Need better visual flow and spacing

**5. Forms & Inputs**
- Inconsistent styling across pages
- Need better focus states
- Better error message display
- Loading states during submission

## MOBILE-SPECIFIC NEEDS

- Field technicians use phones in the field
- Touch targets must be at least 44px
- Quick actions should be thumb-reachable
- Forms should be easy to fill on mobile
- Navigation should be mobile-friendly

## ACCESSIBILITY REQUIREMENTS

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader friendly
- Color contrast ratios
- Focus indicators

## DESIGN INSPIRATION (But Can't Use Libraries)

I like the clean, professional look of:
- Linear (for its clarity and spacing)
- Notion (for its flexibility)
- GitHub (for its information density)
- But I need to build this with inline styles, not frameworks

Please provide specific, implementable CSS code that I can use immediately.
```

---

## How to Use This Prompt

1. **Copy the entire prompt above** (everything between the triple backticks)
2. **Paste it into Gemini** (gemini.google.com)
3. **Add any specific questions** at the end, like:
   - "Focus especially on the marketing calendar view"
   - "Provide specific CSS for the dashboard layout"
   - "Design a better mobile navigation pattern"

## Additional Context You Can Add

If you want Gemini to focus on specific areas, add sections like:

```
## SPECIFIC FOCUS AREAS

**Marketing Calendar:**
- Users need to quickly see what content is planned vs. scheduled
- Category badges should be prominent but not overwhelming
- Drag-and-drop scheduling would be ideal
- Need better visual distinction between different account types

**Bid Pipeline:**
- Visual workflow from Draft → Ready → Sent → Won/Lost
- Quick actions for common tasks
- Better filtering and search
```

## Expected Output from Gemini

Gemini should provide:
- Detailed design system specifications
- Specific CSS code examples
- Component design patterns
- Layout recommendations
- Mobile optimization strategies
- Accessibility guidelines
- Implementation priorities

## Tips for Best Results

1. **Be Specific**: Mention exact pages/components you want improved
2. **Show Examples**: If possible, describe current pain points in detail
3. **Ask for Code**: Request actual CSS/component code, not just concepts
4. **Iterate**: Use follow-up prompts to refine specific areas
5. **Reference Patterns**: Mention design systems you like (but note you can't use their libraries)

---

## Example Follow-Up Prompts

After the initial response, you can ask:

- "Can you provide the exact CSS variables I should use for a professional color system?"
- "Design a better mobile navigation pattern for field technicians"
- "Create a component style guide for forms with all states (default, focus, error, disabled)"
- "Improve the marketing calendar visual design with specific CSS"
- "Design a better status badge system with more semantic colors"

