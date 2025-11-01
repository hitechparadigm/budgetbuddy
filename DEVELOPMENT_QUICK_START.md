# BudgetBuddy - Quick Development Guide

## **🚀 Get Started in 3 Commands**

```bash
# 1. Deploy backend
npm run deploy:dev

# 2. Start frontend
npm run dev:web

# 3. Test transactions
# Visit: http://localhost:5173/test/transactions
```

## **📋 Development Workflow**

### **Backend Development**
```bash
# Deploy changes
npm run deploy:dev

# Test API directly
npm run test:transactions

# Run unit tests
npm run test:unit
```

### **Frontend Development**
```bash
# Start dev server
npm run dev:web

# Test in browser
# http://localhost:5173/test/transactions
```

### **Testing**
```bash
# Create test user (one time)
npm run create-test-user

# Test API endpoints
npm run test:transactions

# Run unit tests
npm run test:unit
```

## **🔧 Key Files**

- **API Service**: `packages/web-app/src/services/api.ts`
- **Transaction Handler**: `backend/functions/transactions/index.js`
- **Test Page**: `packages/web-app/src/pages/TransactionTest.tsx`
- **Deploy Script**: `scripts/deploy-dev.js`

## **🐛 Troubleshooting**

### **Frontend Issues**
```bash
# Clear cache and restart
cd packages/web-app
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### **Backend Issues**
```bash
# Redeploy infrastructure
npm run deploy:dev

# Check logs in AWS CloudWatch
```

### **API Issues**
```bash
# Test health endpoint
curl https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/transactions/health

# Test with authentication
npm run test:transactions
```

## **📊 Current Status**

✅ **Working**: Transaction CRUD backend
✅ **Working**: Frontend test interface
✅ **Working**: Authentication system
✅ **Working**: Budget CRUD operations

⚠️ **Next**: Complete transaction UI integration
⚠️ **Next**: Add budget dashboard
⚠️ **Next**: Implement family accounts

## **🎯 Focus Areas**

1. **Core User Journey**: Create budget → Add transactions → View summary
2. **Error Handling**: Better user feedback for API errors
3. **Testing**: Critical path coverage only
4. **Performance**: Optimize for development speed

Keep it simple, focus on the essentials! 🎯
