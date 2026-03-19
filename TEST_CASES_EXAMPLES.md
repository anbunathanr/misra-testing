# Test Cases Examples for Demo

## Test Suite 1: E-Commerce Platform Testing

### Test Case 1.1: User Registration Flow
**Name:** Verify user can register with valid credentials
**Steps:**
1. Navigate to registration page
2. Enter email: user@example.com
3. Enter password: SecurePass123!
4. Enter full name: John Doe
5. Click "Register" button
6. Verify confirmation email sent
7. Click verification link in email
8. Verify account activated

**Expected Result:** User successfully registered and email verified

---

### Test Case 1.2: Product Search Functionality
**Name:** Search for products by keyword
**Steps:**
1. Login with valid credentials
2. Navigate to search bar
3. Enter search term: "laptop"
4. Press Enter or click search button
5. Verify results display products matching "laptop"
6. Verify product count displayed
7. Verify filters available (price, brand, rating)

**Expected Result:** Search returns relevant products with filters

---

### Test Case 1.3: Add to Cart and Checkout
**Name:** Complete purchase flow
**Steps:**
1. Search for product: "wireless mouse"
2. Click on first product
3. Verify product details displayed
4. Select quantity: 2
5. Click "Add to Cart"
6. Verify cart count updated
7. Navigate to cart
8. Verify items and total price
9. Click "Proceed to Checkout"
10. Enter shipping address
11. Select payment method
12. Complete payment

**Expected Result:** Order successfully placed with confirmation number

---

## Test Suite 2: Social Media Platform Testing

### Test Case 2.1: Create and Publish Post
**Name:** User can create and publish a post
**Steps:**
1. Login to dashboard
2. Click "Create Post" button
3. Enter post title: "My First Post"
4. Enter post content: "This is a test post for demo"
5. Add image from computer
6. Add hashtags: #demo #testing
7. Click "Publish" button
8. Verify post appears on timeline
9. Verify post shows correct timestamp

**Expected Result:** Post published and visible on user timeline

---

### Test Case 2.2: Follow User and View Feed
**Name:** Follow another user and see their posts
**Steps:**
1. Navigate to search
2. Search for user: "demo_user"
3. Click on user profile
4. Click "Follow" button
5. Verify follow button changes to "Following"
6. Navigate to home feed
7. Verify posts from followed user appear
8. Verify posts ordered by timestamp

**Expected Result:** User followed and their posts visible in feed

---

### Test Case 2.3: Like and Comment on Post
**Name:** Interact with posts through likes and comments
**Steps:**
1. View post from another user
2. Click heart icon to like
3. Verify like count incremented
4. Click comment icon
5. Enter comment: "Great post!"
6. Click "Post Comment"
7. Verify comment appears below post
8. Verify comment shows username and timestamp

**Expected Result:** Like and comment successfully added to post

---

## Test Suite 3: Banking Application Testing

### Test Case 3.1: Check Account Balance
**Name:** View current account balance
**Steps:**
1. Login with credentials
2. Navigate to "Accounts" section
3. Select checking account
4. Verify account number displayed
5. Verify current balance shown
6. Verify last transaction date
7. Verify account status (Active)

**Expected Result:** Account balance and details correctly displayed

---

### Test Case 3.2: Transfer Money Between Accounts
**Name:** Transfer funds between own accounts
**Steps:**
1. Navigate to "Transfers"
2. Select "From Account": Checking (Balance: $5,000)
3. Select "To Account": Savings
4. Enter amount: $500
5. Enter description: "Monthly savings"
6. Review transfer details
7. Click "Confirm Transfer"
8. Verify confirmation message
9. Verify checking balance reduced to $4,500
10. Verify savings balance increased

**Expected Result:** Money successfully transferred with updated balances

---

### Test Case 3.3: Pay Bills Online
**Name:** Pay utility bill through online banking
**Steps:**
1. Navigate to "Pay Bills"
2. Select biller: "Electric Company"
3. Enter account number: 123456789
4. Enter amount: $150
5. Select payment date: Today
6. Review payment details
7. Click "Pay Now"
8. Verify payment confirmation number
9. Verify transaction appears in history

**Expected Result:** Bill payment processed successfully

---

## Test Suite 4: Project Management Tool Testing

### Test Case 4.1: Create New Project
**Name:** Create a new project with team members
**Steps:**
1. Click "New Project" button
2. Enter project name: "Website Redesign"
3. Enter description: "Redesign company website"
4. Select project type: "Web Development"
5. Add team members: john@company.com, jane@company.com
6. Set start date: 2026-03-20
7. Set end date: 2026-06-20
8. Click "Create Project"
9. Verify project appears in project list
10. Verify team members added

**Expected Result:** Project created with correct details and team members

---

### Test Case 4.2: Create and Assign Tasks
**Name:** Create tasks and assign to team members
**Steps:**
1. Open project: "Website Redesign"
2. Click "Add Task"
3. Enter task name: "Design Homepage"
4. Enter description: "Create mockups for homepage"
5. Assign to: John Smith
6. Set priority: High
7. Set due date: 2026-04-15
8. Click "Create Task"
9. Verify task appears in task list
10. Verify assigned to John Smith

**Expected Result:** Task created and assigned successfully

---

### Test Case 4.3: Update Task Status
**Name:** Update task progress through workflow
**Steps:**
1. Open task: "Design Homepage"
2. Verify current status: "To Do"
3. Click status dropdown
4. Select "In Progress"
5. Add comment: "Started working on mockups"
6. Click "Update"
7. Verify status changed to "In Progress"
8. Verify comment visible
9. Verify timestamp recorded

**Expected Result:** Task status updated with comment recorded

---

## Test Suite 5: Learning Management System Testing

### Test Case 5.1: Enroll in Course
**Name:** Student enrolls in available course
**Steps:**
1. Navigate to "Browse Courses"
2. Search for course: "Python Basics"
3. Click on course card
4. Verify course details displayed
5. Verify instructor: "Jane Smith"
6. Verify course duration: 4 weeks
7. Verify price: $49.99
8. Click "Enroll Now"
9. Complete payment
10. Verify enrollment confirmation

**Expected Result:** Student successfully enrolled in course

---

### Test Case 5.2: Complete Course Module
**Name:** Complete a course module and take quiz
**Steps:**
1. Navigate to enrolled course
2. Click "Module 1: Introduction"
3. Watch video: "Course Overview" (5 min)
4. Verify video plays without errors
5. Click "Mark as Complete"
6. Click "Take Quiz"
7. Answer 10 multiple choice questions
8. Submit quiz
9. Verify score: 90%
10. Verify certificate progress updated

**Expected Result:** Module completed and quiz passed

---

### Test Case 5.3: Download Course Materials
**Name:** Download course resources
**Steps:**
1. Open course: "Python Basics"
2. Navigate to "Resources" section
3. Verify list of available materials
4. Click "Download" for "Python_Cheatsheet.pdf"
5. Verify file downloads successfully
6. Verify file size: 2.5 MB
7. Click "Download" for "Sample_Code.zip"
8. Verify zip file downloads

**Expected Result:** Course materials downloaded successfully

---

## Demo Execution Tips

### For Each Test Case:
1. **Prepare test data** before starting
2. **Take screenshots** at key steps
3. **Record any errors** with exact messages
4. **Note performance** (page load times)
5. **Verify all validations** pass
6. **Check responsive design** on different screen sizes

### Demo Flow Recommendation:
1. Start with **Test Suite 1** (E-Commerce) - most relatable
2. Show **Test Suite 4** (Project Management) - demonstrates complexity
3. Highlight **Test Suite 3** (Banking) - shows security/accuracy
4. End with **Test Suite 5** (LMS) - shows educational value

### Success Criteria for Demo:
- All test cases execute without errors
- UI is responsive and user-friendly
- Data persists correctly
- Performance is acceptable (< 2 sec page loads)
- Error messages are clear and helpful
- Navigation is intuitive

---

## Notes for Team Head Presentation

**Key Points to Highlight:**
1. **Comprehensive Testing**: Multiple real-world scenarios
2. **User-Centric Design**: Intuitive workflows
3. **Data Integrity**: Correct calculations and updates
4. **Error Handling**: Graceful error messages
5. **Performance**: Fast response times
6. **Security**: Proper authentication and authorization

**Expected Demo Duration:** 15-20 minutes
**Recommended Audience:** Team leads, stakeholders, product managers
