# AI Chatbot Testing Guide

## Quick Start Testing

### 1. Start the Application
```bash
cd /Users/mianusman/Downloads/emp_attend_app/emp_attend_app
npm run dev
```

Open browser: `http://localhost:3000`

### 2. Login as Admin
- Navigate to `/auth/login`
- Login with admin credentials
- You'll be redirected to dashboard

### 3. Open AI Chatbot
- Look for the **AI button** in the top-right corner (gradient purple/pink animation)
- Click to open the chatbot sidebar

## Feature Testing Checklist

### ✅ Basic Functionality
- [ ] Chatbot opens when clicking AI button
- [ ] Robot icon and greeting appear (sidebar mode only)
- [ ] 4 random predefined queries display
- [ ] Queries change when reopening chatbot
- [ ] Clicking predefined query sends message
- [ ] Manual text input works
- [ ] AI responds to queries
- [ ] Messages show timestamps
- [ ] Auto-scroll to latest message works
- [ ] Loading animation appears while waiting

### ✅ Fullscreen Mode
- [ ] Click expand icon → Fullscreen activates
- [ ] Large centered greeting appears (when no messages)
- [ ] Predefined queries show in 2-column grid
- [ ] Collapse icon appears in header
- [ ] Click collapse → Returns to sidebar mode
- [ ] Conversation sidebar toggle appears (hamburger menu)

### ✅ Conversation Management
- [ ] Send messages → Conversation auto-saves
- [ ] Click hamburger menu → Conversation sidebar opens
- [ ] Saved conversations appear in list with:
  - Title (first message text)
  - Date and message count
- [ ] Click conversation → Loads previous chat
- [ ] Click trash icon → Deletes conversation
- [ ] Click "New conversation" → Clears current chat
- [ ] Conversation persists after page refresh

### ✅ Chart Visualization Testing

#### Test Bar Charts (Default Analytics)
**Query to test**: "Show me attendance for last 7 days"
- [ ] AI responds with attendance data
- [ ] Bar chart appears below text response
- [ ] Chart shows multiple bars (if data available)
- [ ] Legend displays at top
- [ ] Chart title: "Attendance Analytics"
- [ ] Y-axis starts at 0

#### Test Line Charts (Trends)
**Query to test**: "Show attendance trend for this week"
- [ ] AI responds with trend analysis
- [ ] Line chart appears
- [ ] Line connects data points
- [ ] Chart title: "Attendance Trend"
- [ ] Grid lines visible

#### Test Doughnut Charts (Breakdown)
**Query to test**: "Department-wise attendance breakdown"
- [ ] AI responds with department data
- [ ] Doughnut chart appears
- [ ] Multiple segments (if data available)
- [ ] Legend displays on right side
- [ ] Chart title: "Distribution"

### ✅ Natural Language Understanding
**Test various date formats**:
- [ ] "Show me today's attendance" → Returns today's data
- [ ] "Who was absent yesterday?" → Returns yesterday's data
- [ ] "Show 4th November attendance" → Returns specific date
- [ ] "Last week's attendance report" → Returns week data
- [ ] "This month's late arrivals" → Returns month data

**Test entity recognition**:
- [ ] "Show all employees" → Lists employees
- [ ] "Department information" → Lists departments
- [ ] "Active employees only" → Filters by status
- [ ] "Employee John's attendance" → Specific employee data

### ✅ UI/UX Elements
- [ ] Gradient header (Purple → Pink → Blue)
- [ ] User messages: Purple/Pink gradient bubble (right side)
- [ ] AI messages: White bubble with border (left side)
- [ ] Input area has animated gradient border
- [ ] Send button (paper plane icon) works
- [ ] Send button disabled when input empty
- [ ] Enter key sends message
- [ ] Shift+Enter creates new line
- [ ] Close button (X) closes chatbot

### ✅ Responsive Behavior
**Sidebar Mode**:
- [ ] Width: 384px (w-96)
- [ ] Positioned on right side
- [ ] Single column predefined queries
- [ ] Message bubbles max 85% width

**Fullscreen Mode**:
- [ ] Covers entire screen
- [ ] Conversation sidebar on left (toggleable)
- [ ] Main chat area on right
- [ ] 2-column predefined queries
- [ ] Message bubbles max 70% width

### ✅ Edge Cases
- [ ] Empty message submission prevented
- [ ] Long messages wrap properly
- [ ] Many messages scroll correctly
- [ ] No data queries handled gracefully
- [ ] Invalid date queries handled
- [ ] Network errors show appropriate message
- [ ] Multiple rapid queries handled
- [ ] Special characters in queries work
- [ ] Emoji in messages display correctly

## Sample Test Queries

### Attendance Queries
1. "Show me today's attendance report"
2. "Who was absent this week?"
3. "How many employees were late today?"
4. "Show attendance trend for last 7 days"
5. "4th November attendance data"

### Employee Queries
1. "List all active employees"
2. "Show me employees with their departments"
3. "Who is currently checked in?"
4. "Employee with most late arrivals this week"

### Department Queries
1. "Department-wise attendance breakdown"
2. "Top 5 departments by attendance rate"
3. "Show all departments"
4. "Average working hours by department"

### Analytics Queries (Should Trigger Charts)
1. "Show attendance trend" → Line Chart
2. "Weekly attendance comparison chart" → Bar Chart
3. "Department breakdown" → Doughnut Chart
4. "Attendance pattern last 7 days" → Line Chart

## Expected Results

### Successful Chart Display
When a query triggers a chart, you should see:
1. AI text response explaining the data
2. Chart appears in gray rounded box below text
3. Chart has proper height (256px)
4. Chart is responsive and interactive
5. Legend and title visible
6. Tooltip appears on hover

### Chart Not Displaying?
If chart doesn't appear but should:
- Check browser console for errors
- Verify data exists for date range
- Check if AI response includes statistics
- Ensure Chart.js loaded (check network tab)

### No Data Scenarios
If no data available for query:
- AI should respond with "No data available"
- No chart should render
- Timestamp still shows

## Conversation Flow Example

```
1. User opens chatbot
2. Sees 4 random queries
3. Clicks: "Show me today's attendance report"
4. Loading animation appears
5. AI responds with:
   - Text: "Here's today's attendance report..."
   - Bar chart showing stats
   - Timestamp
6. Message auto-scrolls into view
7. Conversation auto-saves (wait 500ms)
8. User clicks fullscreen
9. UI expands, shows conversation sidebar toggle
10. User clicks hamburger menu
11. Sees saved conversation in list
12. Clicks new conversation
13. Chat clears, ready for new questions
```

## Performance Testing

### Load Testing
- [ ] Open 10+ conversations → Check localStorage size
- [ ] Send 50+ messages in one conversation → Scroll performance
- [ ] Generate multiple charts → Rendering speed
- [ ] Switch between sidebar/fullscreen rapidly → No lag

### Memory Testing
- [ ] Leave chatbot open for 10 minutes → No memory leaks
- [ ] Create 20 conversations → localStorage works
- [ ] Delete old conversations → Memory freed

## Browser Testing

### Chrome/Edge
- [ ] All features work
- [ ] Charts render correctly
- [ ] localStorage works
- [ ] Animations smooth

### Firefox
- [ ] All features work
- [ ] Chart.js compatibility verified
- [ ] localStorage works
- [ ] CSS grid displays correctly

### Safari
- [ ] All features work
- [ ] Gradient animations work
- [ ] localStorage works
- [ ] Flexbox layout correct

## Mobile Responsiveness (If Applicable)
- [ ] Chatbot adapts to small screens
- [ ] Touch interactions work
- [ ] Virtual keyboard doesn't hide input
- [ ] Charts responsive on mobile

## Known Issues / Warnings

### Chart Size Warning (Expected)
```
The width(-1) and height(-1) of chart should be greater than 0
```
- **Status**: Warning only, charts still render
- **Cause**: Charts briefly load before container sized
- **Impact**: None - charts display correctly after render

### Turbopack Warning (Expected)
```
Next.js inferred your workspace root
```
- **Status**: Can be ignored
- **Fix**: Set `turbopack.root` in next.config.ts (optional)
- **Impact**: None on functionality

## Debugging Tips

### Chart Not Displaying
1. Open browser DevTools
2. Check Console for errors
3. Verify Chart.js loaded (Network tab)
4. Check if chartData exists: `console.log(message.chartData)`

### Conversation Not Saving
1. Check localStorage: DevTools → Application → Local Storage
2. Look for key: `ai_conversations`
3. Verify JSON format valid
4. Check localStorage quota (usually 5-10MB)

### AI Not Responding
1. Check network tab for API call
2. Verify API key valid
3. Check LongCat API status
4. Look for CORS errors

### Fullscreen Issues
1. Check z-index (should be 50)
2. Verify `fixed inset-0` class applied
3. Test on different screen sizes
4. Check for conflicting CSS

## Reporting Issues

When reporting bugs, include:
1. Browser and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Console errors (if any)
5. Screenshots
6. Network tab (for API issues)

## Success Criteria

All features pass when:
- ✅ Chatbot opens/closes smoothly
- ✅ AI responds to all test queries
- ✅ Charts display for appropriate queries
- ✅ Conversations save and load correctly
- ✅ Fullscreen mode works flawlessly
- ✅ No console errors (except expected warnings)
- ✅ UI responsive and animations smooth
- ✅ Natural language queries understood

---

**Testing Time Estimate**: 30-45 minutes for full checklist
**Priority Features**: Conversation management, Chart visualization, Fullscreen mode
**Critical Paths**: Basic Q&A, Chart generation, Conversation save/load
