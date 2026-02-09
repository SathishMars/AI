# Security Assessment: Insights Module

## ⚠️ CRITICAL SECURITY VULNERABILITIES IDENTIFIED

**Date**: February 2, 2026  
**Component**: Insights/Analytics Module  
**Severity**: **CRITICAL** 🔴

---

## Executive Summary

The Insights module has **multiple critical security vulnerabilities** that expose sensitive attendee data (PII) without authentication or authorization controls. This represents a **serious data breach risk** and potential **GDPR/privacy compliance violation**.

---

## 1. Authentication Bypass (CRITICAL)

### Location: `src/proxy.ts` lines 65-72

**Issue**: Insights routes completely bypass JWT authentication middleware.

```typescript
// Skip insights routes - they don't require authentication
if (
  pathname.startsWith('/insights') || 
  pathname.startsWith(`${env.basePath}/insights`)
) {
  logger.debugMiddleware('[Auth Middleware] Skipping insights route (no auth required)');
  return NextResponse.next();
}
```

**Impact**: 
- ✅ **Anyone** can access `/aime/insights/attendee/{eventId}` without logging in
- ✅ **No user verification** - anonymous access to sensitive data
- ✅ **No session validation** - tokens are not checked

**Risk Level**: 🔴 **CRITICAL**

---

## 2. API Endpoint Authentication Bypass (CRITICAL)

### Location: `src/proxy.ts` lines 74-82

**Issue**: Insights API routes bypass authentication.

```typescript
// Skip insights API routes - chat doesn't require workflow authentication
if (
  pathname.startsWith('/api/chat') ||
  pathname.startsWith(`${env.basePath}/api/chat`)
) {
  console.log('[Auth Middleware] Skipping insights API route (no auth required)');
  return NextResponse.next();
}
```

**Impact**:
- ✅ **Unauthenticated API access** to chat/GraphQL endpoints
- ✅ **Direct database queries** can be executed without authentication
- ✅ **SQL injection risk** (though mitigated by SQL guards)

**Risk Level**: 🔴 **CRITICAL**

---

## 3. No Authorization Checks (CRITICAL)

### Location: `src/app/api/graphql/schema.ts`

**Issue**: GraphQL resolvers have **zero authorization logic**.

**Current State**:
- ❌ No JWT token validation in resolvers
- ❌ No account/org access checks
- ❌ No user context validation
- ❌ No eventId ownership verification

**Impact**:
- ✅ **Any user** can query **any eventId's data**
- ✅ **Cross-account data access** - users can access other organizations' attendee data
- ✅ **No multi-tenancy isolation** - all data accessible to all users

**Example Attack Vector**:
```graphql
# Attacker can query ANY eventId without permission checks
query {
  arrivals(eventId: 9999) {
    rows {
      first_name
      last_name
      email
      phone
      mailing_address
    }
  }
}
```

**Risk Level**: 🔴 **CRITICAL**

---

## 4. PII Data Exposure (HIGH)

### Exposed Data Fields:
- ✅ **Names** (first_name, last_name, middle_name)
- ✅ **Email addresses**
- ✅ **Phone numbers** (phone, mobile)
- ✅ **Physical addresses** (mailing_address, city, state, postal_code, country)
- ✅ **Employee IDs** (employee_id, concur_login_id)
- ✅ **Emergency contacts**
- ✅ **Internal notes**

**Compliance Risk**:
- 🔴 **GDPR Violation** - Processing personal data without proper access controls
- 🔴 **CCPA Violation** - California privacy law requires access controls
- 🔴 **SOC 2 Compliance** - Fails access control requirements
- 🔴 **Data Breach Liability** - Legal exposure if data is accessed

**Risk Level**: 🔴 **CRITICAL**

---

## 5. Standalone GraphQL Server Exposure (HIGH)

### Location: `src/insights-server.ts`

**Issue**: GraphQL server runs on port 4000 and accepts direct connections.

**Current Configuration**:
```typescript
const port = parseInt(process.env.PORT || "4000");
httpServer.listen({ port, host: '0.0.0.0' }, resolve);
```

**Impact**:
- ✅ **Direct external access** if firewall rules allow
- ✅ **No authentication layer** between client and GraphQL server
- ✅ **Bypasses Next.js middleware** entirely
- ✅ **CORS configured** but no auth checks

**Risk Level**: 🟠 **HIGH**

---

## 6. No Rate Limiting (MEDIUM)

**Issue**: No protection against:
- ✅ **Data scraping** - attackers can download entire attendee databases
- ✅ **DoS attacks** - expensive SQL queries can be executed repeatedly
- ✅ **API abuse** - unlimited requests without throttling

**Risk Level**: 🟡 **MEDIUM**

---

## 7. SQL Injection Mitigation (POSITIVE)

**Good News**: The system has SQL injection protection:
- ✅ **Parameterized queries** - Uses `$1, $2` placeholders
- ✅ **SQL guards** - `ensureSafeSelect()` prevents dangerous SQL
- ✅ **PII detection** - `containsPII()` blocks queries exposing sensitive data
- ✅ **Query timeouts** - Prevents long-running queries

**However**: These protections are **useless** if attackers can access the endpoints without authentication.

---

## Recommended Security Fixes

### Priority 1: Immediate (Critical)

1. **Add Authentication to Insights Routes**
   ```typescript
   // In proxy.ts - REMOVE the bypass
   // Remove lines 65-72 and 74-82
   // Let insights routes go through handleUserAuth()
   ```

2. **Add Authorization to GraphQL Resolvers**
   ```typescript
   // In schema.ts resolvers
   async arrivals(_, args, context) {
     // Verify user has access to eventId
     await requireEventAccess(context.user, args.eventId);
     // ... rest of resolver
   }
   ```

3. **Add User Context to GraphQL**
   - Pass JWT claims to GraphQL resolvers
   - Validate eventId ownership
   - Enforce account/org boundaries

### Priority 2: High Priority

4. **Secure Standalone GraphQL Server**
   - Add authentication middleware
   - Restrict to localhost/internal network
   - Add API key or JWT validation

5. **Add Rate Limiting**
   - Implement per-user rate limits
   - Prevent bulk data extraction
   - Add request throttling

### Priority 3: Medium Priority

6. **Add Audit Logging**
   - Log all data access attempts
   - Track which users access which eventIds
   - Monitor for suspicious patterns

7. **Add Data Masking**
   - Mask PII in logs
   - Implement field-level access controls
   - Add data retention policies

---

## Compliance Impact

### GDPR (General Data Protection Regulation)
- ❌ **Article 32**: Security of processing - **FAILED**
- ❌ **Article 25**: Data protection by design - **FAILED**
- ❌ **Article 5(1)(f)**: Integrity and confidentiality - **FAILED**

### SOC 2 Type II
- ❌ **CC6.1**: Logical access controls - **FAILED**
- ❌ **CC6.2**: Authentication - **FAILED**
- ❌ **CC6.6**: Access removal - **FAILED**

### CCPA (California Consumer Privacy Act)
- ❌ **Section 1798.100**: Consumer rights - **FAILED**
- ❌ **Section 1798.150**: Security requirements - **FAILED**

---

## Attack Scenarios

### Scenario 1: Unauthorized Data Access
1. Attacker discovers `/aime/insights/attendee/5281` URL
2. Accesses page without authentication
3. Views all attendee PII (names, emails, addresses)
4. Exports data via browser or API calls

**Impact**: Complete data breach of attendee database

### Scenario 2: Cross-Account Data Access
1. User from Account A logs in
2. Discovers they can query any eventId
3. Queries eventIds from Account B, C, D
4. Accesses competitor/client data

**Impact**: Multi-tenant data isolation failure

### Scenario 3: Direct GraphQL Access
1. Attacker discovers GraphQL server on port 4000
2. Connects directly (bypasses Next.js)
3. Executes queries without authentication
4. Downloads entire attendee database

**Impact**: Complete system compromise

---

## Conclusion

The Insights module currently has **ZERO authentication or authorization controls**, making it a **critical security vulnerability**. This must be addressed immediately before:
- Production deployment
- Customer data exposure
- Compliance audits
- Security assessments

**Recommendation**: **DO NOT DEPLOY** to production until authentication and authorization are implemented.

---

## Next Steps

1. ✅ **Immediate**: Disable insights routes in production
2. ✅ **This Week**: Implement authentication middleware
3. ✅ **This Week**: Add authorization checks to GraphQL resolvers
4. ✅ **Next Sprint**: Add rate limiting and audit logging
5. ✅ **Next Sprint**: Security review and penetration testing

---

**Prepared by**: AI Security Assessment  
**Reviewed by**: [Your Name]  
**Date**: February 2, 2026
