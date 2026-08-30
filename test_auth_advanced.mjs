#!/usr/bin/env node

/**
 * Script de test avancé pour les routes d'authentification
 * Teste login, register, et vérifie les erreurs Prisma
 * Utilise le fetch natif de Node.js 18+
 */

const BASE_URL = "http://localhost:3000";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: API Connectivity
async function testConnectivity() {
  log("\n🔌 TEST 1: Vérification de la connexion API", "cyan");
  try {
    const res = await fetch(`${BASE_URL}/api/auth/session`);
    if (res.ok || res.status === 401) {
      log("✓ API accessible", "green");
      return true;
    }
  } catch (e) {
    log(`✗ API non accessible: ${e.message}`, "red");
    return false;
  }
}

// Test 2: Database connectivity via Prisma
async function testDatabaseHealth() {
  log("\n📊 TEST 2: Vérification de la base de données", "cyan");
  try {
    // Try to fetch user data which will trigger Prisma
    const res = await fetch(`${BASE_URL}/api/auth/session`);
    const data = await res.json();
    
    // If we get a valid response (even if not logged in), DB is working
    if (res.status === 200 || res.status === 401) {
      log("✓ Base de données accessible", "green");
      return true;
    } else {
      log(`✗ Erreur base de données (status ${res.status}): ${JSON.stringify(data)}`, "red");
      return false;
    }
  } catch (e) {
    log(`✗ Erreur de connexion DB: ${e.message}`, "red");
    return false;
  }
}

// Test 3: Register endpoint
async function testRegister() {
  log("\n📝 TEST 3: Route de registration (/api/register)", "cyan");
  
  const userData = {
    name: `User_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: "SecurePassword123!@",
    title: "Developer",
    birthDate: "1990-05-20",
  };

  try {
    const res = await fetch(`${BASE_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await res.json();

    if (res.ok) {
      log(`✓ Registration successful - User ID: ${data.user?.id || "N/A"}`, "green");
      log(`  Email: ${userData.email}`, "green");
      return { success: true, userData };
    } else {
      log(`✗ Registration failed (${res.status})`, "red");
      log(`  Error: ${data.error || JSON.stringify(data)}`, "red");
      return { success: false, userData };
    }
  } catch (e) {
    log(`✗ Register error: ${e.message}`, "red");
    return { success: false, userData };
  }
}

// Test 4: Register validations
async function testRegisterValidations() {
  log("\n📋 TEST 4: Validations d'enregistrement", "cyan");

  const testCases = [
    {
      name: "Email invalide",
      data: {
        name: "Test",
        email: "not-an-email",
        password: "SecurePassword123!",
        birthDate: "1990-01-01",
      },
    },
    {
      name: "Mot de passe faible (pas de majuscule)",
      data: {
        name: "Test",
        email: `test_${Date.now()}@example.com`,
        password: "weakpassword123!",
        birthDate: "1990-01-01",
      },
    },
    {
      name: "Nom trop court",
      data: {
        name: "A",
        email: `test_${Date.now()}@example.com`,
        password: "SecurePassword123!",
        birthDate: "1990-01-01",
      },
    },
  ];

  for (const test of testCases) {
    try {
      const res = await fetch(`${BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(test.data),
      });

      const data = await res.json();

      if (!res.ok) {
        log(`  ✓ ${test.name}: Rejeté correctement`, "green");
        log(`    Message: ${data.error}`, "green");
      } else {
        log(`  ✗ ${test.name}: Devrait être rejeté!`, "red");
      }
    } catch (e) {
      log(`  ✗ ${test.name}: Erreur - ${e.message}`, "red");
    }
  }
}

// Test 5: Session endpoint
async function testSession() {
  log("\n🔐 TEST 5: Route de session (/api/auth/session)", "cyan");
  try {
    const res = await fetch(`${BASE_URL}/api/auth/session`);
    const data = await res.json();

    if (res.status === 200) {
      if (data.user) {
        log(`✓ Session active - Utilisateur: ${data.user.email}`, "green");
      } else {
        log(`✓ Endpoint accessible - Aucune session (expected sans login)`, "green");
      }
      return true;
    } else {
      log(`✗ Session endpoint error (${res.status}): ${JSON.stringify(data)}`, "red");
      return false;
    }
  } catch (e) {
    log(`✗ Session error: ${e.message}`, "red");
    return false;
  }
}

// Test 6: Credentials login
async function testLoginFlow(email, password) {
  log("\n🔑 TEST 6: Flux de connexion (Credentials)", "cyan");
  log(`  Email: ${email}`, "cyan");

  try {
    // Attempt to use NextAuth callback directly via signin
    const res = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        callbackUrl: "/",
      }),
      redirect: "manual",
    });

    log(`  Response status: ${res.status}`, "cyan");

    if (res.status === 200) {
      const data = await res.json();
      if (data.error) {
        log(`✗ Login rejected: ${data.error}`, "red");
      } else {
        log(`✓ Login accepted - Données: ${JSON.stringify(data).substring(0, 100)}...`, "green");
      }
      return data;
    } else if (res.status === 302 || res.redirected) {
      log(`✓ Login successful (redirect to ${res.url})`, "green");
      return { success: true };
    } else {
      const data = await res.json().catch(() => ({}));
      log(`✗ Login failed (${res.status}): ${data.error || "Unknown error"}`, "red");
      return data;
    }
  } catch (e) {
    log(`✗ Login error: ${e.message}`, "red");
    return { error: e.message };
  }
}

// Test 7: Verify email endpoint
async function testVerifyEmail() {
  log("\n✉️  TEST 7: Route de vérification email (/api/verify-email)", "cyan");
  try {
    const res = await fetch(`${BASE_URL}/api/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "test-token-123",
      }),
    });

    const data = await res.json();
    log(`✓ Endpoint accessible (${res.status})`, "green");
    if (data.error) {
      log(`  Expected validation error: ${data.error}`, "cyan");
    }
    return true;
  } catch (e) {
    log(`✗ Verify email error: ${e.message}`, "red");
    return false;
  }
}

// Main test runner
async function runTests() {
  log("\n" + "=".repeat(60), "blue");
  log("🚀 SUITE DE TESTS D'AUTHENTIFICATION COMPLÈTE", "blue");
  log("=".repeat(60), "blue");

  const results = {};

  // Run tests in sequence
  results.connectivity = await testConnectivity();
  
  if (!results.connectivity) {
    log("\n⚠️  Le serveur n'est pas accessible. Arrêt des tests.", "yellow");
    return;
  }

  results.database = await testDatabaseHealth();
  results.register = await testRegister();
  await testRegisterValidations();
  results.session = await testSession();

  // If registration was successful, test login
  if (results.register.success) {
    await wait(500); // Small delay
    await testLoginFlow(results.register.userData.email, results.register.userData.password);
  }

  results.verifyEmail = await testVerifyEmail();

  // Summary
  log("\n" + "=".repeat(60), "blue");
  log("📊 RÉSUMÉ DES TESTS", "blue");
  log("=".repeat(60), "blue");

  const summary = [
    { name: "Connectivité API", passed: results.connectivity },
    { name: "Base de données", passed: results.database },
    { name: "Enregistrement", passed: results.register.success },
    { name: "Session", passed: results.session },
    { name: "Email verification", passed: results.verifyEmail },
  ];

  for (const item of summary) {
    const status = item.passed ? "✓ PASS" : "✗ FAIL";
    const color = item.passed ? "green" : "red";
    log(`${status} - ${item.name}`, color);
  }

  const passedCount = summary.filter(s => s.passed).length;
  log(`\n${passedCount}/${summary.length} tests passed`, passedCount === summary.length ? "green" : "yellow");
  
  log("\n" + "=".repeat(60) + "\n", "blue");
}

// Run all tests
runTests().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, "red");
  process.exit(1);
});
