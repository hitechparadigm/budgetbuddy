# Implementation Tasks: Push Notifications and Daily Reminders

## Overview

This implementation plan covers the complete push notification and daily reminder system for BudgetBuddy. The system includes device registration, notification preferences, budget alerts, daily reminders, and notification history across web and mobile platforms.

**Timeline**: 3 weeks
**Priority**: High - Improves user engagement and retention
**Dependencies**: Existing auth, budget, and transaction systems

## Tasks

### Phase 1: Infrastructure Setup (Week 1)

- [-] 1. Create Notification Stack in CDK
  - [x] 1.1 Create notification-stack.ts file
    - Define NotificationStack class
    - Add stack props interface
    - Import required CDK constructs
    - _Requirements: 11.1-11.10_

  - [x] 1.2 Create Notification Service Lambda definition
    - Define Lambda function with Node.js 20.x runtime
    - Set memory to 512 MB, timeout to 30 seconds
    - Add environment variables (TABLE_NAME, EXPO_ACCESS_TOKEN)
    - Attach common and shared layers
    - _Requirements: 11.2, 11.3_

  - [x] 1.3 Create Budget Alerts Service Lambda definition
    - Define Lambda function with Node.js 20.x runtime
    - Set memory to 512 MB, timeout to 60 seconds
    - Add environment variables (TABLE_NAME, NOTIFICATION_FUNCTION_ARN)
    - Attach common and shared layers
    - _Requirements: 11.2, 11.3_

  - [x] 1.4 Create Daily Reminders Service Lambda definition
    - Define Lambda function with Node.js 20.x runtime
    - Set memory to 1024 MB, timeout to 300 seconds
    - Add environment variables (TABLE_NAME, NOTIFICATION_FUNCTION_ARN)
    - Attach common and shared layers
    - _Requirements: 11.2, 11.3_

  - [x] 1.5 Configure IAM permissions
    - Grant DynamoDB read/write to Notification Service
    - Grant DynamoDB read to Budget Alerts Service
    - Grant DynamoDB read to Daily Reminders Service
    - Grant Lambda invoke permissions between functions
    - _Requirements: 11.7_

  - [x] 1.6 Configure DynamoDB Streams event source mapping
    - Add event source mapping to Budget Alerts Service
    - Set batch size to 10, starting position to LATEST
    - Configure retry attempts to 2
    - Add filter for TRANSACTION records only
    - _Requirements: 6.1-6.8_

  - [x] 1.7 Create EventBridge scheduled rules
    - Create daily reminders rule (every 15 minutes)
    - Create budget alerts rule (every 6 hours)
    - Add Lambda targets with retry policies
    - _Requirements: 5.1-5.8_

  - [x] 1.8 Create CloudWatch alarms
    - Create error rate alarms for all Lambda functions
    - Create throttle alarms for all Lambda functions
    - Create latency alarms (p99 > 1 second)
    - Configure SNS notifications
    - _Requirements: 12.1-12.10_

  - [x] 1.9 Create CloudWatch dashboard
    - Add widgets for Lambda invocations
    - Add widgets for errors and throttles
    - Add widgets for custom metrics
    - Add widgets for DynamoDB Stream metrics
    - _Requirements: 12.7_

  - [x] 1.10 Deploy Notification Stack
    - Run cdk synth to validate
    - Deploy to dev environment
    - Verify all resources created
    - Test Lambda functions manually
    - _Requirements: 11.1-11.10_

### Phase 2: Notification Service Lambda (Week 1)

- [x] 2. Implement Notification Service Lambda
  - [x] 2.1 Create function structure
    - Create backend/functions/notifications/ directory
    - Create index.js with handler function
    - Create package.json with dependencies
    - Create README.md with function documentation
    - _Requirements: 1.1-1.8_

  - [x] 2.2 Implement device registration endpoint
    - Validate Expo push token format
    - Check device limit (max 10 per user)
    - Store device in DynamoDB
    - Return device ID
    - _Requirements: 1.1, 1.2, 1.6, 1.8_

  - [x] 2.3 Implement device removal endpoint
    - Validate user owns device
    - Delete device from DynamoDB
    - Return success message
    - _Requirements: 1.7, 9.2_

  - [x] 2.4 Implement get preferences endpoint
    - Query user preferences from DynamoDB
    - Return default preferences if not found
    - Format response with all preference fields
    - _Requirements: 4.1, 4.9_

  - [x] 2.5 Implement update preferences endpoint
    - Validate time formats (HH:mm)
    - Validate quiet hours range
    - Update preferences in DynamoDB
    - Return updated preferences
    - _Requirements: 4.2, 4.6, 4.7, 4.8, 4.10_

  - [x] 2.6 Implement get notification history endpoint
    - Query notifications by user ID
    - Support pagination with lastEvaluatedKey
    - Limit to 50 notifications per page
    - Sort by sentAt (newest first)
    - _Requirements: 10.4, 10.5, 10.8_

  - [x] 2.7 Implement mark as read endpoint
    - Validate user owns notification
    - Update read status in DynamoDB
    - Return success message
    - _Requirements: 10.6_

  - [x] 2.8 Implement send push notification function
    - Get all user devices from DynamoDB
    - Filter enabled devices
    - Send to Expo Push Notification API
    - Handle delivery failures gracefully
    - Store notification in history
    - _Requirements: 1.3, 1.4, 1.5, 9.1, 9.6, 10.1, 10.2_

  - [x] 2.9 Add unit tests
    - Test device registration validation
    - Test preferences validation
    - Test notification history pagination
    - Test Expo token format validation
    - Test quiet hours calculation
    - _Requirements: 13.1, 13.2_

  - [x] 2.10 Add integration tests
    - Test device registration flow
    - Test preferences update flow
    - Test notification delivery flow
    - Test notification history retrieval
    - _Requirements: 13.4, 13.5, 13.6_

### Phase 3: Budget Alerts Service Lambda (Week 1)

- [x] 3. Implement Budget Alerts Service Lambda
  - [x] 3.1 Create function structure
    - Create backend/functions/budget-alerts/ directory
    - Create index.js with handler function
    - Create package.json with dependencies
    - Create README.md with function documentation
    - _Requirements: 2.1-2.10_

  - [x] 3.2 Implement stream event handler
    - Parse DynamoDB stream records
    - Filter for TRANSACTION records
    - Extract transaction data
    - Call checkBudgetThresholds for each transaction
    - _Requirements: 2.7, 6.5_

  - [x] 3.3 Implement scheduled check handler
    - Scan all budgets
    - Calculate spending percentages
    - Check for missed alerts
    - Send alerts if needed
    - _Requirements: 2.8_

  - [x] 3.4 Implement threshold calculation
    - Get budget for transaction
    - Calculate category spending percentage
    - Check if 80%, 90%, or 100% threshold crossed
    - Return threshold level if crossed
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.5 Implement alert deduplication
    - Query alert history by family, budget, category, threshold
    - Check if alert sent in last 24 hours
    - Return true if duplicate, false otherwise
    - _Requirements: 2.5, 2.10_

  - [x] 3.6 Implement send budget alert
    - Get all family members
    - Create alert notification object
    - Call Notification Service to send push
    - Mark alert as sent in DynamoDB
    - _Requirements: 2.4, 2.6, 2.9, 2.10_

  - [x] 3.7 Add unit tests
    - Test threshold calculation (80%, 90%, 100%)
    - Test alert deduplication logic
    - Test family member notification logic
    - Test stream event parsing
    - Test alert history tracking
    - _Requirements: 13.1, 13.2_

  - [x] 3.8 Add integration tests
    - Test transaction creation triggers alert
    - Test alert sent to all family members
    - Test duplicate alerts prevented
    - Test scheduled check catches missed alerts
    - _Requirements: 13.8_

### Phase 4: Daily Reminders Service Lambda (Week 1)

- [x] 4. Implement Daily Reminders Service Lambda
  - [x] 4.1 Create function structure
    - Create backend/functions/daily-reminders/ directory
    - Create index.js with handler function
    - Create package.json with dependencies
    - Create README.md with function documentation
    - _Requirements: 3.1-3.10_

  - [x] 4.2 Implement reminder time matching
    - Get current hour and minute
    - Calculate ±15 minute window
    - Query users with matching reminder time
    - Handle timezone conversions
    - _Requirements: 3.2, 3.9_

  - [x] 4.3 Implement quiet hours checking
    - Parse quiet hours start and end times
    - Check if current time is within quiet hours
    - Handle overnight quiet hours (e.g., 10 PM - 8 AM)
    - Return true if in quiet hours, false otherwise
    - _Requirements: 3.3_

  - [x] 4.4 Implement last transaction check
    - Query user's transactions
    - Get most recent transaction date
    - Calculate days since last transaction
    - Return days count
    - _Requirements: 3.1, 3.7_

  - [x] 4.5 Implement batch processing
    - Get users for reminder (max 100)
    - Process in batches of 10
    - Use Promise.all for parallel processing
    - Handle errors per user without failing batch
    - _Requirements: 3.6_

  - [x] 4.6 Implement process user reminder
    - Check if reminders enabled in preferences
    - Check if in quiet hours
    - Get last transaction date
    - Send reminder if 3+ days since last transaction
    - Log reminder delivery status
    - _Requirements: 3.1, 3.3, 3.4, 3.8, 3.10_

  - [x] 4.7 Add unit tests
    - Test reminder time matching (±15 min window)
    - Test quiet hours checking
    - Test last transaction date calculation
    - Test batch processing logic
    - Test user filtering by preferences
    - _Requirements: 13.1, 13.3_

  - [x] 4.8 Add integration tests
    - Test reminder sent at configured time
    - Test reminder skipped during quiet hours
    - Test reminder sent after 3+ days
    - Test batch processing with 100 users
    - _Requirements: 13.9_

### Phase 5: Web UI Integration (Week 2)

- [x] 5. Create Notification Settings Component (Web)
  - [x] 5.1 Create NotificationSettings.tsx component
    - Create component file in web-app/src/components/
    - Define NotificationSettingsProps interface
    - Implement component structure with form
    - Add state management for preferences
    - _Requirements: 7.1_

  - [x] 5.2 Implement budget alerts toggle
    - Add checkbox for budget alerts
    - Handle onChange event
    - Update local state
    - _Requirements: 7.2_

  - [x] 5.3 Implement daily reminders toggle
    - Add checkbox for daily reminders
    - Handle onChange event
    - Update local state
    - _Requirements: 7.3_

  - [x] 5.4 Implement reminder time picker
    - Add time input for reminder time
    - Validate time format (HH:mm)
    - Handle onChange event
    - _Requirements: 7.4_

  - [x] 5.5 Implement quiet hours pickers
    - Add time inputs for start and end times
    - Validate time range
    - Handle onChange events
    - _Requirements: 7.5_

  - [x] 5.6 Implement load preferences
    - Call API on component mount
    - Update state with loaded preferences
    - Handle loading and error states
    - _Requirements: 7.6_

  - [x] 5.7 Implement save preferences
    - Call API on save button click
    - Show success/error messages
    - Update state with saved preferences
    - _Requirements: 7.7, 7.8_

  - [x] 5.8 Add validation
    - Validate time formats before submission
    - Show validation errors
    - Prevent submission if invalid
    - _Requirements: 7.9_

  - [x] 5.9 Add to Settings page
    - Import NotificationSettings component
    - Add to Settings page layout
    - Test integration
    - _Requirements: 7.1_

  - [x] 5.10 Add component tests
    - Test rendering with preferences
    - Test toggle changes
    - Test time picker changes
    - Test save functionality
    - Test validation
    - _Requirements: 7.1-7.10_

### Phase 6: Mobile UI Integration (Week 2)

- [x] 6. Create Notification Settings Screen (Mobile)
  - [x] 6.1 Create NotificationSettings.tsx component
    - Create component file in mobile/src/components/
    - Implement ScrollView layout
    - Add state management for preferences
    - _Requirements: 8.1_

  - [x] 6.2 Implement budget alerts switch
    - Add native Switch component
    - Handle onValueChange event
    - Update local state
    - _Requirements: 8.2_

  - [x] 6.3 Implement daily reminders switch
    - Add native Switch component
    - Handle onValueChange event
    - Update local state
    - _Requirements: 8.3_

  - [x] 6.4 Implement reminder time picker
    - Add TouchableOpacity to show picker
    - Show native DateTimePicker modal
    - Handle time selection
    - _Requirements: 8.4_

  - [x] 6.5 Implement quiet hours pickers
    - Add TouchableOpacity for start and end times
    - Show native DateTimePicker modals
    - Handle time selections
    - _Requirements: 8.5_

  - [x] 6.6 Implement load preferences
    - Call API on screen mount
    - Update state with loaded preferences
    - Handle loading and error states
    - _Requirements: 8.6_

  - [x] 6.7 Implement save preferences
    - Call API on setting change
    - Show native success/error alerts
    - Update state with saved preferences
    - _Requirements: 8.7, 8.8_

  - [x] 6.8 Request notification permissions
    - Check if permissions granted
    - Request permissions if not granted
    - Show explanation if denied
    - _Requirements: 8.9_

  - [x] 6.9 Implement device registration
    - Get Expo push token
    - Call API to register device
    - Store device ID locally
    - Handle registration errors
    - _Requirements: 8.10_

  - [x] 6.10 Add to Settings tab
    - Add NotificationSettings to Settings screen
    - Test navigation and integration
    - _Requirements: 8.1_

- [-] 7. Implement Push Notification Handler (Mobile)
  - [x] 7.1 Create notification service
    - Create mobile/src/services/notification.ts
    - Define NotificationService class
    - Add registerDevice method
    - Add setupNotificationHandlers method
    - _Requirements: 8.9, 8.10_

  - [x] 7.2 Implement notification received handler
    - Add listener for foreground notifications
    - Show in-app notification banner
    - Log notification received
    - _Requirements: 9.1_

  - [x] 7.3 Implement notification tap handler
    - Add listener for notification taps
    - Parse notification data
    - Navigate to appropriate screen
    - _Requirements: 9.1_

  - [x] 7.4 Implement navigation logic
    - Navigate to Budget screen for budget alerts
    - Navigate to Transactions screen for reminders
    - Pass relevant data to screens
    - _Requirements: 9.1_

  - [x] 7.5 Initialize notification service
    - Call registerDevice on app launch
    - Call setupNotificationHandlers on app launch
    - Handle initialization errors
    - _Requirements: 8.10_

  - [ ] 7.6 Add notification service tests
    - Test device registration
    - Test notification handlers
    - Test navigation logic
    - _Requirements: 8.1-8.10_

### Phase 7: API Gateway Integration (Week 2)

- [x] 8. Add Notification API Routes
  - [x] 8.1 Add device registration route
    - POST /notifications/register-device
    - Integrate with Notification Service Lambda
    - Add JWT authorizer
    - Test with Postman
    - _Requirements: 1.1, 1.2_

  - [x] 8.2 Add device removal route
    - DELETE /notifications/device/{deviceId}
    - Integrate with Notification Service Lambda
    - Add JWT authorizer
    - Test with Postman
    - _Requirements: 1.7_

  - [x] 8.3 Add get preferences route
    - GET /notifications/preferences
    - Integrate with Notification Service Lambda
    - Add JWT authorizer
    - Test with Postman
    - _Requirements: 4.1_

  - [x] 8.4 Add update preferences route
    - PUT /notifications/preferences
    - Integrate with Notification Service Lambda
    - Add JWT authorizer
    - Test with Postman
    - _Requirements: 4.2_

  - [x] 8.5 Add get notification history route
    - GET /notifications/history
    - Integrate with Notification Service Lambda
    - Add JWT authorizer
    - Support pagination query parameters
    - Test with Postman
    - _Requirements: 10.4_

  - [x] 8.6 Add mark as read route
    - PUT /notifications/{notificationId}/read
    - Integrate with Notification Service Lambda
    - Add JWT authorizer
    - Test with Postman
    - _Requirements: 10.6_

  - [x] 8.7 Update API Gateway CDK stack
    - Add all notification routes
    - Configure CORS
    - Deploy to dev environment
    - _Requirements: All API requirements_

  - [x] 8.8 Test all API endpoints
    - Test with valid JWT tokens
    - Test with invalid tokens (should fail)
    - Test error responses
    - Test rate limiting
    - _Requirements: All API requirements_

### Phase 8: Testing and Validation (Week 3)

- [ ] 9. Property-Based Testing
  - [ ] 9.1 Test time window matching property
    - Generate random reminder and current times
    - Verify ±15 minute window logic
    - Test with 1000+ random inputs
    - _Requirements: 3.2, 3.9_

  - [ ] 9.2 Test quiet hours property
    - Generate random notification and quiet hour times
    - Verify quiet hours logic for all cases
    - Test overnight quiet hours (e.g., 10 PM - 8 AM)
    - _Requirements: 3.3_

  - [ ] 9.3 Test threshold detection property
    - Generate random spending and budget amounts
    - Verify threshold detection (80%, 90%, 100%)
    - Test edge cases (exactly at threshold)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 9.4 Test alert deduplication property
    - Generate random alert timestamps
    - Verify no duplicates within 24 hours
    - Test boundary cases
    - _Requirements: 2.5_

  - [ ] 9.5 Test batch processing property
    - Generate random user lists of varying sizes
    - Verify all users processed exactly once
    - Test with 0, 1, 10, 100, 1000 users
    - _Requirements: 3.6_

- [ ] 10. Integration Testing
  - [ ] 10.1 Test device registration flow
    - Register device with valid token
    - Verify device stored in DynamoDB
    - Verify device ID returned
    - Test with multiple devices per user
    - _Requirements: 1.1, 1.2, 1.6, 8.10_

  - [ ] 10.2 Test notification delivery flow
    - Register device
    - Trigger budget alert
    - Verify notification sent to device
    - Verify notification stored in history
    - _Requirements: 1.3, 1.4, 2.1-2.10, 10.1, 10.2_

  - [ ] 10.3 Test preferences update flow
    - Update preferences via API
    - Verify preferences saved in DynamoDB
    - Verify behavior changes (e.g., quiet hours respected)
    - _Requirements: 4.1-4.10_

  - [ ] 10.4 Test daily reminder flow
    - Set reminder time to current time
    - Wait for EventBridge trigger
    - Verify reminder sent
    - Verify reminder logged
    - _Requirements: 3.1-3.10_

  - [ ] 10.5 Test budget alert flow
    - Create transaction that crosses threshold
    - Verify DynamoDB Stream triggers Lambda
    - Verify alert sent to all family members
    - Verify alert marked as sent
    - _Requirements: 2.1-2.10_

  - [ ] 10.6 Test notification history flow
    - Send multiple notifications
    - Retrieve notification history
    - Verify pagination works
    - Mark notification as read
    - Verify read status updated
    - _Requirements: 10.1-10.10_

- [ ] 11. End-to-End Testing
  - [ ] 11.1 Test complete onboarding flow
    - Register user
    - Complete onboarding
    - Register device for notifications
    - Verify default preferences created
    - _Requirements: 1.1-1.8, 4.9, 8.10_

  - [ ] 11.2 Test complete budget alert flow
    - Create budget
    - Add transactions to reach 80% threshold
    - Verify alert received on mobile
    - Tap notification
    - Verify navigated to budget screen
    - _Requirements: 2.1-2.10, 9.1_

  - [ ] 11.3 Test complete daily reminder flow
    - Set reminder time
    - Don't log transactions for 3 days
    - Verify reminder received at configured time
    - Tap notification
    - Verify navigated to transactions screen
    - _Requirements: 3.1-3.10, 9.1_

  - [ ] 11.4 Test preferences management flow
    - Update preferences on web
    - Verify changes reflected on mobile
    - Update preferences on mobile
    - Verify changes reflected on web
    - _Requirements: 4.1-4.10, 7.1-7.10, 8.1-8.10_

  - [ ] 11.5 Test multi-device flow
    - Register 3 devices for same user
    - Trigger notification
    - Verify all 3 devices receive notification
    - Remove 1 device
    - Trigger notification
    - Verify only 2 devices receive notification
    - _Requirements: 1.6, 9.1, 9.2_

### Phase 9: Documentation and Deployment (Week 3)

- [ ] 12. Update Documentation
  - [ ] 12.1 Create Lambda function READMEs
    - Document Notification Service Lambda
    - Document Budget Alerts Service Lambda
    - Document Daily Reminders Service Lambda
    - Include purpose, inputs, outputs, errors
    - _Requirements: All_

  - [x] 12.2 Update API documentation
    - Document all notification endpoints
    - Include request/response examples
    - Document error codes
    - Add to docs/api-endpoints.md
    - _Requirements: All API requirements_

  - [ ] 12.3 Create architecture diagrams
    - Diagram showing all Lambda functions
    - Diagram showing event sources
    - Diagram showing data flow
    - Add to design.md
    - _Requirements: All_

  - [ ] 12.4 Update user documentation
    - Add notification settings guide
    - Add troubleshooting guide
    - Add FAQ section
    - _Requirements: All_

  - [ ] 12.5 Update README and CHANGELOG
    - Add push notifications to features
    - Document supported platforms
    - Add version entry to CHANGELOG
    - _Requirements: All_

- [ ] 13. Deploy to Production
  - [ ] 13.1 Deploy infrastructure to staging
    - Commit and push all changes to develop branch
    - Monitor GitHub Actions CI/CD pipeline
    - Verify all resources created via CloudFormation console
    - Run smoke tests
    - _Requirements: 11.1-11.10_

  - [ ] 13.2 Deploy Lambda functions to staging
    - Lambda functions deploy automatically with infrastructure
    - Verify functions invocable via AWS console
    - Test with staging data
    - _Requirements: All Lambda requirements_

  - [ ] 13.3 Deploy web app to staging
    - Web app deploys automatically via CI/CD
    - Test on staging environment
    - Verify API integration
    - _Requirements: 7.1-7.10_

  - [ ] 13.4 Deploy mobile app to TestFlight/Internal Testing
    - Build mobile app with notifications
    - Upload to TestFlight (iOS) and Internal Testing (Android)
    - Test with beta users
    - _Requirements: 8.1-8.10_

  - [ ] 13.5 Monitor staging for 1 week
    - Monitor CloudWatch metrics
    - Monitor error rates
    - Monitor user feedback
    - Fix any issues found
    - _Requirements: 12.1-12.10_

  - [ ] 13.6 Deploy to production (gradual rollout)
    - Merge to main branch to trigger production deployment
    - Monitor CI/CD pipeline
    - Enable for 10% of users (feature flag)
    - Monitor for 24 hours
    - _Requirements: All_

  - [ ] 13.7 Increase rollout to 50%
    - Enable for 50% of users
    - Monitor for 48 hours
    - Verify no issues
    - _Requirements: All_

  - [ ] 13.8 Complete rollout to 100%
    - Enable for all users
    - Monitor for 1 week
    - Verify success metrics
    - _Requirements: All_

## Definition of Done

- [ ] All 13 phases completed
- [ ] All unit tests passing (> 80% coverage)
- [ ] All integration tests passing
- [ ] All property-based tests passing
- [ ] All end-to-end tests passing
- [ ] Infrastructure deployed to production
- [ ] Lambda functions deployed to production
- [ ] Web app deployed with notification settings
- [ ] Mobile app deployed with push notifications
- [ ] Documentation complete
- [ ] CloudWatch alarms configured and working
- [ ] Monitoring dashboard created
- [ ] Zero critical bugs in production
- [ ] User satisfaction > 4.0/5.0

## Success Criteria

- ✅ Notification delivery success rate > 99%
- ✅ Average delivery latency < 500ms
- ✅ Lambda error rate < 0.1%
- ✅ Device registration rate > 80% (mobile users)
- ✅ Notification opt-in rate > 60%
- ✅ Notification engagement rate > 40%
- ✅ Reduced user churn by 10%
- ✅ Increased daily active users by 15%
- ✅ Improved budget adherence by 20%
- ✅ Zero security incidents
