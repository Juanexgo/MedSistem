# MediFlow Testing Checklist

## Authentication Tests
- [ ] Login with valid credentials returns JWT tokens
- [ ] Login with invalid email returns 401
- [ ] Login with wrong password returns 401
- [ ] Login rate limiting blocks after 5 failed attempts
- [ ] Token refresh works with valid refresh token
- [ ] Token refresh fails with expired/invalid refresh token
- [ ] Logout invalidates current session
- [ ] Logout-all invalidates all sessions
- [ ] Protected routes return 401 without token
- [ ] Public tracking endpoint works without auth

## RBAC Tests
- [ ] Admin can access all routes
- [ ] Head Nurse can manage transfers, shifts, oxygen
- [ ] Transporter can view transfers and create comments
- [ ] Auditor can view audit logs and security incidents
- [ ] Doctor can create transfers and view patient data
- [ ] Restricted pages are hidden from unauthorized roles
- [ ] API endpoints return 403 for unauthorized permissions

## Transfer Workflow
- [ ] Create transfer with all required fields
- [ ] Create transfer with oxygen support requirements
- [ ] Create transfer with doctor companion
- [ ] Assign transporter to REQUESTED transfer
- [ ] Progress through status flow (REQUESTED → COMPLETED)
- [ ] Cancel transfer with reason
- [ ] Cannot transition to invalid status
- [ ] Transfer timeline records all status changes
- [ ] QR code is generated on transfer creation
- [ ] Transfer filters (status, priority, date) work correctly
- [ ] Pagination works for transfer list

## Oxygen Workflow
- [ ] Create oxygen tank with code and level
- [ ] Tank status auto-calculates from level
- [ ] Update tank level triggers status change
- [ ] Low level (< 40%) generates alert
- [ ] Critical level (< 15%) generates critical alert
- [ ] Alerts notify managers (ADMIN, HEAD_NURSE, SUPERVISOR)
- [ ] Tank can be assigned to transfer
- [ ] Tank availability toggles correctly
- [ ] Tank history tracks all level changes
- [ ] Oxygen validation checks are enforced

## Shift / Handoff Tests
- [ ] Start shift generates correct shift code
- [ ] Shift type detected correctly by time
- [ ] End shift with handoff data
- [ ] Handoff documents all required fields
- [ ] Pending handoffs appear in dashboard
- [ ] Shift history is paginated
- [ ] Active shifts are listed correctly
- [ ] Dashboard shows current shift type

## Realtime Tests
- [ ] Socket connects with valid JWT token
- [ ] Socket rejects invalid token
- [ ] Transfer status change broadcasts to room
- [ ] Comment creation broadcasts to transfer room
- [ ] Important comment broadcasts to all
- [ ] Notification.created event received by user
- [ ] Security incident broadcast works
- [ ] Dashboard metrics update event fires
- [ ] Connection status indicator shows correct state
- [ ] Reconnection works after disconnect

## Communication Center Tests
- [ ] Create comment with type and severity
- [ ] Filter comments by type, severity, status
- [ ] Mark comment as important
- [ ] Important comment notifies managers
- [ ] Resolve comment changes status
- [ ] Close comment changes status
- [ ] Comments linked to transfers
- [ ] Empty state when no comments match filters

## Notifications Tests
- [ ] Notifications list with pagination
- [ ] Filter by read/unread status
- [ ] Mark single notification as read
- [ ] Mark all notifications as read
- [ ] Unread count updates correctly
- [ ] Notification.created event shows in dropdown
- [ ] Notification links to related entity

## Audit / Security Tests
- [ ] Audit log shows all user actions
- [ ] Filter audit by action, entity, user, role
- [ ] Search audit logs by keyword
- [ ] Before/after data visible on expand
- [ ] IP address and user agent displayed
- [ ] CSV export downloads audit logs
- [ ] Security incidents list with filters
- [ ] Security incident resolve workflow works
- [ ] Failed login creates security incident
- [ ] Only VIEW_AUDIT role can access audit page
- [ ] Only VIEW_SECURITY_INCIDENTS role can access incidents

## QR / Tracking Tests
- [ ] Public tracking page shows transfer status
- [ ] Public tracking page hides sensitive data
- [ ] Timeline displays on tracking page
- [ ] Invalid tracking token shows error state
- [ ] QR code downloads correctly

## Map Tests
- [ ] Map displays all hospital zones
- [ ] Zone active count matches transfers
- [ ] Saturated zones show visual indicator
- [ ] Zone click shows detail panel
- [ ] Stats bar shows correct values
- [ ] Map updates with realtime events
- [ ] Empty state when no zones configured

## Report / Export Tests
- [ ] Transfer export generates CSV
- [ ] Audit log export generates CSV
- [ ] Date range filter works on exports
- [ ] Empty date range shows message
- [ ] Export action is audited
- [ ] Only EXPORT_REPORTS role can export

## Dashboard Tests
- [ ] All KPI metrics display correctly
- [ ] Time range filter (Today/Shift/7 days) works
- [ ] Charts render (bar + pie)
- [ ] Active transfers table loads
- [ ] Transporter availability shows
- [ ] Alert cards display critical conditions
- [ ] Recent activity timeline updates
- [ ] Zone saturation renders
- [ ] Oxygen summary shows tank counts
- [ ] Dashboard auto-refreshes on realtime events

## UI/UX Tests
- [ ] All pages have consistent spacing
- [ ] Loading skeletons display during data fetch
- [ ] Error states show with retry option
- [ ] Empty states show helpful messages
- [ ] Responsive layout works on mobile
- [ ] Responsive layout works on tablet
- [ ] Navigation sidebar shows correct items for role
- [ ] Mobile navigation works
- [ ] All buttons have hover states
- [ ] All interactive elements have cursor pointers
