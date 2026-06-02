# Requirements Document: Push Notifications and Daily Reminders

## Introduction

This document specifies the requirements for the Push Notifications and Daily Reminders feature in BudgetBuddy. The feature enables users to receive timely notifications about budget alerts and daily expense tracking reminders across web and mobile platforms. The system leverages AWS SNS, Expo Push Notifications, EventBridge scheduled rules, and DynamoDB Streams to deliver a comprehensive notification experience with user-configurable preferences.

## Glossary

- **Notification_Service**: The AWS Lambda function that handles push notification delivery via Expo and AWS SNS
- **Budget_Alerts_Service**: The AWS Lambda function that monitors budget spending and triggers alerts at threshold levels
- **Daily_Reminders_Service**: The AWS Lambda function that sends daily reminders to users who haven't logged transactions
- **EventBridge**: AWS service for scheduling and triggering Lambda functions on a schedule
- **DynamoDB_Streams**: AWS service that captures table activity and triggers Lambda functions on data changes
- **Expo_Push_Token**: A unique token identifying a mobile device for push notifications via Expo
- **Quiet_Hours**: A user-configurable time window during which notifications are suppressed
- **Reminder_Time**: The user-configured time of day when daily reminders should be sent
- **Alert_Threshold**: A percentage of budget spent that triggers a notification (80%, 90%, 100%)
- **Device_Token**: A unique identifier for a user's device used for push notification delivery
- **Notification_Preferences**: User settings controlling notification behavior and timing
- **Device_Registration**: The process of associating a device token with a user account for push notification delivery
- **Notification_History**: A record of all notifications sent to a user, stored in DynamoDB with read/unread status

## Requirements

### Requirement 1: Notification Infrastructure

**User Story:** As a system administrator, I want a robust notification infrastructure, so that users can receive timely push notifications across all platforms.

#### Acceptance Criteria

1. THE Notification_Service SHALL register device tokens for iOS and Android platforms
2. THE Notification_Service SHALL store device tokens in DynamoDB with user association
3. THE Notification_Service SHALL send push notifications via Expo Push Notification API
4. THE Notification_Service SHALL store notification history in DynamoDB for user reference
5. THE Notification_Service SHALL handle notification delivery failures gracefully and log error details
6. THE Notification_Service SHALL support multiple devices per user (up to 10 devices)
7. THE Notification_Service SHALL provide API endpoints for device registration and device removal
8. THE Notification_Service SHALL validate Expo Push Tokens before registration using Expo's token format validation

### Requirement 2: Budget Alert Notifications

**User Story:** As a user, I want to receive alerts when I approach or exceed my budget limits, so that I can adjust my spending behavior.

#### Acceptance Criteria

1. WHEN a transaction causes spending to reach 80% of a category budget, THE Budget_Alerts_Service SHALL send a low-severity alert
2. WHEN a transaction causes spending to reach 90% of a category budget, THE Budget_Alerts_Service SHALL send a medium-severity alert
3. WHEN a transaction causes spending to reach 100% of a category budget, THE Budget_Alerts_Service SHALL send a high-severity alert
4. THE Budget_Alerts_Service SHALL send alerts to all budget members associated with the budget
5. THE Budget_Alerts_Service SHALL prevent duplicate alerts for the same threshold and category
6. THE Budget_Alerts_Service SHALL include category name, percentage spent, and amount details in alerts
7. THE Budget_Alerts_Service SHALL be triggered by DynamoDB Streams when transactions are created or modified
8. THE Budget_Alerts_Service SHALL run scheduled checks every 6 hours to catch any missed alerts
9. THE Budget_Alerts_Service SHALL respect user notification preferences for budget alerts
10. THE Budget_Alerts_Service SHALL mark alerts as sent in DynamoDB with 90-day TTL using PK: `BUDGET#<budgetId>`

### Requirement 3: Daily Expense Reminders

**User Story:** As a user, I want to receive daily reminders to log my expenses, so that I maintain consistent tracking habits.

#### Acceptance Criteria

1. WHEN a user has not logged transactions for 3 or more days, THE Daily_Reminders_Service SHALL send a reminder notification
2. THE Daily_Reminders_Service SHALL send reminders at the user's configured reminder time (default 7:00 PM)
3. THE Daily_Reminders_Service SHALL respect quiet hours settings and skip reminders during those times
4. THE Daily_Reminders_Service SHALL check user preferences before sending reminders
5. THE Daily_Reminders_Service SHALL be triggered by EventBridge on a scheduled rule (every 15 minutes)
6. THE Daily_Reminders_Service SHALL process users in batches of 10 to avoid Lambda timeouts
7. THE Daily_Reminders_Service SHALL include the number of days since last transaction in the reminder
8. THE Daily_Reminders_Service SHALL allow users to disable daily reminders via preferences
9. THE Daily_Reminders_Service SHALL send reminders only within a 15-minute window of the configured time
10. THE Daily_Reminders_Service SHALL log reminder delivery status for monitoring

### Requirement 4: Notification Preferences Management

**User Story:** As a user, I want to configure my notification preferences, so that I receive notifications at convenient times.

#### Acceptance Criteria

1. THE Notification_Service SHALL provide an API endpoint to retrieve notification preferences
2. THE Notification_Service SHALL provide an API endpoint to update notification preferences
3. THE Notification_Service SHALL store preferences in DynamoDB with user association
4. THE Notification_Service SHALL support enabling/disabling budget alerts
5. THE Notification_Service SHALL support enabling/disabling daily reminders
6. THE Notification_Service SHALL support configuring reminder time (24-hour format)
7. THE Notification_Service SHALL support configuring quiet hours start time (24-hour format)
8. THE Notification_Service SHALL support configuring quiet hours end time (24-hour format)
9. THE Notification_Service SHALL provide default preferences for new users (reminders enabled, 7:00 PM, quiet hours 10:00 PM - 8:00 AM)
10. THE Notification_Service SHALL validate time formats before storing preferences

### Requirement 5: EventBridge Scheduled Rules

**User Story:** As a system administrator, I want scheduled rules to trigger notification services, so that reminders and checks run automatically.

#### Acceptance Criteria

1. THE Infrastructure SHALL create an EventBridge rule for daily reminders that runs every 15 minutes
2. THE Infrastructure SHALL create an EventBridge rule for budget alert checks that runs every 6 hours
3. THE Infrastructure SHALL grant EventBridge permission to invoke the Daily_Reminders_Service
4. THE Infrastructure SHALL grant EventBridge permission to invoke the Budget_Alerts_Service
5. THE Infrastructure SHALL configure rule targets with appropriate Lambda function ARNs
6. THE Infrastructure SHALL enable the scheduled rules by default
7. THE Infrastructure SHALL tag scheduled rules with environment and service identifiers
8. THE Infrastructure SHALL configure rule retry policies for failed invocations

### Requirement 6: DynamoDB Streams Integration

**User Story:** As a system administrator, I want DynamoDB Streams to trigger budget alerts, so that users receive immediate notifications when spending thresholds are crossed.

#### Acceptance Criteria

1. THE Infrastructure SHALL enable DynamoDB Streams on the main table with NEW_AND_OLD_IMAGES stream view type
2. THE Infrastructure SHALL create an event source mapping from DynamoDB Streams to Budget_Alerts_Service
3. THE Infrastructure SHALL configure batch size of 10 records for stream processing
4. THE Infrastructure SHALL configure maximum retry attempts of 2 for failed stream processing
5. THE Infrastructure SHALL filter stream events to only process TRANSACTION records
6. THE Infrastructure SHALL grant Budget_Alerts_Service permission to read from DynamoDB Streams
7. THE Infrastructure SHALL configure stream starting position as LATEST
8. THE Infrastructure SHALL enable bisect on function error for stream processing

### Requirement 7: Notification Settings UI (Web)

**User Story:** As a web user, I want to configure my notification preferences in the settings page, so that I can control when and how I receive notifications.

#### Acceptance Criteria

1. THE Settings_Page SHALL display a notification preferences section
2. THE Settings_Page SHALL provide a toggle for enabling/disabling budget alerts
3. THE Settings_Page SHALL provide a toggle for enabling/disabling daily reminders
4. THE Settings_Page SHALL provide a time picker for selecting reminder time
5. THE Settings_Page SHALL provide time pickers for quiet hours start and end times
6. THE Settings_Page SHALL load current preferences from the API on page load
7. THE Settings_Page SHALL save preferences to the API when the user clicks save
8. THE Settings_Page SHALL display success/error messages after save operations
9. THE Settings_Page SHALL validate time inputs before submission
10. THE Settings_Page SHALL display preferences in the user's local timezone

### Requirement 8: Notification Settings UI (Mobile)

**User Story:** As a mobile user, I want to configure my notification preferences in the app settings, so that I can control notifications on my device.

#### Acceptance Criteria

1. THE Settings_Screen SHALL display a notification preferences section
2. THE Settings_Screen SHALL provide native switches for enabling/disabling budget alerts
3. THE Settings_Screen SHALL provide native switches for enabling/disabling daily reminders
4. THE Settings_Screen SHALL provide native time pickers for selecting reminder time
5. THE Settings_Screen SHALL provide native time pickers for quiet hours start and end times
6. THE Settings_Screen SHALL load current preferences from the API on screen mount
7. THE Settings_Screen SHALL save preferences to the API when the user changes settings
8. THE Settings_Screen SHALL display native success/error alerts after save operations
9. THE Settings_Screen SHALL request notification permissions if not already granted
10. THE Settings_Screen SHALL register the device token with the Notification_Service on first launch

### Requirement 9: Cross-Platform Notification Delivery

**User Story:** As a user, I want to receive notifications on all my devices, so that I stay informed regardless of which device I'm using.

#### Acceptance Criteria

1. WHEN a user registers multiple devices, THE Notification_Service SHALL send notifications to all registered devices
2. WHEN a user removes a device, THE Notification_Service SHALL stop sending notifications to that device
3. THE Notification_Service SHALL support both iOS and Android device tokens
4. THE Notification_Service SHALL handle Expo Push Token format validation
5. THE Notification_Service SHALL log notification delivery status per device
6. THE Notification_Service SHALL continue delivery to other devices if one device fails
7. THE Notification_Service SHALL store device platform information (iOS/Android) with tokens
8. THE Notification_Service SHALL enable/disable notifications per device based on user preferences

### Requirement 10: Notification History and Read Status

**User Story:** As a user, I want to view my notification history, so that I can review past alerts and reminders.

#### Acceptance Criteria

1. THE Notification_Service SHALL store all sent notifications in DynamoDB
2. THE Notification_Service SHALL include notification type, title, body, and data in stored records
3. THE Notification_Service SHALL mark notifications as unread by default
4. THE Notification_Service SHALL provide an API endpoint to retrieve notification history
5. THE Notification_Service SHALL support pagination for notification history
6. THE Notification_Service SHALL provide an API endpoint to mark notifications as read
7. THE Notification_Service SHALL filter notification history by user ID
8. THE Notification_Service SHALL sort notifications by sent date (newest first)
9. THE Notification_Service SHALL include notification severity in stored records
10. THE Notification_Service SHALL apply 90-day TTL to notification history records

### Requirement 11: Infrastructure as Code

**User Story:** As a developer, I want all notification infrastructure defined in CDK, so that deployments are consistent and repeatable.

#### Acceptance Criteria

1. THE Infrastructure SHALL create a NotificationStack in AWS CDK
2. THE NotificationStack SHALL define the Notification_Service Lambda function
3. THE NotificationStack SHALL define the Budget_Alerts_Service Lambda function
4. THE NotificationStack SHALL define the Daily_Reminders_Service Lambda function
5. THE NotificationStack SHALL create EventBridge scheduled rules for reminders and alerts
6. THE NotificationStack SHALL configure DynamoDB Streams event source mapping
7. THE NotificationStack SHALL create IAM roles with least privilege permissions
8. THE NotificationStack SHALL configure CloudWatch log groups with 7-day retention (dev) and 30-day retention (prod)
9. THE NotificationStack SHALL create CloudWatch alarms for Lambda errors and throttles
10. THE NotificationStack SHALL export Lambda function ARNs for cross-stack references

### Requirement 12: Monitoring and Observability

**User Story:** As a system administrator, I want comprehensive monitoring of notification services, so that I can detect and resolve issues quickly.

#### Acceptance Criteria

1. THE Infrastructure SHALL create CloudWatch alarms for Lambda function errors
2. THE Infrastructure SHALL create CloudWatch alarms for Lambda function throttles
3. THE Infrastructure SHALL create CloudWatch alarms for DynamoDB Stream processing errors
4. THE Infrastructure SHALL create CloudWatch alarms for EventBridge rule failures
5. THE Infrastructure SHALL configure structured logging with correlation IDs
6. THE Infrastructure SHALL enable X-Ray tracing for all Lambda functions
7. THE Infrastructure SHALL create a CloudWatch dashboard for notification metrics
8. THE Infrastructure SHALL track custom metrics for notification delivery success rate
9. THE Infrastructure SHALL track custom metrics for reminder delivery counts
10. THE Infrastructure SHALL configure SNS topic for alarm notifications

### Requirement 13: Testing and Validation

**User Story:** As a developer, I want comprehensive tests for notification services, so that I can ensure correctness and reliability.

#### Acceptance Criteria

1. THE Test_Suite SHALL include unit tests for notification preference validation
2. THE Test_Suite SHALL include unit tests for quiet hours calculation
3. THE Test_Suite SHALL include unit tests for reminder time matching
4. THE Test_Suite SHALL include integration tests for device token registration
5. THE Test_Suite SHALL include integration tests for notification delivery
6. THE Test_Suite SHALL include integration tests for preference updates
7. THE Test_Suite SHALL include property-based tests for time window calculations
8. THE Test_Suite SHALL include end-to-end tests for budget alert flow
9. THE Test_Suite SHALL include end-to-end tests for daily reminder flow
10. THE Test_Suite SHALL achieve > 80% code coverage for all notification services
