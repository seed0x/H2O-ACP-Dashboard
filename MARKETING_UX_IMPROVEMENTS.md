# Marketing Calendar UX Improvements

## Current Pain Points (from user feedback)

1. **Empty Slot Clutter**: Too many "Empty Slot" entries make it hard to see what's actually scheduled
2. **Unclear Workflow**: Clicking an empty slot opens a modal, but the connection isn't obvious
3. **Missing Context**: When filling an empty slot, account/date/time should be pre-filled (they already exist!)
4. **No Media Upload**: The modal doesn't have photo upload, which is critical for social posts
5. **Confusing Modal Title**: "Fill Empty Slot" is not intuitive - should be more action-oriented
6. **Visual Hierarchy**: Empty slots vs scheduled posts need better distinction

## Recommended Improvements

### High Priority (Quick Wins)

1. **Pre-fill Form Data from Empty Slot** ✅ (Already implemented - account/date/time are pre-filled)
   - Account is pre-filled (line 154)
   - Date is pre-filled (line 149)
   - Time is pre-filled (line 151)

2. **Add Media Upload to Modal**
   - Add PhotoUpload component to creation modal
   - All social posts need images - this is critical!

3. **Improve Modal Title & Description**
   - Change "Fill Empty Slot" → "Create Post" or "Schedule Post"
   - Add helpful description showing account name and date

4. **Better Visual Distinction**
   - Make empty slots more subtle (lighter purple, dashed border)
   - Make scheduled posts more prominent (solid border, category badge)

### Medium Priority

5. **Add Category Selector**
   - Categories: ad_content, team_post, coupon, diy, blog_post
   - Use suggested_category from empty slot if available

6. **Improve Empty Slot Display**
   - Option: Hide empty slots by default, show toggle
   - Option: Show them more subtly (lighter, smaller)
   - Option: Group at bottom of day cell

7. **Add Quick Actions on Hover**
   - Edit, Duplicate, Delete buttons
   - Quick status change

### Implementation Notes

- PhotoUpload component already exists and works
- Categories are already in the system
- Pre-filling is already implemented in handleFillEmptySlot
- Need to add PhotoUpload to CalendarView modal
- Need to improve visual styling
